import prisma from '@/lib/prisma'
import { errorResponse, successResponse, notFoundResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId || !userId) return errorResponse('Perusahaan atau pengguna tidak valid', 400)

  const body = await request.json()
  const { status, notes } = body
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return errorResponse('Status harus APPROVED atau REJECTED')
  }

  const approval = await prisma.approval.findFirst({
    where: { id, companyId, status: 'PENDING' },
  })
  if (!approval) return notFoundResponse('Persetujuan tidak ditemukan atau sudah diproses')

  const updated = await prisma.$transaction(async (tx: any) => {
    const appr = await tx.approval.update({
      where: { id },
      data: { status, approverId: userId, notes },
    })

    if (approval.module === 'purchase_request') {
      await tx.purchaseRequest.update({
        where: { id: approval.referenceId },
        data: { status },
      })
    }

    return appr
  })

  const pr = await prisma.purchaseRequest.findUnique({ where: { id: approval.referenceId } })
  if (pr?.createdBy) {
    await prisma.notification.create({
      data: {
        companyId,
        userId: pr.createdBy,
        title: status === 'APPROVED' ? 'Permintaan Disetujui' : 'Permintaan Ditolak',
        message: `${pr.number} telah ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}`,
        type: status === 'APPROVED' ? 'success' : 'warning',
        link: '/persetujuan',
      },
    })
  }

  await createAuditLog({
    companyId,
    userId,
    module: 'persetujuan',
    action: status.toLowerCase(),
    referenceId: id,
    newValues: { status, notes },
  })

  return successResponse(updated, `Permintaan berhasil ${status === 'APPROVED' ? 'disetujui' : 'ditolak'}`)
}
