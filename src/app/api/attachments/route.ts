import prisma from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-response'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  
  const { searchParams } = new URL(request.url)
  const entityType = searchParams.get('entityType')
  const entityId = searchParams.get('entityId')
  const invoiceIdForPayments = searchParams.get('invoiceIdForPayments')
  
  try {
    let attachments: any[] = []

    if (invoiceIdForPayments) {
      const payments = await prisma.payment.findMany({
        where: { companyId, invoiceId: invoiceIdForPayments },
        select: { id: true }
      })
      const paymentIds = payments.map(p => p.id)

      if (paymentIds.length > 0) {
        const allAtt = await prisma.attachment.findMany({
          where: { companyId, entityType: 'PAYMENT', entityId: { in: paymentIds } },
          orderBy: { createdAt: 'desc' }
        })
        
        // Deduplicate by docType, keeping the newest one
        const unique = []
        const seen = new Set()
        for (const att of allAtt) {
          if (!seen.has(att.docType)) {
            seen.add(att.docType)
            unique.push(att)
          }
        }
        attachments = unique
      }
    } else if (entityType && entityId) {
      attachments = await prisma.attachment.findMany({
        where: { companyId, entityType, entityId },
        orderBy: { createdAt: 'asc' }
      })
    } else {
      return errorResponse('Parameter tidak valid', 400)
    }
    
    return successResponse(attachments)
  } catch (error: any) {
    return errorResponse('Gagal mengambil lampiran', 500)
  }
}
