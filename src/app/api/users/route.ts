import prisma from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-response'
import * as bcrypt from 'bcryptjs'
import { createAuditLog } from '@/lib/audit'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

  const members = await prisma.userCompany.findMany({
    where: { companyId },
    include: {
      user: { select: { id: true, name: true, email: true, status: true, createdAt: true } },
      role: { select: { id: true, name: true, displayName: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return successResponse(
    members.map((m) => ({
      id: m.user.id,
      userCompanyId: m.id,
      name: m.user.name,
      email: m.user.email,
      status: m.user.status,
      role: m.role,
      isDefault: m.isDefault,
      joinedAt: m.createdAt,
    }))
  )
}

export async function POST(request: Request) {
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId) return errorResponse('Perusahaan tidak dipilih', 400)

  const body = await request.json()
  const { name, email, password, roleId } = body
  if (!name || !email || !password || !roleId) {
    return errorResponse('Nama, email, password, dan role wajib diisi')
  }

  const role = await prisma.role.findUnique({ where: { id: roleId } })
  if (!role) return errorResponse('Role tidak ditemukan')

  let user = await prisma.user.findUnique({ where: { email: email.trim() } })
  if (!user) {
    const hashed = await bcrypt.hash(password, 12)
    user = await prisma.user.create({
      data: { name, email: email.trim(), password: hashed },
    })
  }

  const existing = await prisma.userCompany.findUnique({
    where: { userId_companyId: { userId: user.id, companyId } },
  })
  if (existing) return errorResponse('Pengguna sudah terdaftar di perusahaan ini')

  const uc = await prisma.userCompany.create({
    data: { userId: user.id, companyId, roleId },
    include: { user: true, role: true },
  })

  if (userId) {
    await createAuditLog({
      companyId,
      userId,
      module: 'pengguna',
      action: 'invite',
      referenceId: user.id,
      newValues: { email: user.email, role: role.displayName },
    })
  }

  return successResponse(uc, 'Pengguna berhasil ditambahkan ke perusahaan', 201)
}
