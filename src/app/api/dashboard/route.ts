import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const companyId = request.headers.get('x-company-id')
    if (!companyId) {
      return NextResponse.json({ success: false, message: 'Perusahaan tidak dipilih' }, { status: 400 })
    }

    const [
      totalProducts,
      totalSuppliers,
      totalCustomers,
      totalWarehouses,
      lowStockProducts,
      recentMovements,
      totalSalesOrders,
      totalPurchaseOrders,
      pendingApprovals,
      recentAuditLogs,
      salesOrders,
      purchaseOrders,
      unpaidInvoices,
    ] = await Promise.all([
      prisma.product.count({ where: { companyId, deletedAt: null } }),
      prisma.supplier.count({ where: { companyId, deletedAt: null } }),
      prisma.customer.count({ where: { companyId, deletedAt: null } }),
      prisma.warehouse.count({ where: { companyId } }),
      prisma.inventory.findMany({
        where: {
          companyId,
          product: { deletedAt: null },
        },
        include: { product: true, warehouse: true },
        orderBy: { quantity: 'asc' },
        take: 10,
      }),
      prisma.stockMovement.findMany({
        where: { companyId },
        include: { product: true, toWarehouse: true, fromWarehouse: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.salesOrder.count({ where: { companyId } }),
      prisma.purchaseOrder.count({ where: { companyId } }),
      prisma.approval.count({ where: { companyId, status: 'PENDING' } }),
      prisma.auditLog.findMany({
        where: { companyId },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.salesOrder.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { total: true, createdAt: true, status: true },
      }),
      prisma.purchaseOrder.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { total: true, createdAt: true, status: true },
      }),
      prisma.invoice.findMany({
        where: { companyId, status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] } },
        include: { customer: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
    ])

    const totalRevenue = salesOrders.reduce((sum, so) => sum + so.total, 0)
    const totalExpense = purchaseOrders.reduce((sum, po) => sum + po.total, 0)
    const totalReceivable = unpaidInvoices.reduce((sum, inv) => sum + (inv.total - inv.paidAmount), 0)

    const lowStock = lowStockProducts.filter(inv => inv.quantity <= inv.product.minStock)

    // Monthly data for charts
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const currentMonth = new Date().getMonth()
    const chartData = months.slice(0, currentMonth + 1).map((month, i) => {
      const monthSales = salesOrders.filter(so => new Date(so.createdAt).getMonth() === i)
      const monthPurchases = purchaseOrders.filter(po => new Date(po.createdAt).getMonth() === i)
      return {
        name: month,
        penjualan: monthSales.reduce((s, o) => s + o.total, 0),
        pembelian: monthPurchases.reduce((s, o) => s + o.total, 0),
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          totalSuppliers,
          totalCustomers,
          totalWarehouses,
          totalSalesOrders,
          totalPurchaseOrders,
          pendingApprovals,
          totalRevenue,
          totalExpense,
          totalReceivable,
        },
        lowStock,
        recentMovements: recentMovements.map(m => ({
          id: m.id,
          product: m.product.name,
          type: m.type,
          quantity: m.quantity,
          fromWarehouse: m.fromWarehouse?.name,
          toWarehouse: m.toWarehouse?.name,
          createdAt: m.createdAt,
        })),
        recentAuditLogs: recentAuditLogs.map(l => ({
          id: l.id,
          user: l.user.name,
          module: l.module,
          action: l.action,
          createdAt: l.createdAt,
        })),
        unpaidInvoices: unpaidInvoices.map(inv => ({
          id: inv.id,
          number: inv.number,
          customer: inv.customer.name,
          total: inv.total,
          paidAmount: inv.paidAmount,
          dueDate: inv.dueDate,
          status: inv.status,
        })),
        chartData,
      },
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ success: false, message: 'Gagal memuat dashboard' }, { status: 500 })
  }
}
