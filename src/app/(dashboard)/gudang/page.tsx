'use client'

import { useState, useEffect } from 'react'
import { useCompanyStore } from '@/stores/company-store'
import { Plus, Search, Edit2, Trash2, Warehouse as WarehouseIcon, X } from 'lucide-react'
import { toast } from 'sonner'

export default function GudangPage() {
  const { activeCompany } = useCompanyStore()
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ id: '', code: '', name: '', address: '' })
  const [isEdit, setIsEdit] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Debouncing search queries
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchQuery)
      setPage(1) // Reset to page 1 on new search
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (activeCompany) fetchWarehouses()
  }, [activeCompany, page, search])

  const fetchWarehouses = async () => {
    setLoading(true)
    try {
      const url = new URL('/api/warehouses', window.location.origin)
      url.searchParams.set('page', page.toString())
      if (search) url.searchParams.set('search', search)
        
      const res = await fetch(url.toString(), {
        cache: 'no-store',
        headers: { 'x-company-id': activeCompany?.id || '' }
      })
      const json = await res.json()
      if (json.success) {
        setWarehouses(json.data)
        setTotalPages(json.meta?.totalPages || 1)
      }
    } catch (err) {
      toast.error('Gagal memuat data gudang')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (warehouse: any = null) => {
    if (warehouse) {
      setIsEdit(true)
      setFormData({ id: warehouse.id, code: warehouse.code, name: warehouse.name, address: warehouse.address || '' })
    } else {
      setIsEdit(false)
      setFormData({ id: '', code: '', name: '', address: '' })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const url = isEdit ? `/api/warehouses/${formData.id}` : '/api/warehouses'
      const method = isEdit ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-company-id': activeCompany?.id || '' 
        },
        body: JSON.stringify(formData)
      })
      
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setIsModalOpen(false)
        fetchWarehouses()
      } else {
        toast.error(json.message)
      }
    } catch (err) {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus gudang ini?')) return
      
    try {
      const res = await fetch(`/api/warehouses/${id}`, {
        method: 'DELETE',
        headers: { 'x-company-id': activeCompany?.id || '' }
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        fetchWarehouses()
      } else {
        toast.error(json.message)
      }
    } catch (err) {
      toast.error('Gagal menghapus gudang')
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-white flex items-center gap-3">
            <WarehouseIcon size={28} className="text-zinc-900 dark:text-zinc-100 shrink-0" />
            Daftar Gudang
          </h1>
          <p className="text-sm mt-1 text-zinc-500 dark:text-zinc-400 font-medium">
            Kelola lokasi dan rincian fisik gudang Anda
          </p>
        </div>
        <button 
          className="px-5 py-3 bg-zinc-950 hover:bg-zinc-900 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2" 
          onClick={() => handleOpenModal()}
        >
          <Plus size={18} />
          <span>Tambah Gudang</span>
        </button>
      </div>

      {/* DATA SECTION */}
      <div className="card p-0 overflow-hidden border border-zinc-100 dark:border-zinc-850 shadow-sm rounded-2xl bg-white dark:bg-zinc-900">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-850">
          {/* Wrapper Flexbox untuk Search Bar */}
          <div className="flex items-center gap-3 px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus-within:ring-2 focus-within:ring-zinc-950 focus-within:border-zinc-950 dark:focus-within:ring-zinc-200 transition-all max-w-md w-full">
            <Search className="w-5 h-5 text-zinc-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Cari kode atau nama gudang..." 
              className="w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 m-0 text-zinc-900 dark:text-white" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 uppercase bg-zinc-50/50 dark:bg-zinc-950/50 border-b border-zinc-100 dark:border-zinc-850">
              <tr>
                <th className="px-6 py-4 font-bold w-32">Kode</th>
                <th className="px-6 py-4 font-bold">Nama Gudang</th>
                <th className="px-6 py-4 font-bold">Alamat</th>
                <th className="px-6 py-4 font-bold text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-20 text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-2 border-zinc-950 dark:border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-sm font-medium">Memuat data gudang...</p>
                    </div>
                  </td>
                </tr>
              ) : warehouses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-20">
                    <div className="flex flex-col items-center justify-center text-center px-4">
                      <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-950 rounded-full flex items-center justify-center mb-4 border border-dashed border-zinc-200 dark:border-zinc-800">
                        <WarehouseIcon size={32} className="text-zinc-400" />
                      </div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">
                        Belum ada data gudang
                      </h3>
                      <p className="text-sm text-zinc-500 max-w-sm">
                        Belum ada gudang terdaftar untuk perusahaan ini.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                warehouses.map((w) => (
                  <tr key={w.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 rounded-lg font-bold text-xs shadow-sm">
                        {w.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-zinc-900 dark:text-white">{w.name}</td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-medium">{w.address || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          className="p-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all" 
                          onClick={() => handleOpenModal(w)}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="p-2 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all" 
                          onClick={() => handleDelete(w.id)}
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className='p-5 border-t border-zinc-100 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-950/30 flex flex-col sm:flex-row items-center justify-between gap-4'>
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

      {/* MODAL FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-md transition-opacity" onClick={() => !isSubmitting && setIsModalOpen(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-zinc-100 dark:border-zinc-800" onClick={e => e.stopPropagation()}>
            {/* MODAL HEADER */}
            <div className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/80 px-8 py-6 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-extrabold text-zinc-950 dark:text-white flex items-center gap-3">
                {isEdit ? <Edit2 size={20} className="text-zinc-900 dark:text-zinc-100" /> : <Plus size={20} className="text-zinc-900 dark:text-zinc-100" />}
                {isEdit ? 'Edit Gudang' : 'Tambah Gudang Baru'}
              </h2>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="p-3 text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 p-8">
              <div>
                <label className="block text-sm font-bold mb-1.5 text-zinc-800 dark:text-zinc-200">Kode Gudang <span className="text-zinc-400">*</span></label>
                <input 
                  type="text" 
                  className="w-full px-5 py-4 text-sm bg-zinc-50 hover:bg-zinc-100/50 focus:bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-4 focus:ring-zinc-950/5 focus:border-zinc-950 dark:focus:ring-zinc-200/10 dark:focus:border-zinc-200 transition-all outline-none text-zinc-800 dark:text-zinc-100 font-semibold uppercase" 
                  required
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  placeholder="Misal: GDG-JKT"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 text-zinc-800 dark:text-zinc-200">Nama Gudang <span className="text-zinc-400">*</span></label>
                <input 
                  type="text" 
                  className="w-full px-5 py-4 text-sm bg-zinc-50 hover:bg-zinc-100/50 focus:bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-4 focus:ring-zinc-950/5 focus:border-zinc-950 dark:focus:ring-zinc-200/10 dark:focus:border-zinc-200 transition-all outline-none text-zinc-800 dark:text-zinc-100 font-semibold" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Misal: Gudang Pusat Jakarta"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-1.5 text-zinc-800 dark:text-zinc-200">Alamat Lengkap</label>
                <textarea 
                  className="w-full px-5 py-4 text-sm bg-zinc-50 hover:bg-zinc-100/50 focus:bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-4 focus:ring-zinc-950/5 focus:border-zinc-950 dark:focus:ring-zinc-200/10 dark:focus:border-zinc-200 transition-all outline-none text-zinc-800 dark:text-zinc-100 font-medium min-h-[100px] resize-none" 
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  placeholder="Jalan, Kota, Provinsi..."
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-zinc-100 dark:border-zinc-800/80">
                <button 
                  type="button" 
                  className="px-5 py-2.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 hover:text-zinc-950 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-all shadow-sm" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-zinc-950 border border-transparent rounded-xl hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 transition-all shadow-sm disabled:opacity-50" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Menyimpan...
                    </span>
                  ) : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
