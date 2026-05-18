'use client'

import Link from 'next/link'
import { BookOpen, DollarSign, ArrowRight } from 'lucide-react'

const modules = [
  {
    title: 'Chart of Accounts',
    desc: 'Kelola daftar akun (COA) perusahaan',
    href: '/akuntansi/akun',
    icon: DollarSign,
    color: 'bg-emerald-500',
  },
  {
    title: 'Jurnal Umum',
    desc: 'Buat dan lihat entri jurnal akuntansi',
    href: '/akuntansi/jurnal',
    icon: BookOpen,
    color: 'bg-blue-500',
  },
]

export default function AkuntansiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Akuntansi</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Modul keuangan dan pembukuan perusahaan
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {modules.map((m) => {
          const Icon = m.icon
          return (
            <Link
              key={m.href}
              href={m.href}
              className="card p-6 flex items-start gap-4 hover:shadow-md transition-shadow group"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 ${m.color}`}>
                <Icon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                  {m.title}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{m.desc}</p>
              </div>
              <ArrowRight size={20} className="text-gray-400 group-hover:text-blue-600 shrink-0 mt-1" />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
