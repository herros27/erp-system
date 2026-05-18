import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse } from '@/lib/api-response'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

  const { page, limit, search } = getSearchParams(request)
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  const productId = searchParams.get('productId')

  const where = {
    companyId,
    ...(type ? { type: type as never } : {}),
    ...(productId ? { productId } : {}),
    ...(search ? { product: { name: { contains: search, mode: 'insensitive' as const } } } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { code: true, name: true } },
        fromWarehouse: { select: { name: true } },
        toWarehouse: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockMovement.count({ where }),
  ])

  return paginatedResponse(data, total, page, limit)
}
