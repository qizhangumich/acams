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

    // BREAKPOINT B FIX: Extract userId ONLY from session
    const user = await getUserFromSession(sessionToken)

    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      )
    }

    // BREAKPOINT B FIX: Debug log
    const userId = user.id
    console.log('DB WRITE USER:', userId)

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

    // BREAKPOINT B FIX: Use userId from session (never from request body)
    // 5. Load chat history for this user + question (scope enforcement)
    const chatHistory = await prisma.questionChat.findMany({
      where: {
        user_id: userId, // Scope: current user (from session)
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

    // 6. Build system prompt
    const optionsText = question.options && typeof question.options === 'object' && !Array.isArray(question.options)
      ? Object.entries(question.options as Record<string, string>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
      : 'No options available'

    const systemPrompt = `You are a helpful assistant for an Anti-Money Laundering (AML) exam preparation system.

You are helping a student understand a specific exam question. Your role is to:
1. Answer questions about the current question and the AML/compliance concepts needed to understand it
2. Use broadly recognized AML/CFT, sanctions, KYC/CDD/EDD, FATF, Basel Committee, Wolfsberg, OFAC, FIU, SAR/STR, correspondent banking, beneficial ownership, and transaction monitoring knowledge when it is relevant
3. Explain key terms, principles, and why options are correct or incorrect
4. Provide practical exam-oriented reasoning, not just high-level hints

RESPONSE STYLE (very important):
- Keep every answer SHORT and SIMPLE by default — the student prefers quick exchanges with follow-up questions over long lectures
- Use bullet points, not paragraphs; aim for 3-6 bullets, one short sentence each
- Plain words; expand an acronym once, then use it
- Answer exactly what was asked — do not add background the student did not ask for
- Only give a longer, detailed explanation when the student explicitly asks (e.g. "explain in detail", "tell me more")
- It is fine to end with ONE short follow-up hint like "Ask me about X if you want the details" — never more than one

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
- You MAY provide the correct answer when the student asks for an explanation, but always explain the reasoning
- You MAY define and apply relevant AML/compliance concepts even if they are not explicitly written in the question text
- You MUST NOT refuse to explain a generally known AML/compliance concept merely because no source document is attached
- You MUST avoid inventing exact legal citations, dates, thresholds, or jurisdiction-specific requirements unless they are present in the question context
- If a rule varies by jurisdiction, say so briefly and focus on the exam principle
- Keep responses clear, focused, and useful for exam preparation`

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
        temperature: 0.4,
        max_tokens: 900,
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

    // BREAKPOINT D FIX: Save both messages in a transaction (append-only)
    // BREAKPOINT B FIX: Use userId from session (never from request body)
    await prisma.$transaction(async (tx) => {
      // BREAKPOINT D FIX: Save user message to QuestionChat
      await tx.questionChat.create({
        data: {
          user_id: userId, // Scope: current user (from session)
          question_id: questionId, // Scope: current question
          role: 'user',
          content: message,
        },
      })

      // BREAKPOINT D FIX: Save AI reply to QuestionChat
      await tx.questionChat.create({
        data: {
          user_id: userId, // Scope: current user (from session)
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

    // BREAKPOINT B FIX: Extract userId ONLY from session
    const user = await getUserFromSession(sessionToken)

    if (!user || !user.id) {
      return NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      )
    }

    const userId = user.id

    // 2. Parse question ID (scope enforcement)
    const questionId = parseInt(params.questionId)

    if (isNaN(questionId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid question ID' },
        { status: 400 }
      )
    }

    // BREAKPOINT B FIX: Use userId from session (never from request body)
    // 3. Load chat history (scope: user + question)
    const chatHistory = await prisma.questionChat.findMany({
      where: {
        user_id: userId, // Scope: current user (from session)
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

