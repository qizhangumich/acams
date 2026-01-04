import { UserProgress, QuestionProgress } from '@/types';
import { kvGet, kvSet, kvDel } from './kv-client';

/**
 * Progress Store
 * 
 * Manages user learning progress.
 * Uses Vercel KV for persistent storage.
 */
class ProgressStore {
  /**
   * Get KV key for user progress
   */
  private getProgressKey(email: string): string {
    const normalizedEmail = email.trim().toLowerCase();
    return `progress:${normalizedEmail}`;
  }

  /**
   * Get progress for a user
   */
  async getProgress(email: string): Promise<UserProgress | null> {
    const key = this.getProgressKey(email);
    const progress = await kvGet<UserProgress>(key);
    return progress || null;
  }

  /**
   * Create or update user progress
   */
  async saveProgress(email: string, questionId: number, correct: boolean, userAnswers?: string[]): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const key = this.getProgressKey(normalizedEmail);

    // Get existing progress
    let userProgress = await this.getProgress(normalizedEmail);
    
    if (!userProgress) {
      userProgress = {
        email: normalizedEmail,
        progress: {},
        lastActiveAt: new Date().toISOString(),
      };
    }

    // Update progress for the question
    userProgress.progress[questionId] = {
      answered: true,
      correct,
      lastAnsweredAt: new Date().toISOString(),
      userAnswers,
    };

    userProgress.lastActiveAt = new Date().toISOString();
    
    // Save to KV
    await kvSet<UserProgress>(key, userProgress);
  }

  /**
   * Get all progress for a user
   */
  async getAllProgress(email: string): Promise<Record<number, QuestionProgress>> {
    const userProgress = await this.getProgress(email);
    return userProgress?.progress || {};
  }

  /**
   * Reset progress for a user
   */
  async resetProgress(email: string): Promise<void> {
    const key = this.getProgressKey(email);
    await kvDel(key);
  }
}

// Singleton instance
export const progressStore = new ProgressStore();
