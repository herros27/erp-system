import prisma from '@/lib/prisma'
import { errorResponse, successResponse } from '@/lib/api-response'

export async function GET(request: Request) {
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId || !userId) return errorResponse('Tidak terautentikasi', 400)

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get('unread') === 'true'

  const notifications = await prisma.notification.findMany({
    where: {
      companyId,
      userId,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  const unreadCount = await prisma.notification.count({
    where: { companyId, userId, isRead: false },
  })

  return successResponse({ notifications, unreadCount })
}

export async function PUT(request: Request) {
  const companyId = request.headers.get('x-company-id')
  const userId = request.headers.get('x-user-id')
  if (!companyId || !userId) return errorResponse('Tidak terautentikasi', 400)

  const body = await request.json()
  if (body.markAllRead) {
    await prisma.notification.updateMany({
      where: { companyId, userId, isRead: false },
      data: { isRead: true },
    })
    return successResponse(null, 'Semua notifikasi ditandai dibaca')
  }

  if (body.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, companyId, userId },
      data: { isRead: true },
    })
    return successResponse(null, 'Notifikasi ditandai dibaca')
  }

  return errorResponse('Permintaan tidak valid')
}
