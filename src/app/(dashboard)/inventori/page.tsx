'use client'

import { useState, useEffect } from 'react'
import { useCompanyStore } from '@/stores/company-store'
import { formatNumber } from '@/lib/utils'
import { ArrowLeftRight, ArrowDownRight, ArrowUpRight, Search, Box, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

export default function InventoriPage() {
  const { activeCompany } = useCompanyStore()
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [search, setSearch] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  
  // Pagination States
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'IN' | 'OUT' | 'TRANSFER'>('IN')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    productId: '',
    warehouseId: '',
    fromWarehouseId: '',
    quantity: 0,
    notes: '',
    reference: ''
  })
  
  // Modal Product Search & Custom Dropdown states
  const [productSearch, setProductSearch] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)

  // Load Inventory data based on filters & pagination
  useEffect(() => {
    if (!activeCompany) return
    fetchInventory()
  }, [activeCompany, search, selectedWarehouse, page])

  // Load static masters once
  useEffect(() => {
    if (!activeCompany) return
    fetchWarehouses()
  }, [activeCompany])

  // Debouncing search queries on main screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchQuery)
      setPage(1) // Reset back to page 1 on new search
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Debouncing & dynamically fetching products inside the modal
  useEffect(() => {
    if (!isModalOpen) return
    const timer = setTimeout(() => {
      fetchProducts(productSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [productSearch, isModalOpen])

  const fetchProducts = async (q: string = '') => {
    try {
      const res = await fetch(`/api/products?search=${q}&limit=50`)
      const json = await res.json()
      if (json.success) setProducts(json.data)
    } catch (err) {
      console.error('Gagal memuat produk pencarian:', err)
    }
  }

  const fetchWarehouses = async () => {
    try {
      const res = await fetch(`/api/warehouses?limit=100`)
      const json = await res.json()
      if (json.success) setWarehouses(json.data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchInventory = async () => {
    setLoading(true)
    try {
      const url = new URL('/api/inventory', window.location.origin)
      url.searchParams.set('page', page.toString())
      url.searchParams.set('limit', '10')
      if (search) url.searchParams.set('search', search)
      if (selectedWarehouse) url.searchParams.set('warehouseId', selectedWarehouse)

      const res = await fetch(url.toString(), {
        cache: 'no-store'
      })
      const json = await res.json()
      if (json.success) {
        setInventory(json.data)
        setTotalPages(json.meta?.totalPages || 1)
      }
    } catch (err) {
      toast.error('Gagal memuat inventori')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (type: 'IN' | 'OUT' | 'TRANSFER') => {
    setModalType(type)
    setFormData({
      productId: '',
      warehouseId: '',
      fromWarehouseId: '',
      quantity: 0,
      notes: '',
      reference: ''
    })
    setProductSearch('')
    setSelectedProduct(null)
    setIsProductDropdownOpen(false)
    setIsModalOpen(true)
  }

  const handleSelectProduct = (product: any) => {
    setFormData({ ...formData, productId: product.id })
    setSelectedProduct(product)
    setIsProductDropdownOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.quantity <= 0) {
      return toast.error('Jumlah harus lebih dari 0')
    }
    
    setIsSubmitting(true)
    try {
      const payload = {
        ...formData,
        type: modalType
      }
      
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      
      if (json.success) {
        toast.success(json.message)
        setIsModalOpen(false)
        fetchInventory()
      } else {
        toast.error(json.message)
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Inventori Gudang</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Ringkasan stok barang per gudang
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => handleOpenModal('IN')}>
            <ArrowDownRight size={18} className="text-green-600" />
            Barang Masuk
          </button>
          <button className="btn btn-secondary" onClick={() => handleOpenModal('OUT')}>
            <ArrowUpRight size={18} className="text-red-600" />
            Barang Keluar
          </button>
          <button className="btn btn-primary" onClick={() => handleOpenModal('TRANSFER')}>
            <ArrowLeftRight size={18} />
            Transfer
          </button>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari produk (nama/kode)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="w-full sm:w-64">
            <select
              value={selectedWarehouse}
              onChange={(e) => {
                setSelectedWarehouse(e.target.value)
                setPage(1) // Reset ke halaman 1
              }}
              className="input"
            >
              <option value="">-- Semua Gudang --</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
             <div className="py-10 text-center text-sm text-gray-500">
               <div className="animate-pulse flex flex-col items-center gap-2">
                 <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                 <p>Memuat data inventori...</p>
               </div>
             </div>
          ) : inventory.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Box size={48} className="mx-auto mb-4 opacity-20" />
              <p>Tidak ada stok ditemukan</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Gudang</th>
                  <th>Kode Produk</th>
                  <th>Nama Produk</th>
                  <th>Kuantitas</th>
                  <th>Batas Minimum</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id}>
                    <td className="font-medium">{item.warehouse.name}</td>
                    <td className="text-gray-500">{item.product.code}</td>
                    <td>{item.product.name}</td>
                    <td className="font-bold">
                      {formatNumber(item.quantity)} {item.product.unit?.symbol}
                    </td>
                    <td>{formatNumber(item.product.minStock)}</td>
                    <td>
                      {item.quantity <= 0 ? (
                        <span className="badge badge-danger">Habis</span>
                      ) : item.quantity <= item.product.minStock ? (
                        <span className="badge badge-warning">Menipis</span>
                      ) : (
                        <span className="badge badge-success">Aman</span>
                      )}
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

      {isModalOpen && (
        <div className="modal-overlay z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl transform transition-all" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
                {modalType === 'IN' && 'Mutasi Barang Masuk'}
                {modalType === 'OUT' && 'Mutasi Barang Keluar'}
                {modalType === 'TRANSFER' && 'Transfer Stok Antar Gudang'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Produk *</label>
                  <div className="relative">
                    {/* The Trigger Button */}
                    <div 
                      onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                      className="input cursor-pointer flex justify-between items-center bg-gray-50 dark:bg-slate-800 select-none"
                    >
                      <span className={selectedProduct ? "text-gray-900 dark:text-white font-medium" : "text-gray-400"}>
                        {selectedProduct ? `${selectedProduct.code} - ${selectedProduct.name}` : '-- Pilih Produk --'}
                      </span>
                      <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${isProductDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {/* The Dropdown Menu */}
                    {isProductDropdownOpen && (
                      <>
                        {/* Overlay to close when clicking outside */}
                        <div className="fixed inset-0 z-40" onClick={() => setIsProductDropdownOpen(false)} />
                        
                        <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-2 space-y-2 max-h-72 overflow-y-auto">
                          {/* Search Input inside Dropdown */}
                          <div className="relative top-0 bg-white dark:bg-slate-900 pb-1 z-10">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                              type="text" 
                              className="input pl-9 text-sm py-1.5 bg-gray-50 focus:bg-white dark:bg-slate-800/80" 
                              placeholder="Ketik untuk mencari produk..." 
                              value={productSearch}
                              onChange={e => setProductSearch(e.target.value)}
                              autoFocus
                              onClick={e => e.stopPropagation()} // Prevent closing dropdown when clicking input
                            />
                          </div>

                          {/* Options List */}
                          <div className="space-y-1">
                            {products.length === 0 ? (
                              <div className="text-center py-4 text-xs text-gray-500">
                                Produk tidak ditemukan
                              </div>
                            ) : (
                              products.map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleSelectProduct(p)}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex flex-col ${
                                    formData.productId === p.id 
                                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold' 
                                      : 'hover:bg-gray-50 dark:hover:bg-slate-800/80 text-gray-700 dark:text-gray-300'
                                  }`}
                                >
                                  <span className="font-semibold text-xs text-blue-600 dark:text-blue-400">{p.code}</span>
                                  <span className="font-medium text-gray-800 dark:text-gray-200">{p.name}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(modalType === 'OUT' || modalType === 'TRANSFER') && (
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                        Gudang Asal *
                      </label>
                      <select 
                        className="input" 
                        required 
                        value={modalType === 'OUT' ? formData.warehouseId : formData.fromWarehouseId}
                        onChange={e => {
                          if (modalType === 'OUT') setFormData({...formData, warehouseId: e.target.value})
                          else setFormData({...formData, fromWarehouseId: e.target.value})
                        }}
                      >
                        <option value="">-- Pilih Gudang Asal --</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {(modalType === 'IN' || modalType === 'TRANSFER') && (
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                        Gudang Tujuan *
                      </label>
                      <select 
                        className="input" 
                        required 
                        value={formData.warehouseId}
                        onChange={e => setFormData({...formData, warehouseId: e.target.value})}
                      >
                        <option value="">-- Pilih Gudang Tujuan --</option>
                        {warehouses.map(w => (
                          <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Jumlah (Kuantitas) *</label>
                  <input 
                    type="number" 
                    className="input" 
                    min="1" 
                    required 
                    value={formData.quantity || ''} 
                    onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} 
                    placeholder="Masukkan jumlah fisik barang..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Referensi / No. Bukti</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="Misal: DO-002, SR-99 (Opsional)"
                      value={formData.reference} 
                      onChange={e => setFormData({...formData, reference: e.target.value})} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">Catatan</label>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="Tujuan penyesuaian (Opsional)"
                      value={formData.notes} 
                      onChange={e => setFormData({...formData, notes: e.target.value})} 
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 mt-6 border-t dark:border-slate-800">
                  <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Batal</button>
                  <button type="submit" className="btn btn-primary shadow-md" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Memproses...
                      </span>
                    ) : 'Proses Mutasi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
