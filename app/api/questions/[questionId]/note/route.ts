import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getAuthenticatedUser(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value
  if (!sessionToken) {
    return null
  }

  return getUserFromSession(sessionToken)
}

function parseQuestionId(questionIdParam: string) {
  const questionId = Number(questionIdParam)
  return Number.isInteger(questionId) && questionId > 0 ? questionId : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    const questionId = parseQuestionId(params.questionId)
    if (!questionId) {
      return NextResponse.json(
        { success: false, message: 'Invalid question ID' },
        { status: 400 }
      )
    }

    const note = await prisma.userQuestionNote.findUnique({
      where: {
        user_id_question_id: {
          user_id: user.id,
          question_id: questionId,
        },
      },
      select: {
        content: true,
        updated_at: true,
      },
    })

    return NextResponse.json({
      success: true,
      note: note
        ? {
            content: note.content,
            updated_at: note.updated_at,
          }
        : null,
    })
  } catch (error) {
    console.error('[question note GET] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load note' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user?.id) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    const questionId = parseQuestionId(params.questionId)
    if (!questionId) {
      return NextResponse.json(
        { success: false, message: 'Invalid question ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const content = typeof body.content === 'string' ? body.content.trim() : ''

    if (content.length > 5000) {
      return NextResponse.json(
        { success: false, message: 'Note is too long' },
        { status: 400 }
      )
    }

    if (!content) {
      await prisma.userQuestionNote.deleteMany({
        where: {
          user_id: user.id,
          question_id: questionId,
        },
      })

      return NextResponse.json({
        success: true,
        note: null,
      })
    }

    const note = await prisma.userQuestionNote.upsert({
      where: {
        user_id_question_id: {
          user_id: user.id,
          question_id: questionId,
        },
      },
      create: {
        user_id: user.id,
        question_id: questionId,
        content,
      },
      update: {
        content,
      },
      select: {
        content: true,
        updated_at: true,
      },
    })

    return NextResponse.json({
      success: true,
      note,
    })
  } catch (error) {
    console.error('[question note PUT] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to save note' },
      { status: 500 }
    )
  }
}
