import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { aiCache } from '@/lib/ai-cache';
import { subscriptionStore } from '@/lib/subscription-store';

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

/**
 * POST /api/ai/explain
 * Generate AI explanation for a question
 * 
 * Request Body:
 * {
 *   question_id: number,
 *   question: string,
 *   options: Record<string, string>,
 *   correct_answers: string[],
 *   user_answers: string[],
 *   topic: string,
 *   language: "English" | "Chinese",
 *   email: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI is configured
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      question_id,
      question,
      options,
      correct_answers,
      user_answers,
      topic,
      language,
      email,
    } = body;

    // Validate required fields
    if (
      !question_id ||
      !question ||
      !options ||
      !correct_answers ||
      !user_answers ||
      !topic ||
      !language ||
      !email
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate language
    if (language !== 'English' && language !== 'Chinese') {
      return NextResponse.json(
        { error: 'Language must be "English" or "Chinese"' },
        { status: 400 }
      );
    }

    // Check cache first
    const cachedExplanation = aiCache.getCachedExplanation(question_id, language);
    if (cachedExplanation) {
      return NextResponse.json({ explanation: cachedExplanation });
    }

    // Check if user is subscribed (subscribed users have unlimited access)
    const isSubscribed = await subscriptionStore.isSubscribed(email);

    // Check rate limit only for non-subscribed users
    if (!isSubscribed && !aiCache.checkRateLimit(email)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. You can request 1 AI explanation per day. Subscribe for unlimited access!' },
        { status: 429 }
      );
    }

    // Format options for prompt
    const optionsText = Object.entries(options)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    // Build user prompt according to phase2_instructions_ai.md
    const userPrompt = `Explain the following CAMS multiple-choice question.

Instructions:
1. First, briefly explain what concept or risk area the question is testing.
2. Then explain why each correct option is correct.
3. Then explain why each incorrect option is incorrect.
4. Use concise bullet points.
5. Focus on CAMS exam logic rather than long regulatory quotations.
6. Write in ${language}.

Question:
${question}

Options:
${optionsText}

Correct answers:
${correct_answers.join(', ')}

User selected:
${user_answers.join(', ')}

Topic:
${topic}`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a senior AML and CAMS instructor. Your explanations must be accurate, exam-oriented, and easy to understand.',
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    const explanation = completion.choices[0]?.message?.content || '';

    if (!explanation) {
      return NextResponse.json(
        { error: 'Failed to generate explanation' },
        { status: 500 }
      );
    }

    // Cache the explanation
    aiCache.setCachedExplanation(question_id, language, explanation);

    // Increment rate limit only for non-subscribed users
    if (!isSubscribed) {
      aiCache.incrementRateLimit(email);
    }

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error('Error generating AI explanation:', error);
    
    if (error instanceof Error) {
      // Handle OpenAI API errors
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'OpenAI API rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'OpenAI API key is invalid' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to generate AI explanation' },
      { status: 500 }
    );
  }
}

