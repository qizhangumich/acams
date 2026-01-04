import { NextRequest, NextResponse } from 'next/server';
import { subscriptionStore } from '@/lib/subscription-store';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/payment/activate
 * Activate paid access for a user
 * 
 * Body: { email: string }
 * 
 * This is an idempotent operation - calling it multiple times is safe.
 * Payment verification is handled by Stripe, we just record that the user is paid.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Normalize email (trim and lowercase)
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: 'Email cannot be empty' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Set user as paid (idempotent - safe to call multiple times)
    await subscriptionStore.setPaid(normalizedEmail);

    return NextResponse.json({
      success: true,
      message: 'Access activated successfully',
    });
  } catch (error) {
    console.error('Error activating payment:', error);
    return NextResponse.json(
      { error: 'Failed to activate access. Please try again.' },
      { status: 500 }
    );
  }
}

