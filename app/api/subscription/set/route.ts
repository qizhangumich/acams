import { NextRequest, NextResponse } from 'next/server';
import { subscriptionStore } from '@/lib/subscription-store';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/subscription/set
 * Set subscription status for a user
 * Body: { email: string, subscribed: boolean }
 * 
 * Note: In production, this should be called via Stripe webhook
 * For now, it can be called from a success page after payment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, subscribed } = body;

    if (!email || typeof subscribed !== 'boolean') {
      return NextResponse.json(
        { error: 'Email and subscribed (boolean) are required' },
        { status: 400 }
      );
    }

    await subscriptionStore.setSubscription(email, subscribed);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting subscription:', error);
    return NextResponse.json(
      { error: 'Failed to set subscription' },
      { status: 500 }
    );
  }
}

