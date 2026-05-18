import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret')

const publicPaths = ['/login', '/api/auth/login', '/api/auth/refresh']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Allow static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next()
  }

  const accessToken = request.cookies.get('access_token')?.value

  if (!accessToken) {
    // For API routes, return 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, message: 'Tidak terautentikasi' }, { status: 401 })
    }
    // For pages, redirect to login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(accessToken, JWT_SECRET)
    
    // Add user info to headers for API routes
    const response = NextResponse.next()
    response.headers.set('x-user-id', payload.userId as string)
    response.headers.set('x-user-email', payload.email as string)
    if (payload.activeCompanyId) {
      response.headers.set('x-company-id', payload.activeCompanyId as string)
    }
    
    return response
  } catch {
    // Token expired, try refresh
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, message: 'Token kedaluwarsa' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
