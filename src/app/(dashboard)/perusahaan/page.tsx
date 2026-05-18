'use client'

import { useState, useEffect } from 'react'
import { useCompanyStore } from '@/stores/company-store'
import { Building2 } from 'lucide-react'
import { toast } from 'sonner'

export default function PerusahaanPage() {
  const { activeCompany, setActiveCompany } = useCompanyStore()
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    code: '',
    address: '',
    email: '',
    phone: '',
    taxId: '',
    currency: 'IDR',
    timezone: 'Asia/Jakarta',
  })

  useEffect(() => {
    if (!activeCompany?.id) return
    fetchCompany()
  }, [activeCompany?.id])

  const fetchCompany = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/companies/${activeCompany!.id}`)
      const json = await res.json()
      if (json.success) {
        setForm({
          name: json.data.name || '',
          code: json.data.code || '',
          address: json.data.address || '',
          email: json.data.email || '',
          phone: json.data.phone || '',
          taxId: json.data.taxId || '',
          currency: json.data.currency || 'IDR',
          timezone: json.data.timezone || 'Asia/Jakarta',
        })
      }
    } catch {
      toast.error('Gagal memuat data perusahaan')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeCompany) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/companies/${activeCompany.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setActiveCompany({
          ...activeCompany!,
          name: json.data.name,
          code: json.data.code,
          address: json.data.address,
          email: json.data.email,
          phone: json.data.phone,
        })
      } else toast.error(json.message)
    } catch {
      toast.error('Gagal menyimpan')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-gray-500">Memuat data perusahaan...</div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Building2 size={28} /> Data Perusahaan
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Kelola profil perusahaan aktif: {activeCompany?.name}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Kode</label>
            <input className="input bg-gray-50" value={form.code} disabled />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mata Uang</label>
            <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
              <option value="IDR">IDR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Nama Perusahaan</label>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Alamat</label>
          <textarea className="input" rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Telepon</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">NPWP</label>
          <input className="input" value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} />
        </div>
        <div className="flex justify-end pt-4">
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  )
}
