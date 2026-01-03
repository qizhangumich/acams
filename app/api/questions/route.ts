import { NextResponse } from 'next/server';
import { dataService } from '@/lib/data-service';

/**
 * GET /api/questions
 * Get all questions from questions.json
 */
export async function GET() {
  try {
    const questions = dataService.getAllQuestions();
    
    return NextResponse.json({ 
      questions,
      total: questions.length 
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

