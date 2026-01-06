/**
 * Login Layout
 * 
 * Disables caching for login page to prevent stale HTML after authentication
 */

import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Force dynamic rendering - no caching
  return <>{children}</>
}

