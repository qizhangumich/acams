import { randomUUID } from 'crypto';
import { kvGet, kvSet, kvDel, kvKeys } from './kv-client';

/**
 * Payment Context Store
 * 
 * Manages payment contexts that tie together:
 * - Email entered before payment
 * - Stripe Payment Link payment
 * - Account upgrade + Premium UI activation
 * 
 * Uses Vercel KV for persistent storage.
 */
export interface PaymentContext {
  id: string;                // UUID
  email: string;             // subscription email
  status: 'pending' | 'paid';
  created_at: string;        // ISO timestamp
  paid_at?: string;          // ISO timestamp
}

class PaymentContextStore {
  /**
   * Get KV key for a payment context
   */
  private getContextKey(contextId: string): string {
    return `context:${contextId}`;
  }

  /**
   * Create a new payment context
   */
  async createContext(email: string): Promise<PaymentContext> {
    const normalizedEmail = email.trim().toLowerCase();

    const context: PaymentContext = {
      id: randomUUID(),
      email: normalizedEmail,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const key = this.getContextKey(context.id);
    await kvSet<PaymentContext>(key, context);

    return context;
  }

  /**
   * Get payment context by ID
   */
  async getContext(contextId: string): Promise<PaymentContext | null> {
    const key = this.getContextKey(contextId);
    const context = await kvGet<PaymentContext>(key);
    return context || null;
  }

  /**
   * Mark payment context as paid (idempotent)
   */
  async markAsPaid(contextId: string): Promise<PaymentContext | null> {
    const context = await this.getContext(contextId);
    if (!context) {
      return null;
    }

    // Idempotent: if already paid, return success
    if (context.status === 'paid') {
      return context;
    }

    // Mark as paid
    context.status = 'paid';
    context.paid_at = new Date().toISOString();

    const key = this.getContextKey(contextId);
    await kvSet<PaymentContext>(key, context);

    return context;
  }

  /**
   * Get all contexts (for admin/debugging)
   */
  async getAllContexts(): Promise<PaymentContext[]> {
    try {
      const keys = await kvKeys('context:*');
      const contexts: PaymentContext[] = [];

      for (const key of keys) {
        const context = await kvGet<PaymentContext>(key);
        if (context) {
          contexts.push(context);
        }
      }

      return contexts;
    } catch (error) {
      console.error('Error getting all contexts:', error);
      return [];
    }
  }
}

// Singleton instance
export const paymentContextStore = new PaymentContextStore();
