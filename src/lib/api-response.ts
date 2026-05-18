import { NextResponse } from 'next/server'

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string[]>
  meta?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function successResponse<T>(data: T, message = 'Berhasil', status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, message, data },
    { status }
  )
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message = 'Berhasil'
) {
  return NextResponse.json<ApiResponse<T[]>>(
    {
      success: true,
      message,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    { status: 200 }
  )
}

export function errorResponse(message: string, status = 400, errors?: Record<string, string[]>) {
  return NextResponse.json<ApiResponse>(
    { success: false, message, errors },
    { status }
  )
}

export function unauthorizedResponse(message = 'Anda tidak memiliki akses') {
  return NextResponse.json<ApiResponse>(
    { success: false, message },
    { status: 401 }
  )
}

export function forbiddenResponse(message = 'Akses ditolak') {
  return NextResponse.json<ApiResponse>(
    { success: false, message },
    { status: 403 }
  )
}

export function notFoundResponse(message = 'Data tidak ditemukan') {
  return NextResponse.json<ApiResponse>(
    { success: false, message },
    { status: 404 }
  )
}

export function getSearchParams(request: Request) {
  const { searchParams } = new URL(request.url)
  return {
    page: Math.max(1, parseInt(searchParams.get('page') || '1')),
    limit: Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10'))),
    search: searchParams.get('search') || '',
    sortBy: searchParams.get('sortBy') || 'createdAt',
    sortOrder: (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc',
    status: searchParams.get('status') || '',
  }
}
