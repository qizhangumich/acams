import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function normalizeTag(tag: string) {
  return tag.trim().replace(/\s+/g, ' ').toUpperCase()
}

async function getAuthenticatedUser(request: NextRequest) {
  const sessionToken = request.cookies.get('session_token')?.value
  if (!sessionToken) {
    return null
  }

  return getUserFromSession(sessionToken)
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

    const questionId = Number(params.questionId)
    if (!Number.isInteger(questionId) || questionId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid question ID' },
        { status: 400 }
      )
    }

    const tags = await prisma.userQuestionTag.findMany({
      where: {
        user_id: user.id,
        question_id: questionId,
      },
      select: {
        tag: true,
      },
      orderBy: {
        tag: 'asc',
      },
    })

    return NextResponse.json({
      success: true,
      tags: tags.map((item) => item.tag),
    })
  } catch (error) {
    console.error('[question tags GET] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load tags' },
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

    const questionId = Number(params.questionId)
    if (!Number.isInteger(questionId) || questionId <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid question ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const tags: string[] = Array.isArray(body.tags)
      ? Array.from<string>(
          new Set(
            body.tags
              .filter((tag: unknown): tag is string => typeof tag === 'string')
              .map(normalizeTag)
              .filter(Boolean)
          )
        ).slice(0, 20)
      : []

    await prisma.$transaction([
      prisma.userQuestionTag.deleteMany({
        where: {
          user_id: user.id,
          question_id: questionId,
        },
      }),
      ...tags.map((tag) =>
        prisma.userQuestionTag.create({
          data: {
            user_id: user.id,
            question_id: questionId,
            tag,
          },
        })
      ),
    ])

    return NextResponse.json({
      success: true,
      tags,
    })
  } catch (error) {
    console.error('[question tags PUT] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to save tags' },
      { status: 500 }
    )
  }
}
