'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCompanyStore } from '@/stores/company-store'
import { formatRupiah } from '@/lib/utils'
import { Plus, Search, Edit, Trash2, ChevronLeft, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const

export default function AkunPage() {
  const { activeCompany } = useCompanyStore()
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'ASSET' as string,
    parentId: '',
    level: 1,
  })

  useEffect(() => {
    if (!activeCompany) return
    fetchAccounts()
  }, [activeCompany, search])

  const fetchAccounts = async () => {
    setLoading(true)
    try {
      const url = new URL('/api/accounting/accounts', window.location.origin)
      if (search) url.searchParams.set('search', search)
      const res = await fetch(url.toString())
      const json = await res.json()
      if (json.success) setAccounts(json.data)
    } catch {
      toast.error('Gagal memuat akun')
    } finally {
      setLoading(false)
    }
  }

  const openModal = (acc?: any) => {
    if (acc) {
      setEditingId(acc.id)
      setForm({ code: acc.code, name: acc.name, type: acc.type, parentId: acc.parentId || '', level: acc.level })
    } else {
      setEditingId(null)
      setForm({ code: '', name: '', type: 'ASSET', parentId: '', level: 1 })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const url = editingId ? `/api/accounting/accounts/${editingId}` : '/api/accounting/accounts'
      const method = editingId ? 'PUT' : 'POST'
      const body = editingId
        ? { name: form.name }
        : { ...form, parentId: form.parentId || null }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setIsModalOpen(false)
        fetchAccounts()
      } else toast.error(json.message)
    } catch {
      toast.error('Gagal menyimpan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus akun ini?')) return
    const res = await fetch(`/api/accounting/accounts/${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) {
      toast.success(json.message)
      fetchAccounts()
    } else toast.error(json.message)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/akuntansi" className="text-sm text-blue-600 flex items-center gap-1 mb-2 hover:underline">
            <ChevronLeft size={16} /> Kembali ke Akuntansi
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Chart of Accounts</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Daftar akun pembukuan</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Tambah Akun
        </button>
      </div>

      <div className="card p-5">
        <div className="relative flex-1 max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input className="input pl-10" placeholder="Cari kode atau nama akun..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Memuat...</div>
        ) : accounts.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <DollarSign size={48} className="mx-auto mb-4 opacity-20" />
            <p>Belum ada akun</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Akun</th>
                <th>Tipe</th>
                <th className="text-right">Saldo</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td className="font-mono text-blue-600">{a.code}</td>
                  <td style={{ paddingLeft: `${(a.level - 1) * 12}px` }}>{a.name}</td>
                  <td><span className="badge badge-neutral text-xs">{a.type}</span></td>
                  <td className="text-right font-medium">{formatRupiah(a.balance)}</td>
                  <td className="text-right">
                    <button className="btn btn-ghost btn-sm text-blue-600 mr-1" onClick={() => openModal(a)}><Edit size={16} /></button>
                    <button className="btn btn-ghost btn-sm text-red-600" onClick={() => handleDelete(a.id)}><Trash2 size={16} /></button>
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
            <h2 className="text-xl font-semibold mb-4">{editingId ? 'Edit Akun' : 'Tambah Akun'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingId && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Kode Akun</label>
                    <input className="input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipe</label>
                    <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Akun Induk (opsional)</label>
                    <select className="input" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
                      <option value="">— Tidak ada —</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Nama Akun</label>
                <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
