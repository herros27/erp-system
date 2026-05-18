import prisma from '@/lib/prisma'
import { errorResponse, successResponse, notFoundResponse } from '@/lib/api-response'
import { generateNumber } from '@/lib/utils'
import { createAuditLog } from '@/lib/audit'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const pr = await prisma.purchaseRequest.findFirst({
    where: { id, companyId },
    include: {
      supplier: true,
      items: true,
      approvals: { include: { requester: true, approver: true } },
      purchaseOrders: true,
    },
  })
  if (!pr) return notFoundResponse('Permintaan pembelian tidak ditemukan')
  return successResponse(pr)
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

  const body = await request.json()
  if (body.action !== 'convert_to_po') return errorResponse('Aksi tidak valid')

  const pr = await prisma.purchaseRequest.findFirst({
    where: { id, companyId, status: 'APPROVED' },
    include: { items: true },
  })
  if (!pr) return errorResponse('PR harus berstatus APPROVED')
  if (!pr.supplierId) return errorResponse('Supplier wajib diisi pada PR sebelum membuat PO')

  const existingPo = await prisma.purchaseOrder.findFirst({
    where: { purchaseRequestId: id, status: { not: 'CANCELLED' } },
  })
  if (existingPo) {
    return errorResponse(`Purchase Order (${existingPo.number}) sudah pernah dibuat untuk permintaan pembelian ini.`)
  }

  const products = await prisma.product.findMany({
    where: { companyId, deletedAt: null },
    select: { id: true, name: true, buyPrice: true },
  })

  const poItems: { productId: string; quantity: number; unitPrice: number; subtotal: number }[] = []
  for (const item of pr.items) {
    const product = products.find((p) => p.name.toLowerCase() === item.productName.toLowerCase())
    if (!product) return errorResponse(`Produk "${item.productName}" tidak ditemukan di master. Tambahkan produk terlebih dahulu.`)
    poItems.push({
      productId: product.id,
      quantity: item.quantity,
      unitPrice: item.unitPrice || product.buyPrice,
      subtotal: item.quantity * (item.unitPrice || product.buyPrice),
    })
  }

  const subtotal = poItems.reduce((s, i) => s + i.subtotal, 0)
  const tax = subtotal * 0.11
  const total = subtotal + tax
  const count = await prisma.purchaseOrder.count({ where: { companyId } })
  const number = generateNumber('PO', count + 1)

  const po = await prisma.purchaseOrder.create({
    data: {
      companyId,
      purchaseRequestId: pr.id,
      supplierId: pr.supplierId,
      number,
      orderDate: new Date(),
      notes: `Dari PR ${pr.number}. ${pr.notes || ''}`,
      subtotal,
      tax,
      total,
      createdBy: userId,
      items: { create: poItems },
    },
    include: { supplier: true, items: { include: { product: true } } },
  })

  if (userId) {
    await createAuditLog({
      companyId,
      userId,
      module: 'pembelian',
      action: 'pr_to_po',
      referenceId: po.id,
      newValues: { prNumber: pr.number, poNumber: number },
    })
  }

  return successResponse(po, 'PO berhasil dibuat dari permintaan pembelian', 201)
}
