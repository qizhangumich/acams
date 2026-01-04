import { randomUUID } from 'crypto';
import { neon } from '@neondatabase/serverless';

/**
 * Get database client
 */
function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return neon(process.env.DATABASE_URL);
}

/**
 * Payment Context Store
 * 
 * Manages payment contexts that tie together:
 * - Email entered before payment
 * - Stripe Payment Link payment
 * - Account upgrade + Premium UI activation
 * 
 * Uses Neon PostgreSQL for persistent storage.
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

    const db = getDb();
    await db`
      INSERT INTO payment_contexts (id, email, status, created_at)
      VALUES (${context.id}, ${context.email}, ${context.status}, ${context.created_at})
    `;

    return context;
  }

  /**
   * Get payment context by ID
   */
  async getContext(contextId: string): Promise<PaymentContext | null> {
    const db = getDb();
    const result = await db`
      SELECT id, email, status, created_at, paid_at
      FROM payment_contexts
      WHERE id = ${contextId}
    ` as Array<{
      id: string;
      email: string;
      status: string;
      created_at: Date;
      paid_at: Date | null;
    }>;

    if (!result || result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      id: row.id,
      email: row.email,
      status: row.status as 'pending' | 'paid',
      created_at: row.created_at.toISOString(),
      paid_at: row.paid_at ? row.paid_at.toISOString() : undefined,
    };
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
    const paidAt = new Date().toISOString();
    const db = getDb();
    await db`
      UPDATE payment_contexts
      SET status = 'paid', paid_at = ${paidAt}
      WHERE id = ${contextId}
    `;

    return {
      ...context,
      status: 'paid',
      paid_at: paidAt,
    };
  }

  /**
   * Get all contexts (for admin/debugging)
   */
  async getAllContexts(): Promise<PaymentContext[]> {
    try {
      const db = getDb();
      const results = await db`
        SELECT id, email, status, created_at, paid_at
        FROM payment_contexts
        ORDER BY created_at DESC
      ` as Array<{
        id: string;
        email: string;
        status: string;
        created_at: Date;
        paid_at: Date | null;
      }>;

      return results.map(result => ({
        id: result.id,
        email: result.email,
        status: result.status as 'pending' | 'paid',
        created_at: result.created_at.toISOString(),
        paid_at: result.paid_at ? result.paid_at.toISOString() : undefined,
      }));
    } catch (error) {
      console.error('Error getting all contexts:', error);
      return [];
    }
  }
}

// Singleton instance
export const paymentContextStore = new PaymentContextStore();
