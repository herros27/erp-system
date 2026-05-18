import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'
import { generateNumber } from '@/lib/utils'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const { page, limit, search, status } = getSearchParams(request)
  const where = {
    companyId,
    ...(status ? { status: status as never } : {}),
    ...(search ? { number: { contains: search, mode: 'insensitive' as const } } : {}),
  }
  const [data, total] = await Promise.all([
    prisma.purchaseRequest.findMany({
      where,
      include: {
        supplier: { select: { name: true } },
        items: true,
        approvals: { include: { requester: { select: { name: true } }, approver: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.purchaseRequest.count({ where }),
  ])
  return paginatedResponse(data, total, page, limit)
}

export async function POST(request: Request) {
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId || !userId) return errorResponse('Perusahaan atau pengguna tidak valid', 400)

  const body = await request.json()
  const { supplierId, requestDate, notes, items } = body
  if (!items?.length) return errorResponse('Minimal satu item wajib diisi')

  let totalAmount = 0
  const itemsData = items.map((item: { productName: string; quantity: number; unitPrice: number; notes?: string }) => {
    totalAmount += item.quantity * (item.unitPrice || 0)
    return {
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice || 0,
      notes: item.notes,
    }
  })

  const count = await prisma.purchaseRequest.count({ where: { companyId } })
  const number = generateNumber('PR', count + 1)

  const pr = await prisma.purchaseRequest.create({
    data: {
      companyId,
      number,
      supplierId: supplierId || null,
      requestDate: requestDate ? new Date(requestDate) : new Date(),
      notes,
      totalAmount,
      createdBy: userId,
      status: 'PENDING',
      items: { create: itemsData },
    },
    include: { items: true },
  })

  await prisma.approval.create({
    data: {
      companyId,
      module: 'purchase_request',
      referenceId: pr.id,
      requesterId: userId,
      status: 'PENDING',
    },
  })

  if (userId) {
    await createAuditLog({
      companyId,
      userId,
      module: 'pembelian',
      action: 'create_pr',
      referenceId: pr.id,
      newValues: { number, totalAmount },
    })
  }

  return successResponse(pr, 'Permintaan pembelian berhasil dibuat', 201)
}
