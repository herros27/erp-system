'use client'

import { useState, useEffect } from 'react'
import { useCompanyStore } from '@/stores/company-store'
import { Plus, Search, Edit, Trash2, Layers } from 'lucide-react'
import { toast } from 'sonner'

export default function KategoriPage() {
  const { activeCompany } = useCompanyStore()
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '' })

  useEffect(() => {
    if (!activeCompany) return
    const t = setTimeout(fetchData, 300)
    return () => clearTimeout(t)
  }, [activeCompany, search])

  const fetchData = async () => {
    setLoading(true)
    try {
      const url = new URL('/api/categories', window.location.origin)
      if (search) url.searchParams.set('search', search)
      url.searchParams.set('limit', '100')
      const res = await fetch(url.toString())
      const json = await res.json()
      if (json.success) setItems(json.data)
    } catch {
      toast.error('Gagal memuat kategori')
    } finally {
      setLoading(false)
    }
  }

  const openModal = (item?: any) => {
    if (item) {
      setEditingId(item.id)
      setForm({ name: item.name, description: item.description || '' })
    } else {
      setEditingId(null)
      setForm({ name: '', description: '' })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const url = editingId ? `/api/categories/${editingId}` : '/api/categories'
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setIsModalOpen(false)
        fetchData()
      } else toast.error(json.message)
    } catch {
      toast.error('Gagal menyimpan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus kategori "${name}"?`)) return
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      toast.success(json.message)
      fetchData()
    } else toast.error(json.message)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Kategori Produk</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Kelola kategori untuk pengelompokan produk</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Tambah Kategori
        </button>
      </div>

      <div className="card p-5">
        <div className="relative flex-1 max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" className="input pl-10" placeholder="Cari kategori..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Memuat data...</div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Layers size={48} className="mx-auto mb-4 opacity-20" />
            <p>Belum ada kategori</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Nama</th><th>Deskripsi</th><th className="text-right">Aksi</th></tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td className="text-gray-500">{c.description || '-'}</td>
                  <td className="text-right">
                    <button className="btn btn-ghost btn-sm text-blue-600 mr-2" onClick={() => openModal(c)}><Edit size={16} /></button>
                    <button className="btn btn-ghost btn-sm text-red-600" onClick={() => handleDelete(c.id, c.name)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">{editingId ? 'Edit Kategori' : 'Tambah Kategori'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nama Kategori</label>
                <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deskripsi</label>
                <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
