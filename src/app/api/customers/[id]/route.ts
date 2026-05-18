import prisma from '@/lib/prisma'
import { errorResponse, successResponse, notFoundResponse } from '@/lib/api-response'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const existing = await prisma.customer.findFirst({ where: { id, companyId, deletedAt: null } })
  if (!existing) return notFoundResponse('Pelanggan tidak ditemukan')
  const body = await request.json()

  // Validation checks for parentId
  if (body.parentId) {
    if (body.parentId === id) {
      return errorResponse('Pelanggan tidak bisa menjadi induk dari dirinya sendiri')
    }
    const parentCustomer = await prisma.customer.findFirst({ where: { id: body.parentId, companyId, deletedAt: null } })
    if (!parentCustomer) {
      return errorResponse('Perusahaan induk tidak ditemukan')
    }
    if (parentCustomer.parentId === id) {
      return errorResponse('Hubungan sirkular terdeteksi: Perusahaan induk terpilih adalah anak dari pelanggan ini')
    }
  }

  const updated = await prisma.customer.update({ 
    where: { id }, 
    data: { 
      name: body.name ?? existing.name, 
      address: body.address, 
      email: body.email, 
      phone: body.phone, 
      taxId: body.taxId,
      parentId: body.parentId !== undefined ? (body.parentId || null) : existing.parentId
    } 
  })
  return successResponse(updated, 'Pelanggan berhasil diperbarui')
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const existing = await prisma.customer.findFirst({ where: { id, companyId, deletedAt: null } })
  if (!existing) return notFoundResponse('Pelanggan tidak ditemukan')
  await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } })
  return successResponse(null, 'Pelanggan berhasil dihapus')
}
