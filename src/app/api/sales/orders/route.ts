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
    ...(status ? { status: status as never } : {}),
    ...(search ? { 
      OR: [
        { number: { contains: search, mode: 'insensitive' as const } }, 
        { customer: { name: { contains: search, mode: 'insensitive' as const } } }
      ] 
    } : {}),
  }
  
  const [data, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      include: { customer: { select: { name: true } }, items: { include: { product: { select: { name: true } } } } },
      orderBy: { createdAt: sortOrder },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.salesOrder.count({ where }),
  ])

  return paginatedResponse(data, total, page, limit)
}

export async function POST(request: Request) {
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const body = await request.json()
  const { customerId, orderDate, notes, items, attachments, number: manualNumber } = body
  if (!customerId || !items?.length) return errorResponse('Pelanggan dan item wajib diisi')

  let number = manualNumber
  if (manualNumber) {
    const existing = await prisma.salesOrder.findFirst({
      where: { number: manualNumber, companyId }
    })
    if (existing) {
      return errorResponse('Nomor Sales Order sudah digunakan')
    }
  } else {
    const count = await prisma.salesOrder.count({ where: { companyId } })
    number = generateNumber('SO', count + 1)
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let subtotal = 0
      const itemsData = []

      for (const item of items) {
        const itemSubtotal = item.quantity * item.unitPrice
        subtotal += itemSubtotal

        itemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: itemSubtotal,
          fulfilledQty: 0,
          indentQty: item.quantity
        })
      }
      
      const tax = subtotal * 0.11
      const total = subtotal + tax

      const so = await tx.salesOrder.create({
        data: {
          companyId, customerId, number, orderDate: new Date(orderDate),
          notes, subtotal, tax, total, createdBy: userId,
          status: 'CONFIRMED',
          items: { create: itemsData },
        },
        include: { customer: true, items: { include: { product: true } } },
      })

      // --- AUTO GENERATE INVOICE ---
      const invCount = await tx.invoice.count({ where: { companyId } })
      const invNumber = generateNumber('INV', invCount + 1)
      
      const invDate = new Date(orderDate)
      const dueDate = new Date(invDate)
      dueDate.setDate(dueDate.getDate() + 7) // Default 7 days due date

      const invItemsData = itemsData.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal
      }))

      await tx.invoice.create({
        data: {
          companyId, 
          customerId, 
          salesOrderId: so.id,
          number: invNumber, 
          invoiceDate: invDate, 
          dueDate: dueDate,
          notes: `Dibuat otomatis dari pesanan ${number}`,
          subtotal, 
          tax, 
          total, 
          createdBy: userId,
          status: 'UNPAID',
          items: { create: invItemsData }
        }
      })
      // ------------------------------

      // --- SAVE ATTACHMENTS ---
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        const attachmentData = attachments.map((att: any) => ({
          companyId,
          entityType: 'SALES_ORDER',
          entityId: so.id,
          docType: att.docType || 'PO_CUSTOMER',
          fileUrl: att.fileUrl,
          fileName: att.fileName,
          uploadedBy: userId
        }))

        await tx.attachment.createMany({
          data: attachmentData
        })
      }
      // ------------------------

      if (userId) {
        // we can't easily call createAuditLog inside tx if it's not using tx, 
        // but createAuditLog uses standard prisma client. It's fine for audit logs to be outside tx or just use tx.
        // Actually createAuditLog imports prisma, so it will be outside this tx.
      }

      return so
    })

    if (userId) {
      await createAuditLog({ 
        companyId, userId, module: 'penjualan', action: 'create_so', 
        referenceId: result.id, newValues: { number, customer: result.customer.name, total: result.total, status: result.status } 
      })
    }

    return successResponse(result, 'Sales Order berhasil dibuat', 201)
  } catch (error: any) {
    console.error('SO Creation Error:', error)
    
    // Tampilkan pesan yang lebih ramah jika terjadi error Prisma
    let message = 'Terjadi kesalahan internal server saat membuat SO.'
    if (error.message?.includes('Invalid value for argument')) {
      message = 'Sistem mendeteksi adanya pembaruan struktur database yang belum dimuat. Tolong restart server (npm run dev) Anda.'
    } else if (error.message) {
      // Hanya ambil baris pertama dari pesan error jika bukan error Prisma yang panjang
      message = error.message.split('\n')[0]
    }

    return errorResponse(message, 500)
  }
}

