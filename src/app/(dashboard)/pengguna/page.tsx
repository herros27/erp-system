'use client'

import { useState, useEffect } from 'react'
import { useCompanyStore } from '@/stores/company-store'
import { Plus, Users, Trash2, Edit } from 'lucide-react'
import { toast } from 'sonner'

export default function PenggunaPage() {
  const { activeCompany } = useCompanyStore()
  const [members, setMembers] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', roleId: '' })

  useEffect(() => {
    if (!activeCompany) return
    fetchData()
  }, [activeCompany])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [uRes, rRes] = await Promise.all([fetch('/api/users'), fetch('/api/roles')])
      const uJson = await uRes.json()
      const rJson = await rRes.json()
      if (uJson.success) setMembers(uJson.data)
      if (rJson.success) setRoles(rJson.data)
    } catch {
      toast.error('Gagal memuat data pengguna')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setIsModalOpen(false)
        setForm({ name: '', email: '', password: '', roleId: '' })
        fetchData()
      } else toast.error(json.message)
    } catch {
      toast.error('Gagal menambahkan pengguna')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRoleChange = async (userId: string, roleId: string) => {
    const res = await fetch(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleId }),
    })
    const json = await res.json()
    if (json.success) {
      toast.success(json.message)
      fetchData()
    } else toast.error(json.message)
  }

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Hapus "${name}" dari perusahaan ini?`)) return
    const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
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
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Manajemen Pengguna</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Anggota tim perusahaan {activeCompany?.name}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Tambah Pengguna
        </button>
      </div>

      <div className="card p-5">
        {loading ? (
          <div className="py-10 text-center text-gray-500">Memuat...</div>
        ) : members.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Users size={48} className="mx-auto mb-4 opacity-20" />
            <p>Belum ada pengguna</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="font-medium">{m.name}</td>
                  <td>{m.email}</td>
                  <td>
                    <select
                      className="input py-1 text-sm"
                      value={m.role?.id}
                      onChange={(e) => handleRoleChange(m.id, e.target.value)}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.displayName}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`badge ${m.status ? 'badge-success' : 'badge-danger'}`}>
                      {m.status ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button className="btn btn-ghost btn-sm text-red-600" onClick={() => handleRemove(m.id, m.name)}>
                      <Trash2 size={16} />
                    </button>
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
            <h2 className="text-xl font-semibold mb-4">Tambah Pengguna</h2>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nama</label>
                <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input type="password" className="input" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select className="input" required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
                  <option value="">Pilih role...</option>
                  {roles.map((r) => <option key={r.id} value={r.id}>{r.displayName}</option>)}
                </select>
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
