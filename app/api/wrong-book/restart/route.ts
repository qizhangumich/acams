/**
 * POST /api/wrong-book/restart
 *
 * Start a new wrong-book round: clears the retested mark on every
 * wrong-book entry so the sequential pass covers all of them again.
 * Wrong counts, SRS cards, and progress are untouched.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/route-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireUser(request)
    if (error) return error

    const result = await prisma.wrongBook.updateMany({
      where: { user_id: user.id, retested_at: { not: null } },
      data: { retested_at: null },
    })

    return NextResponse.json({ success: true, reset: result.count })
  } catch (err) {
    console.error('[wrong-book/restart] Error:', err)
    return NextResponse.json({ success: false, message: 'Failed to restart round' }, { status: 500 })
  }
}
