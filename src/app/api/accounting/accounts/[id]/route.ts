import prisma from '@/lib/prisma'
import { errorResponse, successResponse, notFoundResponse } from '@/lib/api-response'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const body = await request.json()
  const existing = await prisma.account.findFirst({ where: { id, companyId } })
  if (!existing) return notFoundResponse('Akun tidak ditemukan')
  const updated = await prisma.account.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
    },
  })
  return successResponse(updated, 'Akun berhasil diperbarui')
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const existing = await prisma.account.findFirst({ where: { id, companyId } })
  if (!existing) return notFoundResponse('Akun tidak ditemukan')
  const hasEntries = await prisma.journalEntry.count({ where: { accountId: id } })
  if (hasEntries > 0) return errorResponse('Akun tidak dapat dihapus karena sudah memiliki jurnal')
  const hasChildren = await prisma.account.count({ where: { parentId: id } })
  if (hasChildren > 0) return errorResponse('Hapus sub-akun terlebih dahulu')
  await prisma.account.delete({ where: { id } })
  return successResponse(null, 'Akun berhasil dihapus')
}
