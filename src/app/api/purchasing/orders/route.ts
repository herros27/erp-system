import prisma from '@/lib/prisma'
import { getSearchParams, paginatedResponse, errorResponse, successResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'
import { generateNumber } from '@/lib/utils'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const { page, limit, search, sortOrder } = getSearchParams(request)
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const where = {
    companyId,
    ...(status ? { status: status as never } : {}),
    ...(search ? { OR: [{ number: { contains: search, mode: 'insensitive' as const } }, { supplier: { name: { contains: search, mode: 'insensitive' as const } } }] } : {}),
  }
  const [data, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: { supplier: { select: { name: true } }, items: { include: { product: { select: { name: true } } } } },
      orderBy: { createdAt: sortOrder },
      skip: (page - 1) * limit, take: limit,
    }),
    prisma.purchaseOrder.count({ where }),
  ])
  return paginatedResponse(data, total, page, limit)
}

export async function POST(request: Request) {
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const body = await request.json()
  const { supplierId, orderDate, expectedDate, notes, items, number: manualNumber } = body
  if (!supplierId || !items?.length) return errorResponse('Supplier dan item wajib diisi')

  let number = manualNumber
  if (manualNumber) {
    const existing = await prisma.purchaseOrder.findFirst({
      where: { number: manualNumber, companyId }
    })
    if (existing) {
      return errorResponse('Nomor Purchase Order sudah digunakan')
    }
  } else {
    const count = await prisma.purchaseOrder.count({ where: { companyId } })
    number = generateNumber('PO', count + 1)
  }

  let subtotal = 0
  const itemsData = items.map((item: { productId: string; quantity: number; unitPrice: number }) => {
    const itemSubtotal = item.quantity * item.unitPrice
    subtotal += itemSubtotal
    return { productId: item.productId, quantity: item.quantity, unitPrice: item.unitPrice, subtotal: itemSubtotal }
  })
  const tax = subtotal * 0.11 // PPN 11%
  const total = subtotal + tax

  const po = await prisma.purchaseOrder.create({
    data: {
      companyId, supplierId, number, orderDate: new Date(orderDate), expectedDate: expectedDate ? new Date(expectedDate) : null,
      notes, subtotal, tax, total, createdBy: userId, items: { create: itemsData },
    },
    include: { supplier: true, items: { include: { product: true } } },
  })

  if (userId) await createAuditLog({ companyId, userId, module: 'pembelian', action: 'create_po', referenceId: po.id, newValues: { number, supplier: po.supplier.name, total } })
  return successResponse(po, 'Purchase Order berhasil dibuat', 201)
}
