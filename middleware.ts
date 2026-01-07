/**
 * Next.js Middleware
 * 
 * Handles authentication for protected routes
 * 
 * IMPORTANT: Cookie name must match exactly: 'session_token'
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken } from '@/lib/auth/session'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // DEBUG: Log all cookies for protected routes
  const allCookies = request.cookies.getAll()
  const cookieNames = allCookies.map(c => c.name)

  // Only protect /questions and related routes
  // Do NOT run on /login, /api/auth/*, or /auth/verify
  if (pathname.startsWith('/questions')) {
    // DEBUG: Log cookie check
    console.log('[MIDDLEWARE] Checking /questions:', {
      pathname,
      allCookies: cookieNames,
      hasSessionToken: cookieNames.includes('session_token'),
    })

    // Get session token from cookie (EXACT name: 'session_token')
    const sessionCookie = request.cookies.get('session_token')
    const sessionToken = sessionCookie?.value

    // DEBUG: Log session token presence
    console.log('[MIDDLEWARE] Session token check:', {
      cookieExists: !!sessionCookie,
      tokenExists: !!sessionToken,
      tokenLength: sessionToken?.length || 0,
      tokenPrefix: sessionToken ? sessionToken.substring(0, 20) + '...' : 'NONE',
    })

    if (!sessionToken) {
      // DEBUG: Log missing token
      console.log('[MIDDLEWARE] ❌ No session token - redirecting to login')
      // No session cookie - redirect to login
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Verify JWT token
    const payload = verifySessionToken(sessionToken)

    // DEBUG: Log verification result
    console.log('[MIDDLEWARE] Session verification:', {
      isValid: !!payload,
      userId: payload?.userId || 'NONE',
      email: payload?.email || 'NONE',
    })

    if (!payload) {
      // DEBUG: Log invalid token
      console.log('[MIDDLEWARE] ❌ Invalid session token - clearing and redirecting')
      // Invalid token - clear cookie and redirect
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('session_token')
      return response
    }

    // DEBUG: Log success
    console.log('[MIDDLEWARE] ✅ Valid session - allowing access to', pathname)

    // Valid session - allow access
    return NextResponse.next()
  }

  // Protect API routes that require authentication
  if (
    pathname.startsWith('/api/progress') ||
    pathname.startsWith('/api/chat') ||
    pathname.startsWith('/api/dashboard') ||
    pathname.startsWith('/api/wrong-book') ||
    pathname.startsWith('/api/questions') ||
    pathname.startsWith('/api/review')
  ) {
    // Get session token from cookie
    const sessionCookie = request.cookies.get('session_token')
    const sessionToken = sessionCookie?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify token
    const payload = verifySessionToken(sessionToken)

    if (!payload) {
      const response = NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      )
      response.cookies.delete('session_token')
      return response
    }

    // Add user ID to request headers for API routes
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.userId)
    requestHeaders.set('x-user-email', payload.email)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  // Allow all other routes (login, auth/verify, etc.)
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

