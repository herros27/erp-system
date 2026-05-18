'use client'

import { useState, useEffect } from 'react'
import { useCompanyStore } from '@/stores/company-store'
import { formatRupiah, formatNumber } from '@/lib/utils'
import { Plus, Search, Edit, Trash2, Package, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

export default function ProdukPage() {
  const { activeCompany } = useCompanyStore()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [formData, setFormData] = useState({
    id: '',
    code: '',
    name: '',
    categoryId: '',
    unitId: '',
    buyPrice: 0,
    sellPrice: 0,
    minStock: 0
  })

  // Debouncing search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchQuery)
      setPage(1) // Reset to page 1 on new search
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (activeCompany) fetchProducts()
  }, [activeCompany, search, page])

  useEffect(() => {
    if (activeCompany) fetchMasters()
  }, [activeCompany])

  const fetchMasters = async () => {
    const [cRes, uRes] = await Promise.all([
      fetch('/api/categories?limit=100', {
        cache: 'no-store',
        headers: { 'x-company-id': activeCompany?.id || '' }
      }),
      fetch('/api/units?limit=100', {
        cache: 'no-store',
        headers: { 'x-company-id': activeCompany?.id || '' }
      }),
    ])
    const cJson = await cRes.json()
    const uJson = await uRes.json()
    if (cJson.success) setCategories(cJson.data)
    if (uJson.success) setUnits(uJson.data)
  }

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const url = new URL('/api/products', window.location.origin)
      url.searchParams.set('page', page.toString())
      url.searchParams.set('limit', '10')
      if (search) url.searchParams.set('search', search)

      const res = await fetch(url.toString(), {
        cache: 'no-store',
        headers: { 'x-company-id': activeCompany?.id || '' }
      })
      const json = await res.json()
      if (json.success) {
        setProducts(json.data)
        setTotalPages(json.meta?.totalPages || 1)
      }
    } catch (err) {
      toast.error('Gagal memuat produk')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        fetchProducts()
      } else {
        toast.error(json.message)
      }
    } catch {
      toast.error('Gagal menghapus produk')
    }
  }

  const handleOpenModal = (product?: any) => {
    if (product) {
      setFormData({
        id: product.id,
        code: product.code,
        name: product.name,
        categoryId: product.categoryId || product.category?.id || '',
        unitId: product.unitId || product.unit?.id || '',
        buyPrice: product.buyPrice,
        sellPrice: product.sellPrice,
        minStock: product.minStock
      })
    } else {
      setFormData({ id: '', code: '', name: '', categoryId: '', unitId: '', buyPrice: 0, sellPrice: 0, minStock: 0 })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const url = formData.id ? `/api/products/${formData.id}` : '/api/products'
      const method = formData.id ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const json = await res.json()
      
      if (json.success) {
        toast.success(json.message)
        setIsModalOpen(false)
        fetchProducts()
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Master Produk</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Kelola data barang dan layanan
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          Tambah Produk
        </button>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari produk (kode, nama)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
             <div className="py-10 text-center text-sm text-gray-500">Memuat data...</div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Package size={48} className="mx-auto mb-4 opacity-20" />
              <p>Tidak ada produk ditemukan</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Produk</th>
                  <th>Kategori</th>
                  <th>Stok</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium text-blue-600">{p.code}</td>
                    <td>{p.name}</td>
                    <td>{p.category?.name || '-'}</td>
                    <td>
                      <span className={`badge ${p.totalStock <= p.minStock ? 'badge-danger' : 'badge-success'}`}>
                        {formatNumber(p.totalStock)} {p.unit?.symbol}
                      </span>
                    </td>
                    <td className="text-right">
                      <button 
                        className="btn btn-ghost btn-sm text-blue-600 hover:bg-blue-50 mr-2"
                        onClick={() => handleOpenModal(p)}
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(p.id)}
                      >
                        <Trash2 size={16} />
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

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              {formData.id ? 'Edit Produk' : 'Tambah Produk'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Kode Produk</label>
                <input type="text" className="input" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Nama Produk</label>
                <input type="text" className="input" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Kategori</label>
                  <select className="input" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                    <option value="">— Pilih —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Satuan</label>
                  <select className="input" value={formData.unitId} onChange={e => setFormData({...formData, unitId: e.target.value})}>
                    <option value="">— Pilih —</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Minimal Stok</label>
                <input type="number" className="input" min="0" required value={formData.minStock} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} />
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
