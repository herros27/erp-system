import prisma from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-response'

export async function GET() {
  const roles = await prisma.role.findMany({
    orderBy: { displayName: 'asc' },
    select: { id: true, name: true, displayName: true, description: true },
  })
  return successResponse(roles)
}
