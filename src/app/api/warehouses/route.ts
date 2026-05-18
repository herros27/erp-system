import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api-response'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const { page, limit, search } = getSearchParams(request)
  const where = { companyId, ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { code: { contains: search, mode: 'insensitive' as const } }] } : {}) }
  const [data, total] = await Promise.all([
    prisma.warehouse.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.warehouse.count({ where }),
  ])
  return paginatedResponse(data, total, page, limit)
}

export async function POST(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const body = await request.json()
  if (!body.code || !body.name) return errorResponse('Kode dan nama gudang wajib diisi')
  const existing = await prisma.warehouse.findUnique({ where: { companyId_code: { companyId, code: body.code } } })
  if (existing) return errorResponse('Kode gudang sudah digunakan')
  const warehouse = await prisma.warehouse.create({ data: { companyId, code: body.code, name: body.name, address: body.address } })
  return successResponse(warehouse, 'Gudang berhasil ditambahkan', 201)
}
