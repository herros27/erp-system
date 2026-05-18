'use client'

import { useState, useEffect } from 'react'
import { useCompanyStore } from '@/stores/company-store'
import { formatDateTime } from '@/lib/utils'
import { Search, History, Eye } from 'lucide-react'
import { toast } from 'sonner'

export default function AuditPage() {
  const { activeCompany } = useCompanyStore()
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    if (!activeCompany) return
    const t = setTimeout(fetchLogs, 300)
    return () => clearTimeout(t)
  }, [activeCompany, search])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const url = new URL('/api/audit', window.location.origin)
      if (search) url.searchParams.set('search', search)
      url.searchParams.set('limit', '50')
      const res = await fetch(url.toString())
      const json = await res.json()
      if (json.success) setLogs(json.data)
    } catch {
      toast.error('Gagal memuat audit trail')
    } finally {
      setLoading(false)
    }
  }

  const parseJson = (val: string | null) => {
    if (!val) return null
    try {
      return JSON.parse(val)
    } catch {
      return val
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Audit Trail</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Riwayat aktivitas pengguna di sistem</p>
      </div>

      <div className="card p-5">
        <div className="relative flex-1 max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input className="input pl-10" placeholder="Cari modul, aksi, atau pengguna..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? (
          <div className="py-10 text-center text-sm text-gray-500">Memuat...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <History size={48} className="mx-auto mb-4 opacity-20" />
            <p>Belum ada log audit</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Pengguna</th>
                <th>Modul</th>
                <th>Aksi</th>
                <th>Referensi</th>
                <th className="text-right">Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="text-sm whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                  <td>{log.user?.name}</td>
                  <td><span className="badge badge-neutral">{log.module}</span></td>
                  <td>{log.action}</td>
                  <td className="text-xs text-gray-500 font-mono">{log.referenceId?.slice(0, 8) || '-'}</td>
                  <td className="text-right">
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelected(log)}>
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Detail Audit Log</h2>
            <div className="space-y-3 text-sm">
              <p><strong>Waktu:</strong> {formatDateTime(selected.createdAt)}</p>
              <p><strong>Pengguna:</strong> {selected.user?.name} ({selected.user?.email})</p>
              <p><strong>Modul / Aksi:</strong> {selected.module} / {selected.action}</p>
              {selected.oldValues && (
                <div>
                  <strong>Nilai Lama:</strong>
                  <pre className="mt-1 p-3 bg-gray-100 dark:bg-slate-800 rounded-lg text-xs overflow-auto max-h-32">
                    {JSON.stringify(parseJson(selected.oldValues), null, 2)}
                  </pre>
                </div>
              )}
              {selected.newValues && (
                <div>
                  <strong>Nilai Baru:</strong>
                  <pre className="mt-1 p-3 bg-gray-100 dark:bg-slate-800 rounded-lg text-xs overflow-auto max-h-32">
                    {JSON.stringify(parseJson(selected.newValues), null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
