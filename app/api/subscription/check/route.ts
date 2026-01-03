import { NextRequest, NextResponse } from 'next/server';
import { subscriptionStore } from '@/lib/subscription-store';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * GET /api/subscription/check?email=user@example.com
 * Check if a user is subscribed
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

    const isSubscribed = await subscriptionStore.isSubscribed(email);
    
    return NextResponse.json({ subscribed: isSubscribed });
  } catch (error) {
    console.error('Error checking subscription:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription' },
      { status: 500 }
    );
  }
}

