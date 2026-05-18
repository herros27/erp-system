'use client'

import { useState, useEffect } from 'react'
import { useCompanyStore } from '@/stores/company-store'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Plus, Search, FileText, CheckCircle2, Clock, XCircle, Trash2, Receipt, ExternalLink, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function InvoicePage() {
  const { activeCompany } = useCompanyStore()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const router = useRouter()

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [salesOrders, setSalesOrders] = useState<any[]>([])
  
  const [formData, setFormData] = useState({
    customerId: '',
    salesOrderId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: ''
  })
  
  const [items, setItems] = useState<Array<{productId: string, quantity: number, unitPrice: number}>>([
    { productId: '', quantity: 1, unitPrice: 0 }
  ])

  // Calculated totals
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  const tax = subtotal * 0.11
  const total = subtotal + tax

  // Debouncing search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchQuery)
      setPage(1) // Reset to page 1 on new search
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (activeCompany) fetchInvoices()
  }, [activeCompany, search, page])

  useEffect(() => {
    if (!activeCompany) return
    fetchCustomers()
    fetchProducts()
    fetchSalesOrders()
  }, [activeCompany])

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers?limit=100', {
        cache: 'no-store',
        headers: { 'x-company-id': activeCompany?.id || '' }
      })
      const json = await res.json()
      if (json.success) setCustomers(json.data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products?limit=100', {
        cache: 'no-store',
        headers: { 'x-company-id': activeCompany?.id || '' }
      })
      const json = await res.json()
      if (json.success) setProducts(json.data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchSalesOrders = async () => {
    try {
      const res = await fetch('/api/sales/orders?limit=100', {
        cache: 'no-store',
        headers: { 'x-company-id': activeCompany?.id || '' }
      })
      const json = await res.json()
      if (json.success) {
        // Only fetch SO that haven't been invoiced, cancelled, or completed
        const availableSO = json.data.filter((so: any) => 
          so.status !== 'CANCELLED' && so.status !== 'INVOICED' && so.status !== 'COMPLETED'
        )
        setSalesOrders(availableSO)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const url = new URL('/api/invoices', window.location.origin)
      url.searchParams.set('page', page.toString())
      url.searchParams.set('limit', '10')
      if (search) url.searchParams.set('search', search)
      
      const res = await fetch(url.toString(), {
        cache: 'no-store',
        headers: { 'x-company-id': activeCompany?.id || '' }
      })
      const json = await res.json()
      if (json.success) {
        setInvoices(json.data)
        setTotalPages(json.meta?.totalPages || 1)
      }
    } catch (err) {
      toast.error('Gagal memuat invoice')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = () => {
    const today = new Date()
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    setFormData({
      customerId: '',
      salesOrderId: '',
      invoiceDate: today.toISOString().split('T')[0],
      dueDate: nextWeek.toISOString().split('T')[0], // Default due date is 7 days from now
      notes: ''
    })
    setItems([{ productId: '', quantity: 1, unitPrice: 0 }])
    setIsModalOpen(true)
  }

  const handleSOChange = (soId: string) => {
    const so = salesOrders.find(s => s.id === soId)
    if (so) {
      setFormData({
        ...formData,
        salesOrderId: soId,
        customerId: so.customerId,
      })
      // Populate items from SO
      const soItems = so.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
      setItems(soItems)
    } else {
      setFormData({
        ...formData,
        salesOrderId: '',
        customerId: '',
      })
      setItems([{ productId: '', quantity: 1, unitPrice: 0 }])
    }
  }

  const handleAddItem = () => {
    setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items]
    if (field === 'productId') {
      const product = products.find(p => p.id === value)
      newItems[index] = { ...newItems[index], productId: value, unitPrice: product?.sellPrice || 0 }
    } else {
      newItems[index] = { ...newItems[index], [field]: value }
    }
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate items
    const validItems = items.filter(item => item.productId && item.quantity > 0)
    if (validItems.length === 0) {
      return toast.error('Tambahkan minimal 1 produk')
    }
    if (!formData.dueDate) {
      return toast.error('Tanggal jatuh tempo wajib diisi')
    }

    setIsSubmitting(true)
    try {
      const payload = { 
        ...formData, 
        items: validItems 
      }
      
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-company-id': activeCompany?.id || '' 
        },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      
      if (json.success) {
        toast.success(json.message)
        setIsModalOpen(false)
        fetchInvoices()
        fetchSalesOrders() // Refresh SO list since one is now invoiced
      } else {
        toast.error(json.message)
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'UNPAID': return <span className="badge badge-warning"><Clock size={12} className="mr-1"/> Belum Lunas</span>
      case 'PARTIAL': return <span className="badge badge-info"><CheckCircle2 size={12} className="mr-1"/> Sebagian</span>
      case 'PAID': return <span className="badge badge-success"><CheckCircle2 size={12} className="mr-1"/> Lunas</span>
      case 'OVERDUE': return <span className="badge badge-danger"><XCircle size={12} className="mr-1"/> Terlambat</span>
      case 'CANCELLED': return <span className="badge badge-neutral"><XCircle size={12} className="mr-1"/> Batal</span>
      default: return <span className="badge badge-neutral">{status}</span>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Invoice</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Kelola tagihan faktur ke pelanggan Anda
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenModal}>
          <Plus size={18} />
          Buat Invoice Baru
        </button>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari nomor invoice atau pelanggan..." 
              className="input pl-10" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
             <div className="py-10 text-center text-sm text-gray-500">Memuat data...</div>
          ) : invoices.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Receipt size={48} className="mx-auto mb-4 opacity-20" />
              <p>Belum ada data invoice</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nomor Invoice</th>
                  <th>Referensi SO</th>
                  <th>Tanggal</th>
                  <th>Jatuh Tempo</th>
                  <th>Pelanggan</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Dibayar</th>
                  <th className="text-center">Status</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="font-medium text-blue-600">{inv.number}</td>
                    <td className="text-gray-600">{inv.salesOrder?.number || '-'}</td>
                    <td>{formatDate(inv.invoiceDate)}</td>
                    <td className={new Date(inv.dueDate) < new Date() && inv.status !== 'PAID' ? 'text-red-500 font-medium' : ''}>
                      {formatDate(inv.dueDate)}
                    </td>
                    <td>{inv.customer?.name}</td>
                    <td className="font-medium text-right">{formatRupiah(inv.total)}</td>
                    <td className="text-right text-green-600">{formatRupiah(inv.paidAmount || 0)}</td>
                    <td className="text-center">{getStatusBadge(inv.status)}</td>
                    <td className="text-right">
                      <button 
                        className="btn btn-ghost btn-sm text-blue-600"
                        onClick={() => { setSelectedInvoice(inv); setIsDetailModalOpen(true); }}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className='p-5 border-t border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/30 flex flex-col sm:flex-row items-center justify-between gap-4 -mx-5 -mb-5 rounded-b-2xl mt-5'>
            <div className='text-xs text-zinc-500 dark:text-zinc-400 font-bold'>
              Halaman {page} dari {totalPages}
            </div>
            <div className='pagination'>
              <button
                type='button'
                onClick={() => setPage(1)}
                disabled={page === 1}
                className='pagination-btn disabled:opacity-40 disabled:cursor-not-allowed'>
                Pertama
              </button>
              <button
                type='button'
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className='pagination-btn disabled:opacity-40 disabled:cursor-not-allowed'>
                Sebelumnya
              </button>
              <span className='px-4 py-2 bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950 font-bold text-xs rounded-xl shadow-sm border border-transparent select-none'>
                {page} / {totalPages}
              </span>
              <button
                type='button'
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className='pagination-btn disabled:opacity-40 disabled:cursor-not-allowed'>
                Selanjutnya
              </button>
              <button
                type='button'
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className='pagination-btn disabled:opacity-40 disabled:cursor-not-allowed'>
                Terakhir
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Form Buat Invoice */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content max-w-4xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white">Buat Invoice Penagihan</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Pilih Sales Order (SO) *</label>
                  <select 
                    className="input border-blue-300 bg-blue-50 dark:bg-blue-900/20" 
                    required
                    value={formData.salesOrderId}
                    onChange={e => handleSOChange(e.target.value)}
                  >
                    <option value="">-- Pilih Pesanan (SO) --</option>
                    {salesOrders.map(so => (
                      <option key={so.id} value={so.id}>
                        {so.number} - {so.customer.name} (Total: {formatRupiah(so.total)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Tanggal Invoice *</label>
                  <input 
                    type="date" 
                    className="input" 
                    required
                    value={formData.invoiceDate}
                    onChange={e => setFormData({...formData, invoiceDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Jatuh Tempo (Due Date) *</label>
                  <input 
                    type="date" 
                    className="input" 
                    required
                    value={formData.dueDate}
                    onChange={e => setFormData({...formData, dueDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Catatan Khusus</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Contoh: Pembayaran transfer ke Bank BCA..."
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-gray-800 dark:text-white">Daftar Item Ditagihkan</h3>
                </div>
                
                <div className="overflow-x-auto border rounded-lg dark:border-slate-700">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-slate-800">
                      <tr>
                        <th className="p-3 text-gray-700 dark:text-gray-300 font-medium">Produk / Layanan</th>
                        <th className="p-3 text-gray-700 dark:text-gray-300 font-medium w-32">Kuantitas</th>
                        <th className="p-3 text-gray-700 dark:text-gray-300 font-medium w-40">Harga Jual</th>
                        <th className="p-3 text-gray-700 dark:text-gray-300 font-medium w-40 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index} className="border-t border-gray-100 dark:border-slate-700">
                          <td className="p-2">
                            <select 
                              className="input py-1.5 disabled:bg-gray-100 disabled:opacity-70 dark:disabled:bg-slate-800"
                              value={item.productId}
                              disabled
                            >
                              <option value="">Pilih...</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              className="input py-1.5 disabled:bg-gray-100 disabled:opacity-70 dark:disabled:bg-slate-800" 
                              value={item.quantity || ''}
                              disabled
                            />
                          </td>
                          <td className="p-2">
                            <input 
                              type="number" 
                              className="input py-1.5 disabled:bg-gray-100 disabled:opacity-70 dark:disabled:bg-slate-800" 
                              value={item.unitPrice === 0 ? '' : item.unitPrice}
                              disabled
                            />
                          </td>
                          <td className="p-2 text-right font-medium text-gray-800 dark:text-gray-200">
                            {formatRupiah(item.quantity * item.unitPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end border-t pt-4 dark:border-slate-700">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{formatRupiah(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">PPN (11%):</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{formatRupiah(tax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-800 dark:text-white">Total Penagihan:</span>
                    <span className="text-blue-600 dark:text-blue-400">{formatRupiah(total)}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan & Terbitkan Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detail Invoice */}
      {isDetailModalOpen && selectedInvoice && (
        <div className="modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div className="modal-content max-w-4xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Faktur Penjualan (Invoice)</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedInvoice.number}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right mr-2">
                  <p className="text-xs text-gray-500 mb-1">Status Pembayaran</p>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
                {selectedInvoice.status !== 'PAID' && selectedInvoice.status !== 'CANCELLED' && (
                  <button 
                    className="btn btn-secondary btn-sm flex items-center gap-1 bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                    onClick={() => router.push('/pembayaran')}
                  >
                    <CreditCard size={14} /> Terima Pembayaran
                  </button>
                )}
                <button 
                  className="btn btn-primary btn-sm flex items-center gap-1"
                  onClick={() => window.open(`/print/invoice/${selectedInvoice.id}`, '_blank')}
                >
                  <Receipt size={14} /> Cetak PDF
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Ditagihkan Kepada</p>
                <p className="font-medium text-gray-800 dark:text-white">{selectedInvoice.customer?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Referensi SO</p>
                <p className="font-medium text-blue-600 dark:text-blue-400">{selectedInvoice.salesOrder?.number || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tanggal Invoice</p>
                <p className="font-medium text-gray-800 dark:text-white">{formatDate(selectedInvoice.invoiceDate)}</p>
              </div>
              <div>
                <p className="text-sm  dark:text-gray-400 mb-1 text-red-500">Jatuh Tempo</p>
                <p className="font-medium text-gray-800 dark:text-white">{formatDate(selectedInvoice.dueDate)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Catatan</p>
                <p className="font-medium text-gray-800 dark:text-white">{selectedInvoice.notes || '-'}</p>
              </div>
            </div>

            <h3 className="font-semibold text-gray-800 dark:text-white mb-3">Rincian Tagihan</h3>
            <div className="overflow-x-auto border rounded-lg dark:border-slate-700 mb-6">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-slate-800">
                  <tr>
                    <th className="p-3 text-gray-700 dark:text-gray-300 font-medium">Produk / Layanan</th>
                    <th className="p-3 text-gray-700 dark:text-gray-300 font-medium text-center">Kuantitas</th>
                    <th className="p-3 text-gray-700 dark:text-gray-300 font-medium text-right">Harga Jual</th>
                    <th className="p-3 text-gray-700 dark:text-gray-300 font-medium text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items?.map((item: any) => (
                    <tr key={item.id} className="border-t border-gray-100 dark:border-slate-700">
                      <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{item.product?.name}</td>
                      <td className="p-3 text-center text-gray-800 dark:text-gray-200">{item.quantity}</td>
                      <td className="p-3 text-right text-gray-800 dark:text-gray-200">{formatRupiah(item.unitPrice)}</td>
                      <td className="p-3 text-right font-medium text-gray-800 dark:text-gray-200">{formatRupiah(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-t pt-4 dark:border-slate-700">
              <div className="p-4 bg-orange-50 dark:bg-slate-900 rounded-lg w-full md:w-auto">
                <p className="text-sm text-orange-800 dark:text-orange-400 font-medium mb-1">Informasi Pembayaran</p>
                <div className="text-xs text-orange-700 dark:text-orange-500">
                  <p>Telah Dibayar: {formatRupiah(selectedInvoice.paidAmount || 0)}</p>
                  <p className="font-bold mt-1">Sisa Tagihan: {formatRupiah(selectedInvoice.total - (selectedInvoice.paidAmount || 0))}</p>
                </div>
                <button 
                  className="mt-3 text-xs flex items-center gap-1 font-medium text-blue-600 hover:text-blue-800"
                  onClick={() => router.push('/pembayaran')}
                >
                  Lihat Riwayat Berkas Pembayaran <ExternalLink size={12} />
                </button>
              </div>

              <div className="w-full md:w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Subtotal:</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{formatRupiah(selectedInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">PPN (11%):</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{formatRupiah(selectedInvoice.tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-800 dark:text-white">Total Tagihan:</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatRupiah(selectedInvoice.total)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t dark:border-slate-700">
              <button className="btn btn-secondary" onClick={() => setIsDetailModalOpen(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
