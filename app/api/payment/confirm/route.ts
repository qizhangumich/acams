import { NextRequest, NextResponse } from 'next/server';
import { paymentContextStore } from '@/lib/payment-context-store';
import { subscriptionStore } from '@/lib/subscription-store';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/payment/confirm
 * Confirm payment and upgrade user account
 * 
 * Body: { context_id: string }
 * 
 * This is the critical state transition:
 * 1. Find payment_context by id
 * 2. If not found → error
 * 3. If status === 'paid' → return success (idempotent)
 * 4. Mark payment_context.status = 'paid'
 * 5. Find current user and upgrade:
 *    - user.email = payment_context.email
 *    - user.is_paid = true
 *    - user.paid_at = now
 * 
 * Rules:
 * - Do NOT create a second user
 * - This is an account upgrade, not account replacement
 * - No Stripe verification required
 * - Idempotent - safe to call multiple times
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { context_id } = body;

    if (!context_id || typeof context_id !== 'string') {
      return NextResponse.json(
        { error: 'context_id is required' },
        { status: 400 }
      );
    }

    // Step 1: Find payment context
    const context = await paymentContextStore.getContext(context_id);
    
    if (!context) {
      return NextResponse.json(
        { error: 'Payment context not found' },
        { status: 404 }
      );
    }

    // Step 2: Check if already paid (idempotent)
    if (context.status === 'paid') {
      // Already processed, return success
      return NextResponse.json({
        success: true,
        message: 'Payment already confirmed',
        email: context.email,
        is_paid: true,
      });
    }

    // Step 3: Mark context as paid
    const paidContext = await paymentContextStore.markAsPaid(context_id);
    
    if (!paidContext) {
      return NextResponse.json(
        { error: 'Failed to mark payment as confirmed' },
        { status: 500 }
      );
    }

    // Step 4: Upgrade user account
    // The email from payment_context becomes the authoritative identity
    const normalizedEmail = paidContext.email.trim().toLowerCase();
    
    // Set user as paid (this also sets the email as authoritative)
    await subscriptionStore.setPaid(normalizedEmail);

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed and account upgraded',
      email: normalizedEmail,
      is_paid: true,
      paid_at: paidContext.paid_at,
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment. Please try again.' },
      { status: 500 }
    );
  }
}

