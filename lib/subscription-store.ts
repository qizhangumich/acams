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
  subscribed: boolean;
  subscribedAt?: string;
  lastCheckedAt: string;
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
   * Check if user is subscribed
   */
  async isSubscribed(email: string): Promise<boolean> {
    await this.loadCache();
    const record = this.cache.get(email);
    return record?.subscribed || false;
  }

  /**
   * Set subscription status for a user
   */
  async setSubscription(email: string, subscribed: boolean): Promise<void> {
    await this.loadCache();

    const record: SubscriptionRecord = {
      email,
      subscribed,
      subscribedAt: subscribed ? new Date().toISOString() : undefined,
      lastCheckedAt: new Date().toISOString(),
    };

    this.cache.set(email, record);
    await this.saveCache();
  }

  /**
   * Get all subscribed users (for admin purposes)
   */
  async getAllSubscriptions(): Promise<SubscriptionRecord[]> {
    await this.loadCache();
    return Array.from(this.cache.values()).filter(r => r.subscribed);
  }
}

// Singleton instance
export const subscriptionStore = new SubscriptionStore();

