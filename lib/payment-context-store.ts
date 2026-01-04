import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

/**
 * Payment Context Store
 * 
 * Manages payment contexts that tie together:
 * - Email entered before payment
 * - Stripe Payment Link payment
 * - Account upgrade + Premium UI activation
 * 
 * NOTE: For Vercel serverless functions, file writes are ephemeral.
 * For production, consider using a database.
 */
const PAYMENT_CONTEXT_FILE = path.join(process.cwd(), 'payment-context-data.json');

export interface PaymentContext {
  id: string;                // UUID
  email: string;             // subscription email
  status: 'pending' | 'paid';
  created_at: string;        // ISO timestamp
  paid_at?: string;          // ISO timestamp
}

class PaymentContextStore {
  private cache: Map<string, PaymentContext> = new Map();
  private cacheLoaded = false;

  /**
   * Load payment context data from file
   */
  private async loadCache(): Promise<void> {
    if (this.cacheLoaded) return;

    try {
      const data = await fs.readFile(PAYMENT_CONTEXT_FILE, 'utf-8');
      const contexts: PaymentContext[] = JSON.parse(data);
      
      contexts.forEach(context => {
        this.cache.set(context.id, context);
      });
    } catch (error) {
      // File doesn't exist yet, start with empty cache
      this.cache.clear();
    }
    
    this.cacheLoaded = true;
  }

  /**
   * Save payment context data to file
   */
  private async saveCache(): Promise<void> {
    const contexts: PaymentContext[] = Array.from(this.cache.values());
    
    try {
      const dir = path.dirname(PAYMENT_CONTEXT_FILE);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(PAYMENT_CONTEXT_FILE, JSON.stringify(contexts, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save payment context data:', error);
    }
  }

  /**
   * Create a new payment context
   */
  async createContext(email: string): Promise<PaymentContext> {
    await this.loadCache();

    const normalizedEmail = email.trim().toLowerCase();

    const context: PaymentContext = {
      id: randomUUID(),
      email: normalizedEmail,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    this.cache.set(context.id, context);
    await this.saveCache();

    return context;
  }

  /**
   * Get payment context by ID
   */
  async getContext(contextId: string): Promise<PaymentContext | null> {
    await this.loadCache();
    return this.cache.get(contextId) || null;
  }

  /**
   * Mark payment context as paid (idempotent)
   */
  async markAsPaid(contextId: string): Promise<PaymentContext | null> {
    await this.loadCache();

    const context = this.cache.get(contextId);
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

    this.cache.set(contextId, context);
    await this.saveCache();

    return context;
  }

  /**
   * Get all contexts (for admin/debugging)
   */
  async getAllContexts(): Promise<PaymentContext[]> {
    await this.loadCache();
    return Array.from(this.cache.values());
  }
}

// Singleton instance
export const paymentContextStore = new PaymentContextStore();

