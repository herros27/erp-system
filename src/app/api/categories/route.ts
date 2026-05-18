import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api-response'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const { page, limit, search } = getSearchParams(request)
  const where = { companyId, ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}) }
  const [data, total] = await Promise.all([
    prisma.category.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.category.count({ where }),
  ])
  return paginatedResponse(data, total, page, limit)
}

export async function POST(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const body = await request.json()
  if (!body.name) return errorResponse('Nama kategori wajib diisi')
  const category = await prisma.category.create({ data: { companyId, name: body.name, description: body.description } })
  return successResponse(category, 'Kategori berhasil ditambahkan', 201)
}
