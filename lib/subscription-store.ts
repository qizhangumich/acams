import { promises as fs } from 'fs';
import path from 'path';

/**
 * Simple file-based subscription store
 * 
 * NOTE: For Vercel serverless functions, file writes are ephemeral.
 * For production, consider using a database.
 */
const SUBSCRIPTION_FILE = path.join(process.cwd(), 'subscription-data.json');

interface SubscriptionRecord {
  email: string;
  is_paid: boolean;
  paid_at?: string;
}

class SubscriptionStore {
  private cache: Map<string, SubscriptionRecord> = new Map();
  private cacheLoaded = false;

  /**
   * Load subscription data from file
   */
  private async loadCache(): Promise<void> {
    if (this.cacheLoaded) return;

    try {
      const data = await fs.readFile(SUBSCRIPTION_FILE, 'utf-8');
      const subscriptionData: SubscriptionRecord[] = JSON.parse(data);
      
      subscriptionData.forEach(record => {
        this.cache.set(record.email, record);
      });
    } catch (error) {
      // File doesn't exist yet, start with empty cache
      this.cache.clear();
    }
    
    this.cacheLoaded = true;
  }

  /**
   * Save subscription data to file
   */
  private async saveCache(): Promise<void> {
    const subscriptionData: SubscriptionRecord[] = Array.from(this.cache.values());
    
    try {
      const dir = path.dirname(SUBSCRIPTION_FILE);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(SUBSCRIPTION_FILE, JSON.stringify(subscriptionData, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save subscription data:', error);
    }
  }

  /**
   * Check if user is paid
   */
  async isPaid(email: string): Promise<boolean> {
    await this.loadCache();
    const record = this.cache.get(email);
    return record?.is_paid || false;
  }

  /**
   * Set payment status for a user (idempotent)
   */
  async setPaid(email: string): Promise<void> {
    await this.loadCache();

    const normalizedEmail = email.trim().toLowerCase();
    const existingRecord = this.cache.get(normalizedEmail);

    const record: SubscriptionRecord = {
      email: normalizedEmail,
      is_paid: true,
      paid_at: existingRecord?.paid_at || new Date().toISOString(),
    };

    this.cache.set(normalizedEmail, record);
    await this.saveCache();
  }

  /**
   * Get user record
   */
  async getUser(email: string): Promise<SubscriptionRecord | null> {
    await this.loadCache();
    const normalizedEmail = email.trim().toLowerCase();
    return this.cache.get(normalizedEmail) || null;
  }

  /**
   * Get all paid users (for admin purposes)
   */
  async getAllPaidUsers(): Promise<SubscriptionRecord[]> {
    await this.loadCache();
    return Array.from(this.cache.values()).filter(r => r.is_paid);
  }
}

// Singleton instance
export const subscriptionStore = new SubscriptionStore();

