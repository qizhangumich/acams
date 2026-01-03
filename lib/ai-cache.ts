/**
 * AI explanation cache and rate limiting service
 * 
 * Caches AI explanations per question and language combination
 * Implements rate limiting: 1 AI explanation per day per email
 */

interface RateLimitRecord {
  count: number;
  date: string; // ISO date string (YYYY-MM-DD)
}

class AICache {
  // Cache: questionId_language -> explanation
  private explanationCache: Map<string, string> = new Map();
  
  // Rate limiting: email -> { count, date }
  private rateLimitMap: Map<string, RateLimitRecord> = new Map();

  /**
   * Get cached explanation for a question and language
   */
  getCachedExplanation(questionId: number, language: string): string | null {
    const key = `${questionId}_${language}`;
    return this.explanationCache.get(key) || null;
  }

  /**
   * Cache an explanation for a question and language
   */
  setCachedExplanation(questionId: number, language: string, explanation: string): void {
    const key = `${questionId}_${language}`;
    this.explanationCache.set(key, explanation);
  }

  /**
   * Check if user has exceeded rate limit (1 per day)
   * Returns true if allowed, false if rate limited
   */
  checkRateLimit(email: string): boolean {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const record = this.rateLimitMap.get(email);

    if (!record) {
      // No record, allow request
      return true;
    }

    if (record.date !== today) {
      // Different day, reset and allow
      return true;
    }

    // Same day, check count
    return record.count < 1;
  }

  /**
   * Increment rate limit counter for user
   */
  incrementRateLimit(email: string): void {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const record = this.rateLimitMap.get(email);

    if (!record || record.date !== today) {
      // New day or no record, start fresh
      this.rateLimitMap.set(email, { count: 1, date: today });
    } else {
      // Same day, increment
      record.count += 1;
      this.rateLimitMap.set(email, record);
    }
  }

  /**
   * Clear cache (useful for testing or manual cache invalidation)
   */
  clearCache(): void {
    this.explanationCache.clear();
  }

  /**
   * Clear rate limit (useful for testing)
   */
  clearRateLimit(): void {
    this.rateLimitMap.clear();
  }
}

// Singleton instance
export const aiCache = new AICache();

