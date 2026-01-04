import { NextRequest, NextResponse } from 'next/server';
import { subscriptionStore } from '@/lib/subscription-store';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/payment/activate
 * Upgrade account to paid status
 * 
 * Body: { email: string }
 * 
 * This is an account upgrade operation:
 * - The subscription email becomes the authoritative identity
 * - Sets is_paid = true
 * - Sets paid_at timestamp
 * - Idempotent - safe to call multiple times
 * 
 * Rules:
 * - Do NOT create a second user
 * - This is an upgrade, not a merge
 * - Subscription email overwrites any previous email
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

    // Upgrade account: set email as authoritative and mark as paid
    // This overwrites any previous email (temporary or placeholder)
    await subscriptionStore.setPaid(normalizedEmail);

    return NextResponse.json({
      success: true,
      message: 'Account upgraded successfully',
      email: normalizedEmail,
    });
  } catch (error) {
    console.error('Error upgrading account:', error);
    return NextResponse.json(
      { error: 'Failed to upgrade account. Please try again.' },
      { status: 500 }
    );
  }
}

