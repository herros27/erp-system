import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { comparePassword, generateAccessToken, generateRefreshToken, setAuthCookies } from '@/lib/auth'
import { getUserPermissions } from '@/lib/rbac'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body
    const cleanedEmail = email?.trim()

    if (!cleanedEmail || !password) {
      return NextResponse.json(
        { success: false, message: 'Email dan kata sandi wajib diisi' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanedEmail },
      include: {
        userCompanies: {
          include: {
            company: true,
            role: true,
          },
          orderBy: { isDefault: 'desc' },
        },
      },
    })

    if (!user || !user.status) {
      return NextResponse.json(
        { success: false, message: 'Email atau kata sandi salah' },
        { status: 401 }
      )
    }

    const isValid = await comparePassword(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'Email atau kata sandi salah' },
        { status: 401 }
      )
    }

    if (user.userCompanies.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Anda belum terdaftar di perusahaan manapun' },
        { status: 403 }
      )
    }

    // Use default company or first
    const defaultCompany = user.userCompanies.find(uc => uc.isDefault) || user.userCompanies[0]
    const activeCompanyId = defaultCompany.company.id

    const permissions = await getUserPermissions(user.id, activeCompanyId)

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      activeCompanyId,
    }

    const accessToken = await generateAccessToken(tokenPayload)
    const refreshToken = await generateRefreshToken(tokenPayload)

    await setAuthCookies(accessToken, refreshToken)

    return NextResponse.json({
      success: true,
      message: 'Login berhasil',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
        activeCompany: {
          id: defaultCompany.company.id,
          name: defaultCompany.company.name,
          code: defaultCompany.company.code,
          logo: defaultCompany.company.logo,
          currency: defaultCompany.company.currency,
          address: defaultCompany.company.address,
          email: defaultCompany.company.email,
          phone: defaultCompany.company.phone,
        },
        role: {
          id: defaultCompany.role.id,
          name: defaultCompany.role.name,
          displayName: defaultCompany.role.displayName,
        },
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
          role: {
            id: uc.role.id,
            name: uc.role.name,
            displayName: uc.role.displayName,
          },
          isDefault: uc.isDefault,
        })),
        permissions,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    )
  }
}
