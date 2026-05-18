import prisma from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-response'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'summary'
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const dateFrom = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1)
  const dateTo = to ? new Date(to) : new Date()
  dateTo.setHours(23, 59, 59, 999)

  if (type === 'summary') {
    const [sales, purchases, invoices, inventories, accounts] = await Promise.all([
      prisma.salesOrder.aggregate({
        where: { companyId, orderDate: { gte: dateFrom, lte: dateTo }, status: { not: 'CANCELLED' } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.purchaseOrder.aggregate({
        where: { companyId, orderDate: { gte: dateFrom, lte: dateTo }, status: { not: 'CANCELLED' } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.invoice.findMany({
        where: { companyId, invoiceDate: { gte: dateFrom, lte: dateTo } },
        select: { status: true, total: true, paidAmount: true },
      }),
      prisma.inventory.findMany({
        where: { companyId, product: { deletedAt: null } },
        include: { product: { select: { buyPrice: true, name: true, code: true } } },
      }),
      prisma.account.findMany({
        where: { companyId, isActive: true },
        select: { code: true, name: true, type: true, balance: true },
      }),
    ])

    const receivable = invoices
      .filter((i) => ['UNPAID', 'PARTIAL', 'OVERDUE'].includes(i.status))
      .reduce((s, i) => s + (i.total - i.paidAmount), 0)

    const inventoryValue = inventories.reduce(
      (s, inv) => s + inv.quantity * inv.product.buyPrice,
      0
    )

    return successResponse({
      period: { from: dateFrom, to: dateTo },
      sales: { total: sales._sum.total || 0, count: sales._count },
      purchases: { total: purchases._sum.total || 0, count: purchases._count },
      receivable,
      inventoryValue,
      profitEstimate: (sales._sum.total || 0) - (purchases._sum.total || 0),
      accounts,
    })
  }

  if (type === 'sales') {
    const orders = await prisma.salesOrder.findMany({
      where: { companyId, orderDate: { gte: dateFrom, lte: dateTo } },
      include: { customer: { select: { name: true } } },
      orderBy: { orderDate: 'desc' },
    })
    return successResponse(orders)
  }

  if (type === 'purchases') {
    const orders = await prisma.purchaseOrder.findMany({
      where: { companyId, orderDate: { gte: dateFrom, lte: dateTo } },
      include: { supplier: { select: { name: true } } },
      orderBy: { orderDate: 'desc' },
    })
    return successResponse(orders)
  }

  if (type === 'stock') {
    const data = await prisma.inventory.findMany({
      where: { companyId, product: { deletedAt: null } },
      include: {
        product: { select: { code: true, name: true, buyPrice: true, minStock: true } },
        warehouse: { select: { name: true } },
      },
    })
    return successResponse(data)
  }

  return errorResponse('Tipe laporan tidak dikenali')
}
