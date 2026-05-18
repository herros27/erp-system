import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getUserPermissions } from '@/lib/rbac'

export async function GET() {
  try {
    const payload = await getCurrentUser()
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Tidak terautentikasi' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        userCompanies: {
          include: { company: true, role: true },
          orderBy: { isDefault: 'desc' },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ success: false, message: 'Pengguna tidak ditemukan' }, { status: 404 })
    }

    const activeCompanyId = payload.activeCompanyId || user.userCompanies[0]?.company.id
    const permissions = activeCompanyId ? await getUserPermissions(user.id, activeCompanyId) : []
    const activeUC = user.userCompanies.find(uc => uc.company.id === activeCompanyId)

    return NextResponse.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar },
        activeCompany: activeUC ? {
          id: activeUC.company.id,
          name: activeUC.company.name,
          code: activeUC.company.code,
          logo: activeUC.company.logo,
          currency: activeUC.company.currency,
          address: activeUC.company.address,
          email: activeUC.company.email,
          phone: activeUC.company.phone,
        } : null,
        role: activeUC ? {
          id: activeUC.role.id,
          name: activeUC.role.name,
          displayName: activeUC.role.displayName,
        } : null,
        companies: user.userCompanies.map(uc => ({
          company: {
            id: uc.company.id,
            name: uc.company.name,
            code: uc.company.code,
            logo: uc.company.logo,
            currency: uc.company.currency,
            address: uc.company.address,
            email: uc.company.email,
            phone: uc.company.phone,
          },
          role: { id: uc.role.id, name: uc.role.name, displayName: uc.role.displayName },
          isDefault: uc.isDefault,
        })),
        permissions,
      },
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
