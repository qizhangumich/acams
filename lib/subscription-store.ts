import { kvGet, kvSet, kvDel, kvKeys } from './kv-client';

/**
 * Subscription Store
 * 
 * Manages user subscription/payment status.
 * Uses Vercel KV for persistent storage.
 */
interface SubscriptionRecord {
  email: string;
  is_paid: boolean;
  paid_at?: string;
}

class SubscriptionStore {
  /**
   * Get KV key for a user subscription
   */
  private getUserKey(email: string): string {
    const normalizedEmail = email.trim().toLowerCase();
    return `user:${normalizedEmail}`;
  }

  /**
   * Check if user is paid
   */
  async isPaid(email: string): Promise<boolean> {
    const key = this.getUserKey(email);
    const record = await kvGet<SubscriptionRecord>(key);
    return record?.is_paid || false;
  }

  /**
   * Set payment status for a user (idempotent)
   */
  async setPaid(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const key = this.getUserKey(normalizedEmail);

    // Get existing record to preserve paid_at if already set
    const existingRecord = await kvGet<SubscriptionRecord>(key);

    const record: SubscriptionRecord = {
      email: normalizedEmail,
      is_paid: true,
      paid_at: existingRecord?.paid_at || new Date().toISOString(),
    };

    await kvSet<SubscriptionRecord>(key, record);
  }

  /**
   * Get user record
   */
  async getUser(email: string): Promise<SubscriptionRecord | null> {
    const key = this.getUserKey(email);
    const record = await kvGet<SubscriptionRecord>(key);
    return record || null;
  }

  /**
   * Get all paid users (for admin purposes)
   */
  async getAllPaidUsers(): Promise<SubscriptionRecord[]> {
    try {
      const keys = await kvKeys('user:*');
      const paidUsers: SubscriptionRecord[] = [];

      for (const key of keys) {
        const record = await kvGet<SubscriptionRecord>(key);
        if (record && record.is_paid) {
          paidUsers.push(record);
        }
      }

      return paidUsers;
    } catch (error) {
      console.error('Error getting all paid users:', error);
      return [];
    }
  }
}

// Singleton instance
export const subscriptionStore = new SubscriptionStore();
