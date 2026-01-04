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
 * Subscription Store
 * 
 * Manages user subscription/payment status.
 * Uses Neon PostgreSQL for persistent storage.
 */
interface SubscriptionRecord {
  email: string;
  is_paid: boolean;
  paid_at?: string;
}

class SubscriptionStore {
  /**
   * Check if user is paid
   */
  async isPaid(email: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();
    const result = await db`
      SELECT is_paid FROM subscriptions WHERE email = ${normalizedEmail}
    ` as Array<{ is_paid: boolean }>;
    return result.length > 0 ? result[0].is_paid : false;
  }

  /**
   * Set payment status for a user (idempotent)
   */
  async setPaid(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();

    // Get existing record to preserve paid_at if already set
    const existing = await db`
      SELECT paid_at FROM subscriptions WHERE email = ${normalizedEmail}
    ` as Array<{ paid_at: Date | null }>;

    const paidAt = existing.length > 0 && existing[0].paid_at
      ? existing[0].paid_at.toISOString()
      : new Date().toISOString();

    // Use INSERT ... ON CONFLICT to handle upsert
    await db`
      INSERT INTO subscriptions (email, is_paid, paid_at)
      VALUES (${normalizedEmail}, ${true}, ${paidAt})
      ON CONFLICT (email)
      DO UPDATE SET is_paid = ${true}, paid_at = COALESCE(subscriptions.paid_at, ${paidAt})
    `;
  }

  /**
   * Get user record
   */
  async getUser(email: string): Promise<SubscriptionRecord | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();
    const result = await db`
      SELECT email, is_paid, paid_at FROM subscriptions WHERE email = ${normalizedEmail}
    ` as Array<{
      email: string;
      is_paid: boolean;
      paid_at: Date | null;
    }>;

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      email: row.email,
      is_paid: row.is_paid,
      paid_at: row.paid_at ? row.paid_at.toISOString() : undefined,
    };
  }

  /**
   * Get all paid users (for admin purposes)
   */
  async getAllPaidUsers(): Promise<SubscriptionRecord[]> {
    try {
      const db = getDb();
      const results = await db`
        SELECT email, is_paid, paid_at
        FROM subscriptions
        WHERE is_paid = TRUE
        ORDER BY paid_at DESC
      ` as Array<{
        email: string;
        is_paid: boolean;
        paid_at: Date | null;
      }>;

      return results.map(result => ({
        email: result.email,
        is_paid: result.is_paid,
        paid_at: result.paid_at ? result.paid_at.toISOString() : undefined,
      }));
    } catch (error) {
      console.error('Error getting all paid users:', error);
      return [];
    }
  }
}

// Singleton instance
export const subscriptionStore = new SubscriptionStore();
