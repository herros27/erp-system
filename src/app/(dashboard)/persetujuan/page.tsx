'use client'

import { useState, useEffect } from 'react'
import { useCompanyStore } from '@/stores/company-store'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Plus, CheckCircle2, XCircle, ClipboardCheck, FileText } from 'lucide-react'
import { toast } from 'sonner'

export default function PersetujuanPage() {
  const { activeCompany } = useCompanyStore()
  const [tab, setTab] = useState<'pending' | 'all' | 'create'>('pending')
  const [approvals, setApprovals] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [prForm, setPrForm] = useState({ supplierId: '', notes: '', requestDate: new Date().toISOString().split('T')[0] })
  const [prItems, setPrItems] = useState([{ productName: '', quantity: 1, unitPrice: 0 }])

  useEffect(() => {
    if (!activeCompany) return
    if (tab !== 'create') fetchApprovals()
    else {
      fetchSuppliers()
      fetchProducts()
    }
  }, [activeCompany, tab])

  const fetchApprovals = async () => {
    setLoading(true)
    try {
      const url = new URL('/api/approvals', window.location.origin)
      if (tab === 'pending') url.searchParams.set('status', 'PENDING')
      url.searchParams.set('limit', '50')
      const res = await fetch(url.toString())
      const json = await res.json()
      if (json.success) setApprovals(json.data)
    } catch {
      toast.error('Gagal memuat persetujuan')
    } finally {
      setLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    const res = await fetch('/api/suppliers?limit=100')
    const json = await res.json()
    if (json.success) setSuppliers(json.data)
  }

  const fetchProducts = async () => {
    const res = await fetch('/api/products?limit=200')
    const json = await res.json()
    if (json.success) setProducts(json.data)
  }

  const handleApprove = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    const notes = status === 'REJECTED' ? prompt('Alasan penolakan (opsional):') || '' : ''
    try {
      const res = await fetch(`/api/approvals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        fetchApprovals()
      } else toast.error(json.message)
    } catch {
      toast.error('Gagal memproses')
    }
  }

  const handleConvertToPO = async (prId: string) => {
    if (!confirm('Buat Purchase Order dari permintaan ini?')) return
    try {
      const res = await fetch(`/api/purchase-requests/${prId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'convert_to_po' }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        fetchApprovals()
      } else toast.error(json.message)
    } catch {
      toast.error('Gagal membuat PO')
    }
  }

  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/purchase-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prForm, items: prItems }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setTab('pending')
        setPrItems([{ productName: '', quantity: 1, unitPrice: 0 }])
      } else toast.error(json.message)
    } catch {
      toast.error('Gagal membuat permintaan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white flex items-center gap-3">
            <ClipboardCheck size={28} className="text-zinc-900 dark:text-zinc-100 shrink-0" />
            Persetujuan Transaksi
          </h1>
          <p className="text-sm mt-1 text-zinc-500 dark:text-zinc-400 font-medium">
            Kelola persetujuan permintaan pembelian barang (Purchase Requests) dan penerbitan Purchase Order
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => setTab('create')}
        >
          <Plus size={16} />
          <span>Buat Permintaan</span>
        </button>
      </div>

      {/* CONTROLS SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm">
        
        {/* VIEW TOGGLE TAB BAR */}
        <div className="flex gap-2 flex-wrap">
          {([
            { id: 'pending', label: 'Menunggu Persetujuan' },
            { id: 'all', label: 'Semua Riwayat' },
            { id: 'create', label: 'Buat Baru' }
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`btn btn-sm ${
                tab === t.id
                  ? 'btn-primary'
                  : 'btn-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Info text or status indicator on the right */}
        <div className="text-[10px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest select-none">
          {tab === 'pending' ? 'Menunggu Tindakan Anda' : tab === 'all' ? 'Arsip Dokumen Sistem' : 'Isi Form Permintaan'}
        </div>

      </div>

      {/* VIEW PANEL */}
      {tab === 'create' ? (
        <form onSubmit={handleCreatePR} className="card space-y-6 max-w-3xl">
          <h2 className="font-extrabold text-lg text-zinc-950 dark:text-zinc-50 tracking-tight border-b border-zinc-100 dark:border-zinc-800 pb-4">
            Permintaan Pembelian Baru (Draft PR)
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-zinc-500 dark:text-zinc-400">Supplier Tujuan</label>
              <select 
                className="input select" 
                value={prForm.supplierId} 
                onChange={(e) => setPrForm({ ...prForm, supplierId: e.target.value })}
              >
                <option value="">— Pilih Supplier (Opsional) —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 text-zinc-500 dark:text-zinc-400">Tanggal Pengajuan</label>
              <input 
                type="date" 
                className="input" 
                value={prForm.requestDate} 
                onChange={(e) => setPrForm({ ...prForm, requestDate: e.target.value })} 
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold mb-1.5 text-zinc-500 dark:text-zinc-400">Catatan Internal / Keterangan</label>
            <textarea 
              className="input" 
              rows={3} 
              placeholder="Berikan alasan pembelian atau catatan pengiriman barang..."
              value={prForm.notes} 
              onChange={(e) => setPrForm({ ...prForm, notes: e.target.value })} 
            />
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">Daftar Item Barang</label>
              <button 
                type="button" 
                className="btn btn-ghost btn-sm text-xs" 
                onClick={() => setPrItems([...prItems, { productName: '', quantity: 1, unitPrice: 0 }])}
              >
                + Tambah Baris
              </button>
            </div>
            
            <div className="space-y-3">
              {prItems.map((item, i) => (
                <div key={i} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex-1">
                    <select
                      className="input select"
                      value={item.productName}
                      onChange={(e) => {
                        const p = products.find((x) => x.name === e.target.value)
                        const next = [...prItems]
                        next[i] = { ...next[i], productName: e.target.value, unitPrice: p?.buyPrice || 0 }
                        setPrItems(next)
                      }}
                      required
                    >
                      <option value="">Pilih produk...</option>
                      {products.map((p) => <option key={p.id} value={p.name}>{p.code} - {p.name}</option>)}
                    </select>
                  </div>
                  <div className="w-full sm:w-28 shrink-0">
                    <input 
                      type="number" 
                      className="input" 
                      min={1} 
                      placeholder="Qty"
                      value={item.quantity} 
                      onChange={(e) => {
                        const next = [...prItems]; next[i].quantity = Number(e.target.value); setPrItems(next)
                      }} 
                      required
                    />
                  </div>
                  <div className="w-full sm:w-36 shrink-0">
                    <input 
                      type="number" 
                      className="input" 
                      min={0} 
                      placeholder="Harga Unit"
                      value={item.unitPrice} 
                      onChange={(e) => {
                        const next = [...prItems]; next[i].unitPrice = Number(e.target.value); setPrItems(next)
                      }} 
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex gap-2 justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => setTab('pending')}
            >
              Batalkan
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Menyimpan...' : 'Ajukan Permintaan PR'}
            </button>
          </div>
        </form>
      ) : loading ? (
        <div className="card p-12 text-center text-zinc-400">
          <div className="w-8 h-8 border-2 border-zinc-950 dark:border-white border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
          <p className="text-xs font-extrabold uppercase tracking-widest">Memuat Dokumen...</p>
        </div>
      ) : approvals.length === 0 ? (
        <div className="card p-12 text-center text-zinc-400">
          <ClipboardCheck size={40} className="mx-auto mb-4 opacity-30 text-zinc-400" />
          <p className="text-xs font-extrabold uppercase tracking-widest text-zinc-400">Tidak ada permintaan persetujuan</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {approvals.map((a) => {
            const pr = a.purchaseRequest
            return (
              <div 
                key={a.id} 
                className="card flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-extrabold text-base text-zinc-950 dark:text-zinc-50 tracking-tight font-mono">
                        {pr?.number || a.referenceId}
                      </h3>
                      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1">
                        Diminta oleh {a.requester?.name} · {formatDate(a.createdAt)}
                      </p>
                    </div>
                    <span className={`badge ${a.status === 'APPROVED' ? 'badge-success' : a.status === 'REJECTED' ? 'badge-danger' : 'badge-warning'}`}>
                      {a.status}
                    </span>
                  </div>

                  {pr?.supplier && (
                    <div className="mt-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Supplier Tujuan: <strong className="text-zinc-800 dark:text-zinc-200 font-bold">{pr.supplier.name}</strong>
                    </div>
                  )}

                  {pr?.items?.length > 0 && (
                    <div className="mt-4 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-2 border-b border-zinc-200 dark:border-zinc-800 pb-1.5">
                        Daftar Kebutuhan Barang
                      </p>
                      <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1.5 font-bold">
                        {pr.items.map((it: any, idx: number) => (
                          <li key={idx} className="flex justify-between items-center">
                            <span className="truncate max-w-[200px] font-semibold">{it.productName}</span>
                            <span className="font-mono text-zinc-500 dark:text-zinc-400">
                              {it.quantity} × {formatRupiah(it.unitPrice)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mt-4">
                    <p className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-1">Total Nilai Anggaran</p>
                    <p className="text-2xl font-extrabold text-zinc-950 dark:text-zinc-50 tracking-tight font-mono">{formatRupiah(pr?.totalAmount || 0)}</p>
                  </div>
                </div>

                <div className="flex gap-2.5 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex-wrap">
                  {a.status === 'PENDING' && (
                    <>
                      <button 
                        className="btn btn-sm btn-primary" 
                        onClick={() => handleApprove(a.id, 'APPROVED')}
                      >
                        <CheckCircle2 size={15} /> Setujui
                      </button>
                      <button 
                        className="btn btn-sm btn-secondary text-red-600 hover:text-red-700 hover:border-red-200" 
                        onClick={() => handleApprove(a.id, 'REJECTED')}
                      >
                        <XCircle size={15} /> Tolak
                      </button>
                    </>
                  )}
                  
                  {a.status === 'APPROVED' && pr?.status === 'APPROVED' && (() => {
                    const activePo = pr.purchaseOrders?.find((po: any) => po.status !== 'CANCELLED')
                    if (activePo) {
                      return (
                        <div className="badge badge-success py-2 px-3 rounded-xl border flex items-center">
                          <CheckCircle2 size={14} className="text-green-600 dark:text-green-400 shrink-0 mr-1.5" />
                          <span>PO Terbuat: <strong>{activePo.number}</strong></span>
                        </div>
                      )
                    }
                    return (
                      <button 
                        className="btn btn-sm btn-primary" 
                        onClick={() => handleConvertToPO(pr.id)}
                      >
                        <FileText size={15} /> Buat PO
                      </button>
                    )
                  })()}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
