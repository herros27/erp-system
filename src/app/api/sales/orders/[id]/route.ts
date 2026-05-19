import prisma from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  
  const { id } = await params
  
  let body: any = {}
  try {
    body = await request.json()
  } catch {
    // Fallback if body is empty or malformed
  }
  const { status, attachments } = body

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Find and check Sales Order
      const so = await tx.salesOrder.findFirst({
        where: { id, companyId }
      })

      if (!so) {
        throw new Error('Sales Order tidak ditemukan')
      }

      // If canceling Sales Order
      if (status === 'CANCELLED') {
        if (so.status === 'CANCELLED') {
          throw new Error('Sales Order sudah dibatalkan sebelumnya')
        }
        if (so.status === 'COMPLETED') {
          throw new Error('Sales Order yang sudah selesai tidak dapat dibatalkan')
        }

        const updatedSO = await tx.salesOrder.update({
          where: { id },
          data: { status: 'CANCELLED' }
        })

        await tx.invoice.updateMany({
          where: { salesOrderId: id, status: 'UNPAID' },
          data: { status: 'CANCELLED' }
        })

        return updatedSO
      }

      // If updating attachments (replacing old ones)
      if (attachments && Array.isArray(attachments)) {
        // Delete old attachments
        await tx.attachment.deleteMany({
          where: { entityType: 'SALES_ORDER', entityId: id, companyId }
        })

        // Insert new attachments
        if (attachments.length > 0) {
          const attachmentData = attachments.map((att: any) => ({
            companyId,
            entityType: 'SALES_ORDER',
            entityId: id,
            docType: att.docType || 'PO_CUSTOMER',
            fileUrl: att.fileUrl,
            fileName: att.fileName,
            uploadedBy: userId
          }))

          await tx.attachment.createMany({
            data: attachmentData
          })
        }

        return so
      }

      throw new Error('Aksi tidak dikenali')
    })

    if (userId) {
      const action = status === 'CANCELLED' ? 'cancel_so' : 'update_so_attachments'
      await createAuditLog({
        companyId,
        userId,
        module: 'penjualan',
        action,
        referenceId: id,
        newValues: status === 'CANCELLED' 
          ? { number: result.number, status: 'CANCELLED' } 
          : { number: result.number, attachmentsCount: attachments?.length }
      })
    }

    return successResponse(result, status === 'CANCELLED' ? 'Sales Order berhasil dibatalkan' : 'Lampiran PO berhasil diperbarui')
  } catch (error: any) {
    return errorResponse(error.message || 'Gagal memproses permintaan', 500)
  }
}
