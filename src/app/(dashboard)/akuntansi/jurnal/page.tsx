'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useCompanyStore } from '@/stores/company-store'
import { formatRupiah, formatDate } from '@/lib/utils'
import { Plus, Search, BookOpen, ChevronLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type JournalEntry = { accountId: string; debit: number; credit: number; description: string }

export default function JurnalPage() {
  const { activeCompany } = useCompanyStore()
  const [journals, setJournals] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
  })
  const [entries, setEntries] = useState<JournalEntry[]>([
    { accountId: '', debit: 0, credit: 0, description: '' },
    { accountId: '', debit: 0, credit: 0, description: '' },
  ])

  useEffect(() => {
    if (!activeCompany) return
    fetchJournals()
    fetchAccounts()
  }, [activeCompany])

  const fetchJournals = async () => {
    setLoading(true)
    try {
      const url = new URL('/api/accounting/journals', window.location.origin)
      if (search) url.searchParams.set('search', search)
      url.searchParams.set('limit', '50')
      const res = await fetch(url.toString())
      const json = await res.json()
      if (json.success) setJournals(json.data)
    } catch {
      toast.error('Gagal memuat jurnal umum')
    } finally {
      setLoading(false)
    }
  }

  const fetchAccounts = async () => {
    const res = await fetch('/api/accounting/accounts')
    const json = await res.json()
    if (json.success) setAccounts(json.data.filter((a: any) => a.isActive))
  }

  useEffect(() => {
    if (!activeCompany) return
    const t = setTimeout(fetchJournals, 400)
    return () => clearTimeout(t)
  }, [search])

  const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0)
  const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      toast.error('Total debit dan kredit harus seimbang')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/accounting/journals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, entries }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.message)
        setIsModalOpen(false)
        fetchJournals()
      } else toast.error(json.message)
    } catch {
      toast.error('Gagal memposting jurnal')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link href="/akuntansi" className="text-sm text-blue-600 flex items-center gap-1 mb-2 hover:underline">
            <ChevronLeft size={16} /> Kembali ke Akuntansi
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Jurnal Umum</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Daftar entri jurnal akuntansi</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Buat Jurnal
        </button>
      </div>

      <div className="card p-5">
        <div className="relative flex-1 max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Cari nomor jurnal..." className="input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500">Memuat data...</div>
          ) : journals.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <BookOpen size={48} className="mx-auto mb-4 opacity-20" />
              <p>Belum ada entri jurnal</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Nomor</th>
                  <th>Keterangan</th>
                  <th>Akun</th>
                  <th className="text-right">Debit</th>
                  <th className="text-right">Kredit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {journals.map((journal) => (
                  <JournalRows key={journal.id} journal={journal} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">Buat Jurnal Baru</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tanggal</label>
                  <input type="date" className="input" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Referensi</label>
                  <input className="input" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Keterangan</label>
                <input className="input" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium">Baris Jurnal</label>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEntries([...entries, { accountId: '', debit: 0, credit: 0, description: '' }])}>+ Baris</button>
                </div>
                {entries.map((entry, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-center">
                    <select className="input col-span-5 py-1.5" required value={entry.accountId} onChange={(e) => {
                      const next = [...entries]; next[i].accountId = e.target.value; setEntries(next)
                    }}>
                      <option value="">Akun...</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                    </select>
                    <input type="number" className="input col-span-2 py-1.5" min={0} placeholder="Debit" value={entry.debit || ''} onChange={(e) => {
                      const next = [...entries]; next[i] = { ...next[i], debit: Number(e.target.value), credit: 0 }; setEntries(next)
                    }} />
                    <input type="number" className="input col-span-2 py-1.5" min={0} placeholder="Kredit" value={entry.credit || ''} onChange={(e) => {
                      const next = [...entries]; next[i] = { ...next[i], credit: Number(e.target.value), debit: 0 }; setEntries(next)
                    }} />
                    <button type="button" className="col-span-1 text-red-500" onClick={() => setEntries(entries.filter((_, j) => j !== i))} disabled={entries.length <= 2}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <p className={`text-sm mt-2 ${Math.abs(totalDebit - totalCredit) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                  Debit: {formatRupiah(totalDebit)} | Kredit: {formatRupiah(totalCredit)}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Memposting...' : 'Posting Jurnal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function JournalRows({ journal }: { journal: any }) {
  return (
    <>
      <tr className="bg-gray-50 dark:bg-gray-800/50">
        <td className="font-medium">{formatDate(journal.date)}</td>
        <td className="font-medium text-blue-600">{journal.number}</td>
        <td colSpan={2} className="font-medium">{journal.description}</td>
        <td className="text-right font-bold text-gray-400">-</td>
        <td className="text-right font-bold text-gray-400">-</td>
        <td>
          <span className={`badge ${journal.status === 'POSTED' ? 'badge-success' : 'badge-warning'}`}>{journal.status}</span>
        </td>
      </tr>
      {journal.entries?.map((entry: any) => (
        <tr key={entry.id} className="text-sm">
          <td colSpan={3}></td>
          <td className={entry.credit > 0 ? 'pl-8' : ''}>{entry.account?.code} - {entry.account?.name}</td>
          <td className="text-right">{entry.debit > 0 ? formatRupiah(entry.debit) : '-'}</td>
          <td className="text-right">{entry.credit > 0 ? formatRupiah(entry.credit) : '-'}</td>
          <td></td>
        </tr>
      ))}
      <tr className="border-b-2"><td colSpan={7}></td></tr>
    </>
  )
}
