/**
 * Root Layout
 * 
 * Provides the root HTML structure for the application
 */

import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ACAMS Learning System',
  description: 'ACAMS certification exam preparation with AI-powered explanations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

