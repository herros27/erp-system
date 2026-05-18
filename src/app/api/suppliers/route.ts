import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const { page, limit, search } = getSearchParams(request)
  const where = { companyId, deletedAt: null, ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { code: { contains: search, mode: 'insensitive' as const } }] } : {}) }
  const [data, total] = await Promise.all([
    prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.supplier.count({ where }),
  ])
  return paginatedResponse(data, total, page, limit)
}

export async function POST(request: Request) {
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const body = await request.json()
  if (!body.code || !body.name) return errorResponse('Kode dan nama supplier wajib diisi')
  const existing = await prisma.supplier.findUnique({ where: { companyId_code: { companyId, code: body.code } } })
  if (existing) return errorResponse('Kode supplier sudah digunakan')
  const supplier = await prisma.supplier.create({ data: { companyId, code: body.code, name: body.name, address: body.address, email: body.email, phone: body.phone, taxId: body.taxId } })
  if (userId) await createAuditLog({ companyId, userId, module: 'supplier', action: 'create', referenceId: supplier.id, newValues: { code: body.code, name: body.name } })
  return successResponse(supplier, 'Supplier berhasil ditambahkan', 201)
}
