import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse } from '@/lib/api-response'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const { page, limit, search } = getSearchParams(request)
  const { searchParams } = new URL(request.url)
  const moduleFilter = searchParams.get('module')

  const where = {
    companyId,
    ...(moduleFilter ? { module: moduleFilter } : {}),
    ...(search
      ? {
          OR: [
            { action: { contains: search, mode: 'insensitive' as const } },
            { module: { contains: search, mode: 'insensitive' as const } },
            { user: { name: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {}),
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ])

  return paginatedResponse(data, total, page, limit)
}
