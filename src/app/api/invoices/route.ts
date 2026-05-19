import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'
import { generateNumber } from '@/lib/utils'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  
  const { page, limit, search, sortOrder } = getSearchParams(request)
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  
  const where = {
    companyId,
    ...(status ? { status: status as any } : {}),
    ...(search ? { 
      OR: [
        { number: { contains: search, mode: 'insensitive' as const } }, 
        { customer: { name: { contains: search, mode: 'insensitive' as const } } },
        { salesOrder: { number: { contains: search, mode: 'insensitive' as const } } }
      ] 
    } : {}),
  }
  
  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { 
        customer: { select: { name: true } }, 
        salesOrder: { select: { number: true } },
        items: { include: { product: { select: { name: true } } } } 
      },
      orderBy: { createdAt: sortOrder },
      skip: (page - 1) * limit, 
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ])
  
  return paginatedResponse(data, total, page, limit)
}

export async function POST(request: Request) {
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  
  const body = await request.json()
  const { customerId, salesOrderId, invoiceDate, dueDate, notes, items, number: manualNumber } = body
  
  if (!customerId || !items?.length) return errorResponse('Pelanggan dan item wajib diisi')

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Prevent double billing for the same Sales Order
      if (salesOrderId) {
        const existingInvoice = await tx.invoice.findFirst({
          where: { 
            salesOrderId, 
            status: { not: 'CANCELLED' }, 
            companyId 
          }
        })
        if (existingInvoice) {
          throw new Error(`Sales Order ini sudah memiliki tagihan aktif (${existingInvoice.number}).`)
        }
      }

      let number = manualNumber
      if (manualNumber) {
        const existingInvoice = await tx.invoice.findFirst({
          where: { number: manualNumber, companyId }
        })
        if (existingInvoice) {
          throw new Error('Nomor Invoice sudah digunakan')
        }
      } else {
        const count = await tx.invoice.count({ where: { companyId } })
        number = generateNumber('INV', count + 1)
      }

      let subtotal = 0
      const itemsData = items.map((item: any) => {
        const itemSubtotal = item.quantity * item.unitPrice
        subtotal += itemSubtotal
        return { 
          productId: item.productId, 
          quantity: item.quantity, 
          unitPrice: item.unitPrice, 
          subtotal: itemSubtotal 
        }
      })
      
      const tax = subtotal * 0.11 // PPN 11%
      const total = subtotal + tax

      const inv = await tx.invoice.create({
        data: {
          companyId, 
          customerId, 
          salesOrderId, // Link to Sales Order
          number, 
          invoiceDate: new Date(invoiceDate),
          dueDate: new Date(dueDate),
          notes, 
          subtotal, 
          tax, 
          total, 
          createdBy: userId,
          status: 'UNPAID',
          items: { create: itemsData },
        },
        include: { customer: true, items: { include: { product: true } } },
      })

      // Optional: Update SO status to INVOICED if linked
      if (salesOrderId) {
        await tx.salesOrder.update({
          where: { id: salesOrderId },
          data: { status: 'INVOICED' }
        })
      }

      return inv
    })

    if (userId) {
      await createAuditLog({ 
        companyId, 
        userId, 
        module: 'invoice', 
        action: 'create_invoice', 
        referenceId: result.id, 
        newValues: { number: result.number, customer: result.customer.name, total: result.total } 
      })
    }

    return successResponse(result, 'Invoice berhasil dibuat', 201)
  } catch (error: any) {
    console.error('Invoice Creation Error:', error)
    return errorResponse(error.message || 'Terjadi kesalahan internal saat membuat Invoice.', 500)
  }
}
