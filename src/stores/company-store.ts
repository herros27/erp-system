import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Company {
  id: string
  name: string
  code: string
  logo?: string
  currency: string
  address?: string
  email?: string
  phone?: string
}

interface UserCompanyRole {
  company: Company
  role: {
    id: string
    name: string
    displayName: string
  }
  isDefault: boolean
}

interface CompanyState {
  activeCompany: Company | null
  companies: UserCompanyRole[]
  permissions: string[]
  setActiveCompany: (company: Company) => void
  setCompanies: (companies: UserCompanyRole[]) => void
  setPermissions: (permissions: string[]) => void
  clearCompany: () => void
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
      activeCompany: null,
      companies: [],
      permissions: [],
      setActiveCompany: (company) => set({ activeCompany: company }),
      setCompanies: (companies) => set({ companies }),
      setPermissions: (permissions) => set({ permissions }),
      clearCompany: () => set({ activeCompany: null, companies: [], permissions: [] }),
    }),
    { name: 'company-storage' }
  )
)
