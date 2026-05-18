'use client'

import Link from 'next/link'
import { useAuthStore } from '@/stores/auth-store'
import { useCompanyStore } from '@/stores/company-store'
import { Settings, Building2, Users, User } from 'lucide-react'

const links = [
  { href: '/perusahaan', label: 'Data Perusahaan', desc: 'Edit profil dan informasi perusahaan', icon: Building2 },
  { href: '/pengguna', label: 'Manajemen Pengguna', desc: 'Kelola anggota tim dan peran akses', icon: Users },
]

export default function PengaturanPage() {
  const { user } = useAuthStore()
  const { activeCompany, companies } = useCompanyStore()
  const role = companies.find((c) => c.company.id === activeCompany?.id)?.role

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
          <Settings size={28} /> Pengaturan
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Profil dan konfigurasi akun</p>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
            <User size={28} />
          </div>
          <div>
            <p className="font-semibold text-lg">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            {activeCompany && (
              <p className="text-xs text-gray-400 mt-1">
                {activeCompany.name} · {role?.displayName || 'Pengguna'}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Administrasi</h2>
        {links.map((l) => {
          const Icon = l.icon
          return (
            <Link key={l.href} href={l.href} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                <Icon size={20} />
              </div>
              <div>
                <p className="font-medium">{l.label}</p>
                <p className="text-sm text-gray-500">{l.desc}</p>
              </div>
            </Link>
          )
        })}
      </div>

      <div className="card p-4 text-sm text-gray-500">
        <p>Tema gelap/terang dapat diubah melalui ikon di header atas.</p>
      </div>
    </div>
  )
}
