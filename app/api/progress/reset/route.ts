import { NextRequest, NextResponse } from 'next/server';
import { progressStore } from '@/lib/progress-store';

/**
 * POST /api/progress/reset
 * Reset all progress for a user
 * Body: { email: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    await progressStore.resetProgress(email);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error resetting progress:', error);
    return NextResponse.json(
      { error: 'Failed to reset progress' },
      { status: 500 }
    );
  }
}

