import prisma from '@/lib/prisma'
import { errorResponse, successResponse, notFoundResponse } from '@/lib/api-response'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const body = await request.json()
  const existing = await prisma.unit.findFirst({ where: { id, companyId } })
  if (!existing) return notFoundResponse('Satuan tidak ditemukan')
  const updated = await prisma.unit.update({
    where: { id },
    data: { name: body.name ?? existing.name, symbol: body.symbol ?? existing.symbol },
  })
  return successResponse(updated, 'Satuan berhasil diperbarui')
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const existing = await prisma.unit.findFirst({ where: { id, companyId } })
  if (!existing) return notFoundResponse('Satuan tidak ditemukan')
  const inUse = await prisma.product.count({ where: { unitId: id, companyId } })
  if (inUse > 0) return errorResponse('Satuan masih digunakan oleh produk')
  await prisma.unit.delete({ where: { id } })
  return successResponse(null, 'Satuan berhasil dihapus')
}
