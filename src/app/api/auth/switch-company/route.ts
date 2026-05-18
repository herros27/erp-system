import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getCurrentUser, generateAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/auth'
import { getUserPermissions } from '@/lib/rbac'

export async function POST(request: Request) {
  try {
    const payload = await getCurrentUser()
    if (!payload) {
      return NextResponse.json({ success: false, message: 'Tidak terautentikasi' }, { status: 401 })
    }

    const body = await request.json()
    const { companyId } = body

    if (!companyId) {
      return NextResponse.json({ success: false, message: 'ID perusahaan wajib diisi' }, { status: 400 })
    }

    // Verify user has access to this company
    const userCompany = await prisma.userCompany.findUnique({
      where: { userId_companyId: { userId: payload.userId, companyId } },
      include: { company: true, role: true },
    })

    if (!userCompany) {
      return NextResponse.json({ success: false, message: 'Anda tidak memiliki akses ke perusahaan ini' }, { status: 403 })
    }

    const permissions = await getUserPermissions(payload.userId, companyId)

    // Generate new tokens with updated company
    const tokenPayload = {
      userId: payload.userId,
      email: payload.email,
      activeCompanyId: companyId,
    }

    const accessToken = await generateAccessToken(tokenPayload)
    const refreshToken = await generateRefreshToken(tokenPayload)
    await setAuthCookies(accessToken, refreshToken)

    return NextResponse.json({
      success: true,
      message: 'Perusahaan berhasil diganti',
      data: {
        activeCompany: {
          id: userCompany.company.id,
          name: userCompany.company.name,
          code: userCompany.company.code,
          logo: userCompany.company.logo,
          currency: userCompany.company.currency,
          address: userCompany.company.address,
          email: userCompany.company.email,
          phone: userCompany.company.phone,
        },
        role: {
          id: userCompany.role.id,
          name: userCompany.role.name,
          displayName: userCompany.role.displayName,
        },
        permissions,
      },
    })
  } catch (error) {
    console.error('Switch company error:', error)
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan server' }, { status: 500 })
  }
}
