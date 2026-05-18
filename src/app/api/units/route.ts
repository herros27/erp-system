import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const { page, limit, search } = getSearchParams(request)
  const where = {
    companyId,
    ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { symbol: { contains: search, mode: 'insensitive' as const } }] } : {}),
  }
  const [data, total] = await Promise.all([
    prisma.unit.findMany({ where, orderBy: { name: 'asc' }, skip: (page - 1) * limit, take: limit }),
    prisma.unit.count({ where }),
  ])
  return paginatedResponse(data, total, page, limit)
}

export async function POST(request: Request) {
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const body = await request.json()
  if (!body.name || !body.symbol) return errorResponse('Nama dan simbol wajib diisi')
  const unit = await prisma.unit.create({
    data: { companyId, name: body.name, symbol: body.symbol },
  })
  if (userId) await createAuditLog({ companyId, userId, module: 'satuan', action: 'create', referenceId: unit.id, newValues: { name: unit.name } })
  return successResponse(unit, 'Satuan berhasil ditambahkan', 201)
}
