import prisma from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'
import { generateNumber } from '@/lib/utils'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)
  const { searchParams } = new URL(request.url)
  const purchaseOrderId = searchParams.get('purchaseOrderId')
  const receipts = await prisma.goodsReceipt.findMany({
    where: { companyId, ...(purchaseOrderId ? { purchaseOrderId } : {}) },
    include: {
      purchaseOrder: { select: { number: true } },
      warehouse: { select: { name: true } },
      items: { include: { product: { select: { name: true, code: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return successResponse(receipts)
}

export async function POST(request: Request) {
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

  const body = await request.json()
  const { purchaseOrderId, warehouseId, receiptDate, notes, items } = body

  if (!purchaseOrderId || !warehouseId || !items?.length) {
    return errorResponse('PO, gudang, dan item wajib diisi')
  }

  const po = await prisma.purchaseOrder.findFirst({
    where: { id: purchaseOrderId, companyId },
    include: { items: true },
  })

  if (!po) return errorResponse('Purchase Order tidak ditemukan', 404)
  if (!['CONFIRMED', 'PARTIAL_RECEIVED'].includes(po.status)) {
    return errorResponse('Hanya PO yang sudah dikonfirmasi yang dapat diterima barangnya')
  }

  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const count = await tx.goodsReceipt.count({ where: { companyId } })
      const number = generateNumber('GR', count + 1)

      const receipt = await tx.goodsReceipt.create({
        data: {
          companyId,
          purchaseOrderId,
          warehouseId,
          number,
          receiptDate: receiptDate ? new Date(receiptDate) : new Date(),
          notes,
          createdBy: userId,
          items: {
            create: items.map((item: { productId: string; quantity: number }) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: { items: true },
      })

      for (const item of items) {
        const poItem = po.items.find((i) => i.productId === item.productId)
        if (!poItem) throw new Error(`Produk tidak ada di PO`)
        const remaining = poItem.quantity - poItem.receivedQty
        if (item.quantity > remaining) {
          throw new Error(`Kuantitas melebihi sisa PO (${remaining} tersisa)`)
        }

        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { receivedQty: { increment: item.quantity } },
        })

        await tx.inventory.upsert({
          where: {
            companyId_productId_warehouseId: { companyId, productId: item.productId, warehouseId },
          },
          create: { companyId, productId: item.productId, warehouseId, quantity: item.quantity },
          update: { quantity: { increment: item.quantity } },
        })

        await tx.stockMovement.create({
          data: {
            companyId,
            productId: item.productId,
            toWarehouseId: warehouseId,
            type: 'PURCHASE_RECEIPT',
            quantity: item.quantity,
            reference: number,
            notes: `Penerimaan dari ${po.number}`,
            createdBy: userId,
          },
        })
      }

      const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId } })
      const allReceived = updatedItems.every((i: any) => i.receivedQty >= i.quantity)
      const anyReceived = updatedItems.some((i: any) => i.receivedQty > 0)

      await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
          status: allReceived ? 'RECEIVED' : anyReceived ? 'PARTIAL_RECEIVED' : po.status,
        },
      })

      return receipt
    })

    if (userId) {
      await createAuditLog({
        companyId,
        userId,
        module: 'pembelian',
        action: 'goods_receipt',
        referenceId: result.id,
        newValues: { number: result.number, purchaseOrderId },
      })
    }

    return successResponse(result, 'Barang berhasil diterima ke gudang', 201)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Gagal menerima barang'
    return errorResponse(msg, 400)
  }
}
