/**
 * POST /api/auth/send-magic-link
 * 
 * Send magic link email to user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createMagicLink } from '@/lib/auth/magic-link'
import { z } from 'zod'

const requestSchema = z.object({
  email: z.string().email('Invalid email format'),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = requestSchema.parse(body)

    const result = await createMagicLink(email)

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error sending magic link:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to send magic link' },
      { status: 500 }
    )
  }
}

