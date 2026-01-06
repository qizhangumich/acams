/**
 * API Flow Test Script
 * 
 * Tests the complete flow without UI:
 * 1. Send magic link
 * 2. Verify magic link (simulate)
 * 3. Get current user
 * 4. Resume progress
 * 5. Answer question (correct)
 * 6. Answer question (wrong) - test wrong_count increment
 * 7. Answer same question wrong again - test wrong_count increment
 * 8. Get progress stats
 * 9. Resume again - should return next question
 */

import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const TEST_EMAIL = `test-${Date.now()}@example.com`

const prisma = new PrismaClient()

// Helper to make API requests
async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  cookies?: string
): Promise<{ data: any; cookies: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (cookies) {
    headers['Cookie'] = cookies
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json()
  const setCookies = response.headers.getSetCookie()

  return { data, cookies: setCookies.join('; ') }
}

async function main() {
  console.log('🧪 Starting API Flow Test\n')
  console.log(`📧 Test Email: ${TEST_EMAIL}\n`)

  let sessionCookies = ''

  try {
    // Step 1: Send magic link
    console.log('1️⃣  Sending magic link...')
    const { data: sendLinkData } = await apiRequest('/api/auth/send-magic-link', {
      method: 'POST',
      body: JSON.stringify({ email: TEST_EMAIL }),
    })

    if (!sendLinkData.success) {
      throw new Error(`Failed to send magic link: ${sendLinkData.message}`)
    }
    console.log('   ✅ Magic link sent\n')

    // Step 2: Get token from database and verify
    console.log('2️⃣  Verifying magic link...')
    const tokenRecord = await prisma.magicLinkToken.findFirst({
      where: {
        email: TEST_EMAIL,
        used: false,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    })

    if (!tokenRecord) {
      throw new Error('Token not found in database')
    }

    const verifyUrl = `/api/auth/verify?token=${tokenRecord.token}&email=${encodeURIComponent(TEST_EMAIL)}`
    const { data: verifyData, cookies } = await apiRequest(verifyUrl, {
      method: 'GET',
    })

    if (!verifyData.success) {
      throw new Error(`Failed to verify: ${verifyData.message}`)
    }

    sessionCookies = cookies
    const userId = verifyData.user.id
    console.log(`   ✅ Verified! User ID: ${userId}\n`)

    // Step 3: Get current user
    console.log('3️⃣  Getting current user...')
    const { data: meData } = await apiRequest('/api/auth/me', {
      method: 'GET',
    }, sessionCookies)

    if (!meData.success) {
      throw new Error(`Failed to get user: ${meData.message}`)
    }
    console.log(`   ✅ User: ${meData.user.email}\n`)

    // Step 4: Resume progress (should return first question)
    console.log('4️⃣  Resuming progress...')
    const { data: resumeData } = await apiRequest('/api/progress/resume', {
      method: 'GET',
    }, sessionCookies)

    if (!resumeData.success || !resumeData.question) {
      throw new Error('Failed to resume or no questions found')
    }

    const firstQuestionId = resumeData.question_id
    console.log(`   ✅ Resumed to question ${firstQuestionId}\n`)

    // Step 5: Answer question correctly
    console.log('5️⃣  Answering question correctly...')
    const question = await prisma.question.findUnique({
      where: { id: firstQuestionId },
    })

    if (!question) {
      throw new Error('Question not found')
    }

    const correctAnswer = Array.isArray(question.correct_answers)
      ? question.correct_answers
      : [question.correct_answers]

    const { data: progressData1 } = await apiRequest('/api/progress', {
      method: 'POST',
      body: JSON.stringify({
        question_id: firstQuestionId,
        selected_answer: correctAnswer,
        is_correct: true,
      }),
    }, sessionCookies)

    if (!progressData1.success) {
      throw new Error(`Failed to save progress: ${progressData1.message}`)
    }
    console.log(`   ✅ Progress saved: ${progressData1.progress.status}\n`)

    // Step 6: Get next question and answer wrong
    console.log('6️⃣  Getting next question and answering wrong...')
    const { data: resumeData2 } = await apiRequest('/api/progress/resume', {
      method: 'GET',
    }, sessionCookies)

    if (!resumeData2.success) {
      throw new Error('Failed to resume')
    }

    const secondQuestionId = resumeData2.question_id
    const question2 = await prisma.question.findUnique({
      where: { id: secondQuestionId },
    })

    if (!question2) {
      throw new Error('Question not found')
    }

    // Answer with wrong answer
    const wrongAnswer = ['X'] // Assuming X is not a valid option or wrong

    const { data: progressData2 } = await apiRequest('/api/progress', {
      method: 'POST',
      body: JSON.stringify({
        question_id: secondQuestionId,
        selected_answer: wrongAnswer,
        is_correct: false,
      }),
    }, sessionCookies)

    if (!progressData2.success) {
      throw new Error(`Failed to save progress: ${progressData2.message}`)
    }
    console.log(`   ✅ Progress saved: ${progressData2.progress.status}`)
    console.log(`   ✅ Wrong count: ${progressData2.progress.wrong_count}\n`)

    // Step 7: Answer same question wrong again (test wrong_count increment)
    console.log('7️⃣  Answering same question wrong again (test wrong_count increment)...')
    const { data: progressData3 } = await apiRequest('/api/progress', {
      method: 'POST',
      body: JSON.stringify({
        question_id: secondQuestionId,
        selected_answer: wrongAnswer,
        is_correct: false,
      }),
    }, sessionCookies)

    if (!progressData3.success) {
      throw new Error(`Failed to save progress: ${progressData3.message}`)
    }

    if (progressData3.progress.wrong_count !== 2) {
      throw new Error(
        `Wrong count should be 2, got ${progressData3.progress.wrong_count}`
      )
    }
    console.log(`   ✅ Progress saved: ${progressData3.progress.status}`)
    console.log(`   ✅ Wrong count incremented to: ${progressData3.progress.wrong_count}\n`)

    // Step 8: Get progress stats
    console.log('8️⃣  Getting progress stats...')
    const { data: statsData } = await apiRequest('/api/progress', {
      method: 'GET',
    }, sessionCookies)

    if (!statsData.success) {
      throw new Error(`Failed to get stats: ${statsData.message}`)
    }
    console.log(`   ✅ Total questions: ${statsData.total_questions}`)
    console.log(`   ✅ Completed: ${statsData.completed}`)
    console.log(`   ✅ Correct: ${statsData.correct}`)
    console.log(`   ✅ Wrong: ${statsData.wrong}`)
    console.log(`   ✅ Not started: ${statsData.not_started}\n`)

    // Step 9: Resume again (should return next question)
    console.log('9️⃣  Resuming again (should return next question)...')
    const { data: resumeData3 } = await apiRequest('/api/progress/resume', {
      method: 'GET',
    }, sessionCookies)

    if (!resumeData3.success) {
      throw new Error('Failed to resume')
    }
    console.log(`   ✅ Resumed to question ${resumeData3.question_id}\n`)

    // Step 10: Test session persistence (simulate refresh)
    console.log('🔟 Testing session persistence (simulate refresh)...')
    const { data: meData2 } = await apiRequest('/api/auth/me', {
      method: 'GET',
    }, sessionCookies)

    if (!meData2.success || meData2.user.email !== TEST_EMAIL) {
      throw new Error('Session not persisted')
    }
    console.log(`   ✅ Session persisted: ${meData2.user.email}\n`)

    console.log('✅ All tests passed!\n')

    // Cleanup
    console.log('🧹 Cleaning up test data...')
    await prisma.user.deleteMany({
      where: { email: TEST_EMAIL },
    })
    await prisma.magicLinkToken.deleteMany({
      where: { email: TEST_EMAIL },
    })
    console.log('   ✅ Cleanup complete\n')
  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()

