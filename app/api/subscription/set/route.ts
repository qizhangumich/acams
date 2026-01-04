import { NextRequest, NextResponse } from 'next/server';
import { subscriptionStore } from '@/lib/subscription-store';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/subscription/set
 * Set payment status for a user
 * Body: { email: string, is_paid: boolean }
 * 
 * Note: This is a legacy endpoint. Use /api/payment/activate instead.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, is_paid, subscribed } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const shouldBePaid = is_paid !== undefined ? is_paid : subscribed;

    if (shouldBePaid) {
      await subscriptionStore.setPaid(normalizedEmail);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting subscription:', error);
    return NextResponse.json(
      { error: 'Failed to set subscription' },
      { status: 500 }
    );
  }
}

