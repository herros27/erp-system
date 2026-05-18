'use client'

import { useEffect, useState } from 'react'
import { useCompanyStore } from '@/stores/company-store'
import { formatRupiah, formatDateTime } from '@/lib/utils'
import {
  Package, Users, Truck, Warehouse, TrendingUp,
  AlertTriangle, Clock, ArrowUpRight, ArrowDownRight,
  Receipt, ClipboardCheck, RefreshCw, ArrowLeftRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  summary: {
    totalProducts: number
    totalSuppliers: number
    totalCustomers: number
    totalWarehouses: number
    totalSalesOrders: number
    totalPurchaseOrders: number
    pendingApprovals: number
    totalRevenue: number
    totalExpense: number
    totalReceivable: number
  }
  lowStock: Array<{
    id: string
    quantity: number
    product: { name: string; minStock: number; code: string }
    warehouse: { name: string }
  }>
  recentMovements: Array<{
    id: string
    product: string
    type: string
    quantity: number
    fromWarehouse?: string
    toWarehouse?: string
    createdAt: string
  }>
  recentAuditLogs: Array<{
    id: string
    user: string
    module: string
    action: string
    createdAt: string
  }>
  unpaidInvoices: Array<{
    id: string
    number: string
    customer: string
    total: number
    paidAmount: number
    dueDate: string
    status: string
  }>
  chartData: Array<{ name: string; penjualan: number; pembelian: number }>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MOVEMENT_LABELS: Record<string, string> = {
  IN: 'Masuk',
  OUT: 'Keluar',
  TRANSFER: 'Transfer',
  ADJUSTMENT: 'Penyesuaian',
  PURCHASE_RECEIPT: 'Penerimaan',
  SALES_DELIVERY: 'Pengiriman',
  RETURN_IN: 'Retur Masuk',
  RETURN_OUT: 'Retur Keluar',
}

const MOVEMENT_COLORS: Record<string, { bg: string; color: string }> = {
  IN:              { bg: '#dcfce7', color: '#166534' },
  PURCHASE_RECEIPT:{ bg: '#dcfce7', color: '#166534' },
  RETURN_IN:       { bg: '#dcfce7', color: '#166534' },
  OUT:             { bg: '#fee2e2', color: '#991b1b' },
  SALES_DELIVERY:  { bg: '#fee2e2', color: '#991b1b' },
  RETURN_OUT:      { bg: '#fee2e2', color: '#991b1b' },
  TRANSFER:        { bg: '#dbeafe', color: '#1e40af' },
  ADJUSTMENT:      { bg: '#fef3c7', color: '#92400e' },
}

const isInbound = (type: string) =>
  ['IN', 'PURCHASE_RECEIPT', 'RETURN_IN'].includes(type)

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonLoader() {
  return (
    <div className="space-y-8 p-6 md:p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card p-6">
            <div className="skeleton h-10 w-10 rounded-xl mb-4" />
            <div className="skeleton h-4 w-24 mb-3" />
            <div className="skeleton h-8 w-32" />
          </div>
        ))}
      </div>
      <div className="card p-6">
        <div className="skeleton h-80 w-full" />
      </div>
    </div>
  )
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: string
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  sub?: string
  trend?: { value: string; positive: boolean }
  delay?: number
}

function MetricCard({
  label, value, icon, iconColor, iconBg, sub, trend, delay = 0,
}: MetricCardProps) {
  return (
    <div
      className="card p-6 animate-fade-in flex flex-col justify-between"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        {trend && (
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
            style={{
              background: trend.positive ? '#dcfce7' : '#fee2e2',
              color: trend.positive ? '#166534' : '#991b1b',
            }}
          >
            {trend.value}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
          {label}
        </p>
        <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {value}
        </p>
        {sub && (
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {sub}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Panel wrapper ────────────────────────────────────────────────────────────

function Panel({
  title,
  icon,
  iconColor,
  children,
}: {
  title: string
  icon: React.ReactNode
  iconColor?: string
  children: React.ReactNode
}) {
  return (
    <div className="card p-6 flex flex-col h-full">
      <div className="flex items-center gap-3 mb-6">
        <span style={{ color: iconColor ?? 'var(--accent)' }}>{icon}</span>
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
      </div>
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  )
}

// ─── Stock bar ────────────────────────────────────────────────────────────────

function StockBar({ quantity, minStock }: { quantity: number; minStock: number }) {
  const pct = minStock > 0 ? Math.min((quantity / minStock) * 100, 100) : 0
  const color = quantity <= 0 ? '#ef4444' : pct <= 30 ? '#f59e0b' : '#10b981'

  return (
    <div className="flex items-center gap-3 mt-2">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: 6, background: 'var(--border-color)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs tabular-nums font-medium" style={{ color: 'var(--text-muted)' }}>
        {quantity} / {minStock}
      </span>
    </div>
  )
}

// ─── Status pill ──────────────────────────────────────────────────────────────

type PillVariant = 'danger' | 'warning' | 'success'

function Pill({ label, variant }: { label: string; variant: PillVariant }) {
  const styles: Record<PillVariant, { bg: string; color: string }> = {
    danger:  { bg: '#fee2e2', color: '#991b1b' },
    warning: { bg: '#fef3c7', color: '#92400e' },
    success: { bg: '#dcfce7', color: '#166534' },
  }
  return (
    <span
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={styles[variant]}
    >
      {label}
    </span>
  )
}

function invoicePill(status: string) {
  if (status === 'OVERDUE') return <Pill label="Jatuh Tempo" variant="danger" />
  if (status === 'PARTIAL') return <Pill label="Sebagian" variant="warning" />
  return <Pill label="Belum Bayar" variant="warning" />
}

// ─── Divider row wrapper ──────────────────────────────────────────────────────

function ListRow({ children, isLast }: { children: React.ReactNode, isLast?: boolean }) {
  return (
    <div
      className={`py-4 ${isLast ? 'pb-1' : ''}`}
      style={isLast ? {} : { borderBottom: '1px solid var(--border-color)' }}
    >
      {children}
    </div>
  )
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl p-4 text-sm shadow-md"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        minWidth: 160,
      }}
    >
      <p className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
        {label}
      </p>
      <div className="space-y-2">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ background: entry.fill }}
              />
              {entry.name}
            </span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {formatRupiah(Number(entry.value) || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { activeCompany } = useCompanyStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeCompany) return
    fetchDashboard()
  }, [activeCompany])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard')
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) return <SkeletonLoader />

  const { summary } = data

  const metrics: MetricCardProps[] = [
    {
      label: 'Total Pendapatan',
      value: formatRupiah(summary.totalRevenue),
      icon: <TrendingUp size={20} />,
      iconColor: '#059669',
      iconBg: '#dcfce7',
      trend: { value: '+12%', positive: true },
      sub: 'vs. bulan lalu',
    },
    {
      label: 'Total Pengeluaran',
      value: formatRupiah(summary.totalExpense),
      icon: <ArrowDownRight size={20} />,
      iconColor: '#dc2626',
      iconBg: '#fee2e2',
      trend: { value: '-5%', positive: false },
      sub: 'vs. bulan lalu',
    },
    {
      label: 'Piutang',
      value: formatRupiah(summary.totalReceivable),
      icon: <Receipt size={20} />,
      iconColor: '#d97706',
      iconBg: '#fef3c7',
      sub: `${data.unpaidInvoices.length} invoice belum lunas`,
    },
    {
      label: 'Menunggu Persetujuan',
      value: String(summary.pendingApprovals),
      icon: <ClipboardCheck size={20} />,
      iconColor: '#7c3aed',
      iconBg: '#ede9fe',
      sub: 'permintaan pending',
    },
    {
      label: 'Total Produk',
      value: String(summary.totalProducts),
      icon: <Package size={20} />,
      iconColor: '#2563eb',
      iconBg: '#dbeafe',
      sub: 'aktif di katalog',
    },
    {
      label: 'Pelanggan',
      value: String(summary.totalCustomers),
      icon: <Users size={20} />,
      iconColor: '#0d9488',
      iconBg: '#ccfbf1',
    },
    {
      label: 'Supplier',
      value: String(summary.totalSuppliers),
      icon: <Truck size={20} />,
      iconColor: '#db2777',
      iconBg: '#fce7f3',
    },
    {
      label: 'Gudang',
      value: String(summary.totalWarehouses),
      icon: <Warehouse size={20} />,
      iconColor: '#0891b2',
      iconBg: '#e0f2fe',
      sub: 'lokasi aktif',
    },
  ]

  return (
    <div className="space-y-8 p-6 md:p-8">

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Dashboard
          </h1>
          <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            Ringkasan bisnis {activeCompany?.name}
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors hover:opacity-80"
          style={{
            color: 'var(--text-muted)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <RefreshCw size={16} />
          Perbarui
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((card, i) => (
          <MetricCard key={card.label} {...card} delay={i * 50} />
        ))}
      </div>

      {/* Chart + Low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Bar chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Grafik Penjualan vs Pembelian
            </h3>
            <div className="flex items-center gap-5">
              {[
                { color: '#6366f1', label: 'Penjualan' },
                { color: '#f59e0b', label: 'Pembelian' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.chartData} barGap={6} barCategoryGap="25%">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-color)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`}
                dx={-10}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--border-color)', opacity: 0.2 }} />
              <Bar dataKey="penjualan" name="Penjualan" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="pembelian" name="Pembelian" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Low stock */}
        <Panel
          title="Stok Menipis"
          icon={<AlertTriangle size={18} />}
          iconColor="var(--warning)"
        >
          {data.lowStock.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Semua stok aman
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {data.lowStock.slice(0, 6).map((item, index, arr) => (
                <ListRow key={item.id} isLast={index === arr.length - 1}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate mb-0.5" style={{ color: 'var(--text-primary)' }}>
                        {item.product.name}
                      </p>
                      <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                        {item.warehouse.name}
                      </p>
                      <StockBar
                        quantity={item.quantity}
                        minStock={item.product.minStock}
                      />
                    </div>
                    <div className="pt-1 shrink-0">
                      {item.quantity <= 0 ? (
                        <Pill label="Habis" variant="danger" />
                      ) : item.quantity <= item.product.minStock * 0.3 ? (
                        <Pill label="Kritis" variant="danger" />
                      ) : (
                        <Pill label="Rendah" variant="warning" />
                      )}
                    </div>
                  </div>
                </ListRow>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Recent movements + Unpaid invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Movements */}
        <Panel
          title="Mutasi Stok Terbaru"
          icon={<ArrowLeftRight size={18} />}
        >
          {data.recentMovements.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Belum ada mutasi stok
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {data.recentMovements.slice(0, 5).map((m, index, arr) => {
                const style = MOVEMENT_COLORS[m.type] ?? { bg: '#f3f4f6', color: '#374151' }
                return (
                  <ListRow key={m.id} isLast={index === arr.length - 1}>
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {isInbound(m.type)
                          ? <ArrowDownRight size={18} />
                          : m.type === 'TRANSFER'
                            ? <ArrowLeftRight size={18} />
                            : <ArrowUpRight size={18} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate mb-1" style={{ color: 'var(--text-primary)' }}>
                          {m.product}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {MOVEMENT_LABELS[m.type] ?? m.type} &bull; <span className="font-medium">{m.quantity} unit</span>
                        </p>
                      </div>
                      <div
                        className="flex items-center gap-1.5 text-xs font-medium shrink-0"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <Clock size={12} />
                        {formatDateTime(m.createdAt)}
                      </div>
                    </div>
                  </ListRow>
                )
              })}
            </div>
          )}
        </Panel>

        {/* Invoices */}
        <Panel
          title="Piutang Belum Lunas"
          icon={<Receipt size={18} />}
          iconColor="var(--warning)"
        >
          {data.unpaidInvoices.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Tidak ada piutang
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {data.unpaidInvoices.map((inv, index, arr) => {
                const initials = inv.customer
                  .split(' ')
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()

                return (
                  <ListRow key={inv.id} isLast={index === arr.length - 1}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                          style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                        >
                          {initials}
                        </div>
                        <div>
                          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                            {inv.number}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {inv.customer}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                          {formatRupiah(inv.total - inv.paidAmount)}
                        </p>
                        {invoicePill(inv.status)}
                      </div>
                    </div>
                  </ListRow>
                )
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}