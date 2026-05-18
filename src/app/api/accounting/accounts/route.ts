import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const { search } = getSearchParams(request)
  const where = {
    companyId,
    ...(search ? { OR: [{ code: { contains: search, mode: 'insensitive' as const } }, { name: { contains: search, mode: 'insensitive' as const } }] } : {}),
  }
  const accounts = await prisma.account.findMany({
    where,
    include: { parent: { select: { code: true, name: true } } },
    orderBy: { code: 'asc' },
  })
  return successResponse(accounts)
}

export async function POST(request: Request) {
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const body = await request.json()
  const { code, name, type, parentId, level } = body
  if (!code || !name || !type) return errorResponse('Kode, nama, dan tipe akun wajib diisi')
  const dup = await prisma.account.findUnique({ where: { companyId_code: { companyId, code } } })
  if (dup) return errorResponse('Kode akun sudah digunakan')
  const account = await prisma.account.create({
    data: {
      companyId,
      code,
      name,
      type,
      parentId: parentId || null,
      level: level || 1,
    },
  })
  if (userId) await createAuditLog({ companyId, userId, module: 'akuntansi', action: 'create_account', referenceId: account.id, newValues: { code, name } })
  return successResponse(account, 'Akun berhasil ditambahkan', 201)
}
