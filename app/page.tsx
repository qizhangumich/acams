/**
 * Root Page
 * 
 * Redirects to login page using server-side redirect
 */

import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/login')
}

