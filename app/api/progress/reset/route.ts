/**
 * POST /api/progress/reset
 *
 * Reset learning progress for the current logged-in user
 * 
 * Rules:
 * - userId MUST come from session
 * - Reject request if not authenticated
 * - ONLY affect current user's data
 * 
 * Reset behavior:
 * - Delete all UserProgress rows for this user
 * - Delete all WrongBook rows for this user
 * - Delete all QuestionChat rows for this user
 * - Reset User.current_index and User.current_answers to null
 * 
 * DO NOT:
 * - Touch Question table
 * - Affect other users
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Get session
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Extract userId from session
    const user = await getUserFromSession(sessionToken)

    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      )
    }

    const userId = user.id

    // Use transaction for safety
    await prisma.$transaction([
      // Delete all UserProgress rows for this user
      prisma.userProgress.deleteMany({
        where: { user_id: userId },
      }),
      // Delete all WrongBook rows for this user
      prisma.wrongBook.deleteMany({
        where: { user_id: userId },
      }),
      // Delete all QuestionChat rows for this user
      prisma.questionChat.deleteMany({
        where: { user_id: userId },
      }),
      // Reset User.current_index and User.current_answers to null
      prisma.user.update({
        where: { id: userId },
        data: {
          current_index: null,
          current_answers: Prisma.JsonNull,
        },
      }),
    ])

    // Log the reset
    console.log('USER PROGRESS RESET', userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[progress/reset] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to reset progress' },
      { status: 500 }
    )
  }
}

