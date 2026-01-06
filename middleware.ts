/**
 * Next.js Middleware
 * 
 * Handles authentication for protected routes
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken } from '@/lib/auth/session'

// Routes that require authentication
const protectedRoutes = ['/questions', '/dashboard', '/wrong-book', '/api/progress', '/api/chat']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // Get session token from cookie
  const sessionToken = request.cookies.get('session_token')?.value

  if (!sessionToken) {
    // Redirect to login if accessing protected route
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verify token
  const payload = verifySessionToken(sessionToken)

  if (!payload) {
    // Invalid token, clear cookie and redirect
    const response = pathname.startsWith('/api/')
      ? NextResponse.json(
          { success: false, message: 'Invalid session' },
          { status: 401 }
        )
      : NextResponse.redirect(new URL('/login', request.url))

    response.cookies.delete('session_token')
    return response
  }

  // Add user ID to request headers for API routes
  if (pathname.startsWith('/api/')) {
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
    /*
     * Only match routes that require authentication
     * 
     * IMPORTANT: Next.js middleware matcher rule:
     * - If a path is NOT matched by matcher, Next.js treats it as non-existent → 404
     * - Negative lookahead regex excludes paths, and cannot be "added back" with another matcher
     * - Solution: Only list routes that NEED middleware, let others pass through naturally
     */
    '/questions/:path*',
    '/dashboard/:path*',
    '/wrong-book/:path*',
    '/api/progress/:path*',
    '/api/chat/:path*',
  ],
}

