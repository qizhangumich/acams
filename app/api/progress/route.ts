import { NextRequest, NextResponse } from 'next/server';
import { progressStore } from '@/lib/progress-store';

/**
 * GET /api/progress?email=user@example.com
 * Get all progress for a user
 */
export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const progress = await progressStore.getAllProgress(email);
    
    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/progress
 * Save progress for a question
 * Body: { email: string, questionId: number, correct: boolean, userAnswers?: string[] }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, questionId, correct, userAnswers } = body;

    if (!email || questionId === undefined || correct === undefined) {
      return NextResponse.json(
        { error: 'Email, questionId, and correct are required' },
        { status: 400 }
      );
    }

    await progressStore.saveProgress(email, questionId, correct, userAnswers);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving progress:', error);
    return NextResponse.json(
      { error: 'Failed to save progress' },
      { status: 500 }
    );
  }
}

