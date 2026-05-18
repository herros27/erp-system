import prisma from '@/lib/prisma'

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'approve'

export const MODULES = [
  'dashboard',
  'produk',
  'kategori',
  'supplier',
  'pelanggan',
  'gudang',
  'satuan',
  'inventori',
  'pembelian',
  'penjualan',
  'akuntansi',
  'laporan',
  'persetujuan',
  'audit',
  'perusahaan',
  'pengguna',
] as const

export type Module = typeof MODULES[number]

export async function getUserPermissions(userId: string, companyId: string): Promise<string[]> {
  const userCompany = await prisma.userCompany.findUnique({
    where: { userId_companyId: { userId, companyId } },
    include: {
      role: {
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      }
    }
  })

  if (!userCompany) return []
  return userCompany.role.permissions.map(rp => rp.permission.name)
}

export async function hasPermission(
  userId: string,
  companyId: string,
  module: string,
  action: PermissionAction
): Promise<boolean> {
  const permissionName = `${module}.${action}`
  const permissions = await getUserPermissions(userId, companyId)
  return permissions.includes(permissionName) || permissions.includes('*')
}

export async function getUserRole(userId: string, companyId: string) {
  const userCompany = await prisma.userCompany.findUnique({
    where: { userId_companyId: { userId, companyId } },
    include: { role: true }
  })
  return userCompany?.role || null
}

export async function getUserCompanies(userId: string) {
  const userCompanies = await prisma.userCompany.findMany({
    where: { userId },
    include: {
      company: true,
      role: true,
    },
    orderBy: { isDefault: 'desc' }
  })
  return userCompanies
}

export function checkApiPermission(permissions: string[], module: string, action: PermissionAction): boolean {
  const permissionName = `${module}.${action}`
  return permissions.includes(permissionName) || permissions.includes('*')
}
