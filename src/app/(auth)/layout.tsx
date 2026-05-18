import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Masuk - ERP Indonesia',
  description: 'Masuk ke sistem ERP Indonesia',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
