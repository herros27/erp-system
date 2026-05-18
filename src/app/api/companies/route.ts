import prisma from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-response'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  const payload = await getCurrentUser()
  if (!payload) return errorResponse('Tidak terautentikasi', 401)

  const userCompanies = await prisma.userCompany.findMany({
    where: { userId: payload.userId },
    include: { company: true, role: true },
    orderBy: { isDefault: 'desc' },
  })

  return successResponse(
    userCompanies.map((uc) => ({
      ...uc.company,
      role: uc.role,
      isDefault: uc.isDefault,
    }))
  )
}
