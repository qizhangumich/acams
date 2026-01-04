import { NextRequest, NextResponse } from 'next/server';
import { paymentContextStore } from '@/lib/payment-context-store';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

/**
 * POST /api/payment/create-context
 * Create a new payment context before redirecting to Stripe
 * 
 * Body: { email: string }
 * 
 * Returns: { context_id: string, email: string }
 * 
 * This creates a payment_context with status 'pending'
 * that will be consumed after successful payment.
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

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create payment context
    const context = await paymentContextStore.createContext(email);

    return NextResponse.json({
      success: true,
      context_id: context.id,
      email: context.email,
    });
  } catch (error) {
    console.error('Error creating payment context:', error);
    return NextResponse.json(
      { error: 'Failed to create payment context. Please try again.' },
      { status: 500 }
    );
  }
}

