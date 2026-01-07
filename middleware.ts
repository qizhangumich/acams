/**
 * Next.js Middleware
 * 
 * Handles authentication for protected routes
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/questions')) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)
    const sessionToken = sessionCookie?.value

    if (!sessionToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const payload = verifySessionToken(sessionToken)

    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete(SESSION_COOKIE_NAME)
      return response
    }

    return NextResponse.next()
  }

  if (
    pathname.startsWith('/api/progress') ||
    pathname.startsWith('/api/chat') ||
    pathname.startsWith('/api/dashboard') ||
    pathname.startsWith('/api/wrong-book') ||
    pathname.startsWith('/api/questions') ||
    pathname.startsWith('/api/review')
  ) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)
    const sessionToken = sessionCookie?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifySessionToken(sessionToken)

    if (!payload) {
      const response = NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      )
      response.cookies.delete(SESSION_COOKIE_NAME)
      return response
    }

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-user-email', payload.email)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/questions/:path*',
    '/dashboard/:path*',
    '/wrong-book/:path*',
    '/api/progress/:path*',
    '/api/chat/:path*',
    '/api/dashboard/:path*',
    '/api/wrong-book/:path*',
    '/api/questions/:path*',
    '/api/review/:path*',
  ],
}
