import prisma from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-response'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  
  const body = await request.json()
  const { code, name, address } = body
  
  if (!code || !name) return errorResponse('Kode dan nama gudang wajib diisi')
    
  try {
    const existing = await prisma.warehouse.findFirst({
      where: { companyId, code, id: { not: id } }
    })
    
    if (existing) return errorResponse('Kode gudang sudah digunakan')
      
    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: { code, name, address }
    })
    
    return successResponse(warehouse, 'Gudang berhasil diperbarui')
  } catch (error) {
    return errorResponse('Gagal memperbarui gudang', 500)
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
    
  try {
    await prisma.warehouse.delete({
      where: { id, companyId }
    })
    return successResponse(null, 'Gudang berhasil dihapus')
  } catch (error) {
    return errorResponse('Gagal menghapus gudang, mungkin masih digunakan oleh data lain', 500)
  }
}
