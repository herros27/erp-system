import prisma from '@/lib/prisma'
import { errorResponse, successResponse, notFoundResponse } from '@/lib/api-response'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const supplier = await prisma.supplier.findFirst({ where: { id, companyId, deletedAt: null } })
  if (!supplier) return notFoundResponse('Supplier tidak ditemukan')
  return successResponse(supplier)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const existing = await prisma.supplier.findFirst({ where: { id, companyId, deletedAt: null } })
  if (!existing) return notFoundResponse('Supplier tidak ditemukan')
  const body = await request.json()
  const updated = await prisma.supplier.update({ where: { id }, data: { name: body.name ?? existing.name, address: body.address, email: body.email, phone: body.phone, taxId: body.taxId } })
  return successResponse(updated, 'Supplier berhasil diperbarui')
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const existing = await prisma.supplier.findFirst({ where: { id, companyId, deletedAt: null } })
  if (!existing) return notFoundResponse('Supplier tidak ditemukan')
  await prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } })
  return successResponse(null, 'Supplier berhasil dihapus')
}
