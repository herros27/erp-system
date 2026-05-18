import prisma from '@/lib/prisma'
import { errorResponse, successResponse, notFoundResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

  const po = await prisma.purchaseOrder.findFirst({
    where: { id, companyId },
    include: {
      supplier: true,
      items: { include: { product: true } },
    },
  })

  if (!po) return notFoundResponse('Purchase Order tidak ditemukan')
  return successResponse(po)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

  const existing = await prisma.purchaseOrder.findFirst({
    where: { id, companyId },
  })

  if (!existing) return notFoundResponse('Purchase Order tidak ditemukan')
  if (existing.status !== 'DRAFT') return errorResponse('Hanya PO dengan status DRAFT yang bisa diubah')

  const body = await request.json()
  const { status } = body

  // We mainly support updating status for simplicity in this implementation
  if (status) {
    const po = await prisma.purchaseOrder.update({
      where: { id },
      data: { status },
      include: { supplier: true },
    })

    if (userId) {
      await createAuditLog({
        companyId, userId, module: 'pembelian', action: 'update_status',
        referenceId: po.id, newValues: { status }, oldValues: { status: existing.status }
      })
    }
    return successResponse(po, 'Status PO berhasil diperbarui')
  }

  return errorResponse('Permintaan tidak valid')
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

  const existing = await prisma.purchaseOrder.findFirst({
    where: { id, companyId },
  })

  if (!existing) return notFoundResponse('Purchase Order tidak ditemukan')
  if (existing.status !== 'DRAFT') return errorResponse('Hanya PO dengan status DRAFT yang bisa dihapus')

  await prisma.purchaseOrder.delete({
    where: { id },
  })

  if (userId) {
    await createAuditLog({
      companyId, userId, module: 'pembelian', action: 'delete_po',
      referenceId: id, oldValues: { number: existing.number }
    })
  }

  return successResponse(null, 'Purchase Order berhasil dihapus')
}
