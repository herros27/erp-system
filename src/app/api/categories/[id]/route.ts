import prisma from '@/lib/prisma'
import { errorResponse, successResponse, notFoundResponse } from '@/lib/api-response'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const body = await request.json()
  const existing = await prisma.category.findFirst({ where: { id, companyId } })
  if (!existing) return notFoundResponse('Kategori tidak ditemukan')
  const updated = await prisma.category.update({ where: { id }, data: { name: body.name ?? existing.name, description: body.description !== undefined ? body.description : existing.description } })
  return successResponse(updated, 'Kategori berhasil diperbarui')
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const existing = await prisma.category.findFirst({ where: { id, companyId } })
  if (!existing) return notFoundResponse('Kategori tidak ditemukan')
  await prisma.category.delete({ where: { id } })
  return successResponse(null, 'Kategori berhasil dihapus')
}
