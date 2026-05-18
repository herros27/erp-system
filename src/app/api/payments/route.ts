import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'
import { generateNumber } from '@/lib/utils'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const { page, limit, search, sortOrder } = getSearchParams(request)
  const { searchParams } = new URL(request.url)
  const invoiceId = searchParams.get('invoiceId')

  const where = {
    companyId,
    ...(invoiceId ? { invoiceId } : {}),
    ...(search ? {
      OR: [
        { number: { contains: search, mode: 'insensitive' as const } },
        { invoice: { number: { contains: search, mode: 'insensitive' as const } } }
      ]
    } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        invoice: { include: { customer: true, salesOrder: { select: { number: true } } } }
      },
      orderBy: { createdAt: sortOrder },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.payment.count({ where }),
  ])
  return paginatedResponse(data, total, page, limit)
}

export async function POST(request: Request) {
  try {
    const companyId = request.headers.get('x-company-id')
    const userId = request.headers.get('x-user-id')
    if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

    const body = await request.json()
    const { invoiceId, paymentDate, amount, method, notes, attachments } = body

    if (!invoiceId || !amount || !method) {
      return errorResponse('Invoice, Nominal, dan Metode Pembayaran wajib diisi', 400)
    }

    if (amount <= 0) {
      return errorResponse('Nominal pembayaran harus lebih besar dari 0', 400)
    }

    if (!prisma.payment) {
      throw new Error('Database schema belum dimuat. Tolong restart server (npm run dev) Anda.')
    }

    const count = await prisma.payment.count({ where: { companyId } })
    const number = generateNumber('PAY', count + 1)



    const result = await prisma.$transaction(async (tx) => {
      // 1. Validasi Invoice
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId }
      })

      if (!invoice) throw new Error('Invoice tidak ditemukan')

      const currentPaid = invoice.paidAmount || 0
      const remaining = invoice.total - currentPaid

      if (amount > remaining) {
        throw new Error(`Nominal pembayaran melebihi sisa tagihan (Sisa: ${remaining})`)
      }

      // 2. Buat Payment
      const payment = await tx.payment.create({
        data: {
          companyId,
          invoiceId,
          number,
          amount,
          method,
          paymentDate: new Date(paymentDate),
          notes,
          createdBy: userId
        },
        include: { invoice: true }
      })

      // 3. Simpan Attachments jika ada
      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        const attachmentData = attachments.map((att: any) => ({
          companyId,
          entityType: 'PAYMENT',
          entityId: payment.id,
          docType: att.docType,
          fileUrl: att.fileUrl,
          fileName: att.fileName,
          uploadedBy: userId
        }))

        await tx.attachment.createMany({
          data: attachmentData
        })
      }

      // 4. Update Invoice paidAmount dan status
      const newPaidAmount = currentPaid + amount
      let newStatus = invoice.status

      if (newPaidAmount >= invoice.total) {
        newStatus = 'PAID'
      } else if (newPaidAmount > 0) {
        newStatus = 'PARTIAL'
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus
        }
      })

      return payment
    })

    if (userId) {
      await createAuditLog({
        companyId, userId, module: 'pembayaran', action: 'create_payment',
        referenceId: result.id, newValues: { number, amount, invoiceNumber: result.invoice.number }
      })
    }

    return successResponse(result, 'Pembayaran berhasil dicatat', 201)
  } catch (error: any) {
    console.error('Payment Creation Error:', error)
    return errorResponse(error.message || 'Terjadi kesalahan saat mencatat pembayaran', 500)
  }
}

export async function PUT(request: Request) {
  try {
    const companyId = request.headers.get('x-company-id')
    const userId = request.headers.get('x-user-id')
    if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

    const body = await request.json()
    const { id, paymentDate, amount, method, notes, attachments } = body

    if (!id || !amount || !method) {
      return errorResponse('ID, Nominal, dan Metode Pembayaran wajib diisi', 400)
    }

    if (amount <= 0) {
      return errorResponse('Nominal pembayaran harus lebih besar dari 0', 400)
    }

    if (!prisma.payment) {
      throw new Error('Database schema belum dimuat. Tolong restart server (npm run dev) Anda.')
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil payment lama
      const oldPayment = await tx.payment.findUnique({
        where: { id, companyId },
        include: { invoice: true }
      })

      if (!oldPayment) throw new Error('Pembayaran tidak ditemukan')

      const invoice = oldPayment.invoice
      const amountDifference = amount - oldPayment.amount

      const currentPaid = invoice.paidAmount || 0
      const remainingBeforeThisPayment = invoice.total - currentPaid + oldPayment.amount

      if (amount > remainingBeforeThisPayment) {
        throw new Error(`Nominal melebihi sisa tagihan (Sisa maksimal: ${remainingBeforeThisPayment})`)
      }

      // 2. Update Payment
      const payment = await tx.payment.update({
        where: { id },
        data: {
          amount,
          method,
          paymentDate: new Date(paymentDate),
          notes,
        },
        include: { invoice: true }
      })

      // 3. Update Attachments
      await tx.attachment.deleteMany({
        where: { entityType: 'PAYMENT', entityId: id, companyId }
      })

      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        const attachmentData = attachments.map((att: any) => ({
          companyId,
          entityType: 'PAYMENT',
          entityId: payment.id,
          docType: att.docType,
          fileUrl: att.fileUrl,
          fileName: att.fileName,
          uploadedBy: userId
        }))

        await tx.attachment.createMany({
          data: attachmentData
        })
      }

      // 4. Update Invoice paidAmount dan status jika ada selisih
      if (amountDifference !== 0) {
        const newPaidAmount = currentPaid + amountDifference
        let newStatus = invoice.status

        if (newPaidAmount >= invoice.total) {
          newStatus = 'PAID'
        } else if (newPaidAmount > 0) {
          newStatus = 'PARTIAL'
        } else {
          newStatus = 'UNPAID'
        }

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus
          }
        })
      }

      return payment
    })

    if (userId) {
      await createAuditLog({
        companyId, userId, module: 'pembayaran', action: 'update_payment',
        referenceId: result.id, newValues: { amount, method }
      })
    }

    return successResponse(result, 'Pembayaran berhasil diperbarui')
  } catch (error: any) {
    console.error('Payment Update Error:', error)
    return errorResponse(error.message || 'Terjadi kesalahan saat memperbarui pembayaran', 500)
  }
}
