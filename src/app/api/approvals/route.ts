import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse } from '@/lib/api-response'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const { page, limit, status } = getSearchParams(request)

  const where = {
    companyId,
    ...(status ? { status: status as never } : {}),
  }

  const [data, total] = await Promise.all([
    prisma.approval.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true } },
        purchaseRequest: {
          include: { 
            supplier: { select: { name: true } }, 
            items: true,
            purchaseOrders: { select: { id: true, number: true, status: true } }
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.approval.count({ where }),
  ])

  return paginatedResponse(data, total, page, limit)
}
