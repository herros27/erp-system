import prisma from '@/lib/prisma'
import { errorResponse, successResponse, notFoundResponse } from '@/lib/api-response'
import { createAuditLog } from '@/lib/audit'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = request.headers.get('x-user-id')
  if (!userId) return errorResponse('Tidak terautentikasi', 401)

  const access = await prisma.userCompany.findUnique({
    where: { userId_companyId: { userId, companyId: id } },
  })
  if (!access) return errorResponse('Akses ditolak', 403)

  const company = await prisma.company.findUnique({ where: { id } })
  if (!company) return notFoundResponse('Perusahaan tidak ditemukan')
  return successResponse(company)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = request.headers.get('x-user-id')
  if (!userId) return errorResponse('Tidak terautentikasi', 401)

  const access = await prisma.userCompany.findUnique({
    where: { userId_companyId: { userId, companyId: id } },
    include: { role: true },
  })
  if (!access) return errorResponse('Akses ditolak', 403)

  const body = await request.json()
  const company = await prisma.company.update({
    where: { id },
    data: {
      name: body.name,
      address: body.address,
      email: body.email,
      phone: body.phone,
      taxId: body.taxId,
      logo: body.logo,
      currency: body.currency,
      timezone: body.timezone,
    },
  })

  await createAuditLog({
    companyId: id,
    userId,
    module: 'perusahaan',
    action: 'update',
    referenceId: id,
    newValues: { name: company.name },
  })

  return successResponse(company, 'Data perusahaan berhasil diperbarui')
}
