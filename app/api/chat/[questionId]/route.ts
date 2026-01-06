/**
 * POST /api/chat/[questionId]
 * 
 * Send a chat message for a specific question
 * 
 * Scope: Strictly scoped to user + question
 * Side effects: Only writes to QuestionChat, no other models
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUserFromSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

const requestSchema = z.object({
  message: z.string().min(1).max(2000),
})

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // 30 seconds timeout

export async function POST(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    // 1. Authentication
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = await getUserFromSession(sessionToken)

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      )
    }

    // 2. Parse question ID (scope enforcement)
    const questionId = parseInt(params.questionId)

    if (isNaN(questionId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid question ID' },
        { status: 400 }
      )
    }

    // 3. Verify question exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        domain: true,
        question_text: true,
        options: true,
        correct_answers: true,
      },
    })

    if (!question) {
      return NextResponse.json(
        { success: false, message: 'Question not found' },
        { status: 404 }
      )
    }

    // 4. Parse request body
    const body = await request.json()
    const { message } = requestSchema.parse(body)

    // 5. Load chat history for this user + question (scope enforcement)
    const chatHistory = await prisma.questionChat.findMany({
      where: {
        user_id: user.id, // Scope: current user
        question_id: questionId, // Scope: current question
      },
      orderBy: {
        created_at: 'asc',
      },
      select: {
        role: true,
        content: true,
      },
    })

    // 6. Build system prompt (fixed and restrictive)
    const optionsText = question.options && typeof question.options === 'object' && !Array.isArray(question.options)
      ? Object.entries(question.options as Record<string, string>)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
      : 'No options available'

    const systemPrompt = `You are a helpful assistant for an Anti-Money Laundering (AML) exam preparation system.

You are helping a student understand a specific exam question. Your role is to:
1. Answer questions ONLY about the current question
2. Provide explanations that help understand the correct answer
3. Stay within the scope of AML/compliance knowledge
4. Do NOT provide answers directly - guide the student to understand

Current Question Context:
- Question ID: ${question.id}
- Domain: ${question.domain}
- Question: ${question.question_text}
- Options:
${optionsText}
- Correct Answer(s): ${question.correct_answers.join(', ')}

IMPORTANT RULES:
- You MUST only discuss the current question (Question ID: ${question.id})
- You MUST NOT discuss other questions
- You MUST NOT change or modify the question
- You MUST NOT provide direct answers without explanation
- You MUST stay within AML/compliance scope
- You MUST keep responses concise and focused`

    // 7. Build messages for OpenAI
    // Explicitly type the messages to ensure TypeScript knows only "system" | "user" | "assistant" are used
    const historyMessages: ChatCompletionMessageParam[] = chatHistory.map(
      (msg): ChatCompletionMessageParam => {
        if (msg.role === 'user') {
          return {
            role: 'user',
            content: msg.content,
          }
        } else {
          return {
            role: 'assistant',
            content: msg.content,
          }
        }
      }
    )

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...historyMessages,
      {
        role: 'user',
        content: message,
      },
    ]

    // 8. Call OpenAI (with error handling)
    if (!openai) {
      return NextResponse.json(
        { success: false, message: 'OpenAI API not configured' },
        { status: 500 }
      )
    }

    let aiResponse: string

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      })

      aiResponse = completion.choices[0]?.message?.content || 'No response from AI'

      if (!aiResponse || aiResponse.trim().length === 0) {
        throw new Error('Empty response from OpenAI')
      }
    } catch (error) {
      console.error('OpenAI API error:', error)

      // Return error without saving user message (maintain consistency)
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? `AI service error: ${error.message}`
              : 'Failed to get AI response. Please try again.',
        },
        { status: 500 }
      )
    }

    // 9. Save both messages in a transaction (append-only)
    await prisma.$transaction(async (tx) => {
      // Save user message
      await tx.questionChat.create({
        data: {
          user_id: user.id, // Scope: current user
          question_id: questionId, // Scope: current question
          role: 'user',
          content: message,
        },
      })

      // Save assistant message
      await tx.questionChat.create({
        data: {
          user_id: user.id, // Scope: current user
          question_id: questionId, // Scope: current question
          role: 'assistant',
          content: aiResponse,
        },
      })
    })

    // 10. Return success
    return NextResponse.json({
      success: true,
      message: aiResponse,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error in chat API:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/chat/[questionId]
 * 
 * Get chat history for a specific question
 * 
 * Scope: Strictly scoped to user + question
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { questionId: string } }
) {
  try {
    // 1. Authentication
    const sessionToken = request.cookies.get('session_token')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    const user = await getUserFromSession(sessionToken)

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      )
    }

    // 2. Parse question ID (scope enforcement)
    const questionId = parseInt(params.questionId)

    if (isNaN(questionId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid question ID' },
        { status: 400 }
      )
    }

    // 3. Load chat history (scope: user + question)
    const chatHistory = await prisma.questionChat.findMany({
      where: {
        user_id: user.id, // Scope: current user
        question_id: questionId, // Scope: current question
      },
      orderBy: {
        created_at: 'asc',
      },
      select: {
        id: true,
        role: true,
        content: true,
        created_at: true,
      },
    })

    return NextResponse.json({
      success: true,
      messages: chatHistory,
    })
  } catch (error) {
    console.error('Error loading chat history:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to load chat history' },
      { status: 500 }
    )
  }
}

