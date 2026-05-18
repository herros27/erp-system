import prisma from '@/lib/prisma'
import { errorResponse, successResponse, notFoundResponse } from '@/lib/api-response'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

  const body = await request.json()
  const uc = await prisma.userCompany.findFirst({
    where: { userId: id, companyId },
  })
  if (!uc) return notFoundResponse('Anggota tidak ditemukan')

  if (body.roleId) {
    await prisma.userCompany.update({
      where: { id: uc.id },
      data: { roleId: body.roleId },
    })
  }

  if (body.status !== undefined) {
    await prisma.user.update({
      where: { id },
      data: { status: body.status },
    })
  }

  return successResponse(null, 'Data pengguna berhasil diperbarui')
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  const currentUserId = request.headers.get('x-user-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  if (id === currentUserId) return errorResponse('Tidak dapat menghapus akun sendiri')

  const uc = await prisma.userCompany.findFirst({
    where: { userId: id, companyId },
  })
  if (!uc) return notFoundResponse('Anggota tidak ditemukan')

  await prisma.userCompany.delete({ where: { id: uc.id } })
  return successResponse(null, 'Pengguna dihapus dari perusahaan')
}
