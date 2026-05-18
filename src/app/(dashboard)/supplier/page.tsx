'use client'

import { useState, useEffect } from 'react'
import { useCompanyStore } from '@/stores/company-store'
import { Plus, Search, Edit, Trash2, Truck, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

export default function SupplierPage() {
  const { activeCompany } = useCompanyStore()
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    taxId: ''
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
    if (activeCompany) fetchSuppliers()
  }, [activeCompany, search, page])

  const fetchSuppliers = async () => {
    setLoading(true)
    try {
      const url = new URL('/api/suppliers', window.location.origin)
      url.searchParams.set('page', page.toString())
      url.searchParams.set('limit', '10')
      if (search) url.searchParams.set('search', search)
      
      const res = await fetch(url.toString(), {
        cache: 'no-store',
        headers: { 'x-company-id': activeCompany?.id || '' }
      })
      const json = await res.json()
      
      if (json.success) {
        setSuppliers(json.data)
        setTotalPages(json.meta?.totalPages || 1)
      } else {
        toast.error(json.message || 'Gagal memuat supplier')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan jaringan')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (supplier?: any) => {
    if (supplier) {
      setEditingId(supplier.id)
      setFormData({
        code: supplier.code || '',
        name: supplier.name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        taxId: supplier.taxId || ''
      })
    } else {
      setEditingId(null)
      setFormData({ code: '', name: '', email: '', phone: '', address: '', taxId: '' })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const url = editingId ? `/api/suppliers/${editingId}` : '/api/suppliers'
      const method = editingId ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const json = await res.json()
      
      if (json.success) {
        toast.success(json.message)
        setIsModalOpen(false)
        fetchSuppliers()
      } else {
        toast.error(json.message)
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat menyimpan data')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus supplier "${name}"?`)) return
    
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
      const json = await res.json()
      
      if (json.success) {
        toast.success(json.message)
        fetchSuppliers()
      } else {
        toast.error(json.message)
      }
    } catch (err) {
      toast.error('Gagal menghapus supplier')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Supplier</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Kelola data pemasok barang perusahaan Anda
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          Tambah Supplier
        </button>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Cari kode atau nama supplier..." 
              className="input pl-10" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
             <div className="py-10 text-center text-sm text-gray-500">Memuat data...</div>
          ) : suppliers.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Truck size={48} className="mx-auto mb-4 opacity-20" />
              <p>Belum ada data supplier</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Supplier</th>
                  <th>Telepon</th>
                  <th>Email</th>
                  <th>NPWP / Tax ID</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="font-medium">{supplier.code}</td>
                    <td className="font-semibold text-gray-800 dark:text-gray-200">{supplier.name}</td>
                    <td>{supplier.phone || '-'}</td>
                    <td>{supplier.email || '-'}</td>
                    <td>{supplier.taxId || '-'}</td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          className="btn btn-ghost btn-sm text-blue-600"
                          onClick={() => handleOpenModal(supplier)}
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(supplier.id, supplier.name)}
                          title="Hapus"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
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

      {/* Form Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content max-w-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white">
              {editingId ? 'Edit Supplier' : 'Tambah Supplier Baru'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Kode Supplier *</label>
                  <input 
                    type="text" 
                    className="input" 
                    required
                    placeholder="Contoh: SUP-001"
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    disabled={!!editingId} // Tidak bisa edit kode
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Nama Supplier *</label>
                  <input 
                    type="text" 
                    className="input" 
                    required
                    placeholder="Nama lengkap perusahaan"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
                  <input 
                    type="email" 
                    className="input" 
                    placeholder="email@perusahaan.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Telepon / WhatsApp</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="08123456789"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Alamat Lengkap</label>
                <textarea 
                  className="input min-h-[80px] py-2" 
                  placeholder="Alamat kantor atau gudang supplier"
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">NPWP / Tax ID</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Nomor NPWP"
                  value={formData.taxId}
                  onChange={e => setFormData({...formData, taxId: e.target.value})}
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-8 pt-4 border-t dark:border-slate-700">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
