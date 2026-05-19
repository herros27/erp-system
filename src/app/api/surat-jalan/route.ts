import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'
import { generateNumber } from '@/lib/utils'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const { page, limit, search, sortOrder } = getSearchParams(request)
  const { searchParams } = new URL(request.url)
  const salesOrderId = searchParams.get('salesOrderId')
  
  const where = {
    companyId,
    ...(salesOrderId ? { salesOrderId } : {}),
    ...(search ? { 
      OR: [
        { number: { contains: search, mode: 'insensitive' as const } }, 
        { salesOrder: { number: { contains: search, mode: 'insensitive' as const } } }
      ] 
    } : {}),
  }
  
  const [data, total] = await Promise.all([
    prisma.deliveryOrder.findMany({
      where,
      include: { 
        salesOrder: { include: { customer: true } }, 
        items: { include: { product: true } } 
      },
      orderBy: { createdAt: sortOrder },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.deliveryOrder.count({ where }),
  ])
  return paginatedResponse(data, total, page, limit)
}

export async function POST(request: Request) {
  try {
    const companyId = request.headers.get('x-company-id')
    const userId = request.headers.get('x-user-id')
    if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
    
    const body = await request.json()
    const { salesOrderId, deliveryDate, driverName, licensePlate, notes, items, number: manualNumber } = body
    
    if (!salesOrderId || !items?.length) {
      return errorResponse('Sales Order dan item wajib diisi')
    }

    // Filter items with quantity > 0
    const validItems = items.filter((item: any) => item.quantity > 0)
    if (validItems.length === 0) {
      return errorResponse('Tidak ada kuantitas barang yang dikirim')
    }

    if (!prisma.deliveryOrder) {
      throw new Error('Database schema belum dimuat. Tolong restart server (npm run dev) Anda.')
    }

    let number = manualNumber
    if (manualNumber) {
      const existing = await prisma.deliveryOrder.findFirst({
        where: { number: manualNumber, companyId }
      })
      if (existing) {
        return errorResponse('Nomor Surat Jalan sudah digunakan')
      }
    } else {
      const count = await prisma.deliveryOrder.count({ where: { companyId } })
      number = generateNumber('SJ', count + 1)
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil SO untuk validasi
      const so = await tx.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: { items: true }
      })

      if (!so) throw new Error('Sales Order tidak ditemukan')

      const itemsData = []

      for (const item of validItems) {
        // Cek apakah item ini ada di SO
        const soItem = so.items.find((i: any) => i.productId === item.productId)
        if (!soItem) throw new Error(`Produk dengan ID ${item.productId} tidak ada di Sales Order`)

        // Pastikan kuantitas tidak melebihi sisa yang belum dikirim
        const remainingToDeliver = soItem.quantity - soItem.fulfilledQty
        if (item.quantity > remainingToDeliver) {
          throw new Error(`Kuantitas pengiriman melebihi sisa pesanan (Sisa: ${remainingToDeliver})`)
        }

        // 2. Pemotongan Inventori Fisik
        const inventories = await tx.inventory.findMany({
          where: { companyId, productId: item.productId },
          orderBy: { quantity: 'desc' }
        })

        let remainingQtyNeeded = item.quantity
        let deductedQty = 0

        for (const inv of inventories) {
          if (remainingQtyNeeded <= 0) break
          if (inv.quantity > 0) {
            const deduct = Math.min(inv.quantity, remainingQtyNeeded)
            
            await tx.inventory.update({
              where: { id: inv.id },
              data: { quantity: { decrement: deduct } }
            })

            await tx.stockMovement.create({
              data: {
                companyId,
                productId: item.productId,
                fromWarehouseId: inv.warehouseId,
                type: 'SALES_DELIVERY',
                quantity: deduct,
                reference: number,
                notes: `Deducted for SJ ${number} (SO: ${so.number})`,
                createdBy: userId
              }
            })

            deductedQty += deduct
            remainingQtyNeeded -= deduct
          }
        }

        // Jika stok fisik gudang tidak cukup dari total yang di-request user
        if (remainingQtyNeeded > 0) {
          throw new Error(`Stok fisik di gudang tidak mencukupi untuk dikirim sejumlah ${item.quantity}. (Kekurangan: ${remainingQtyNeeded})`)
        }

        // 3. Update fulfilledQty di SO
        await tx.salesOrderItem.update({
          where: { id: soItem.id },
          data: {
            fulfilledQty: { increment: item.quantity },
            indentQty: { decrement: Math.min(soItem.indentQty, item.quantity) } // indentQty bisa saja sisa
          }
        })

        itemsData.push({
          productId: item.productId,
          quantity: item.quantity
        })
      }

      // 4. Buat DeliveryOrder
      const sj = await tx.deliveryOrder.create({
        data: {
          companyId,
          salesOrderId,
          number,
          deliveryDate: new Date(deliveryDate),
          driverName,
          licensePlate,
          notes,
          createdBy: userId,
          items: { create: itemsData }
        },
        include: { salesOrder: { include: { customer: true } }, items: { include: { product: true } } }
      })

      // 5. Update Status SO jika sudah terpenuhi semua
      const updatedSOItems = await tx.salesOrderItem.findMany({ where: { salesOrderId } })
      const isFullyDelivered = updatedSOItems.every((i: any) => i.fulfilledQty >= i.quantity)
      
      if (isFullyDelivered) {
        await tx.salesOrder.update({
          where: { id: salesOrderId },
          data: { status: 'COMPLETED' }
        })
      } else {
        await tx.salesOrder.update({
          where: { id: salesOrderId },
          data: { status: 'CONFIRMED' } // Atau partial, tapi CONFIRMED tetap fine
        })
      }

      return sj
    })

    if (userId) {
      await createAuditLog({ 
        companyId, userId, module: 'surat-jalan', action: 'create_sj', 
        referenceId: result.id, newValues: { number, soNumber: result.salesOrder.number } 
      })
    }

    return successResponse(result, 'Surat Jalan berhasil dibuat', 201)
  } catch (error: any) {
    console.error('SJ Creation Error:', error)
    return errorResponse(error.message || 'Terjadi kesalahan saat membuat Surat Jalan', 500)
  }
}
