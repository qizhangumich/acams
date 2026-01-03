import { UserProgress, QuestionProgress } from '@/types';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Simple file-based progress store
 * 
 * NOTE: For Vercel serverless functions, file writes are ephemeral.
 * For production, consider:
 * - Vercel KV (Redis)
 * - Vercel Postgres
 * - Supabase
 * - Other database solutions
 * 
 * This implementation works for development and single-instance deployments.
 */
const PROGRESS_FILE = path.join(process.cwd(), 'progress-data.json');

class ProgressStore {
  private cache: Map<string, UserProgress> = new Map();
  private cacheLoaded = false;

  /**
   * Load progress data from file
   */
  private async loadCache(): Promise<void> {
    if (this.cacheLoaded) return;

    try {
      const data = await fs.readFile(PROGRESS_FILE, 'utf-8');
      const progressData: UserProgress[] = JSON.parse(data);
      
      progressData.forEach(userProgress => {
        this.cache.set(userProgress.email, userProgress);
      });
    } catch (error) {
      // File doesn't exist yet, start with empty cache
      this.cache.clear();
    }
    
    this.cacheLoaded = true;
  }

  /**
   * Save progress data to file
   */
  private async saveCache(): Promise<void> {
    const progressData: UserProgress[] = Array.from(this.cache.values());
    
    try {
      // Create directory if it doesn't exist
      const dir = path.dirname(PROGRESS_FILE);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(PROGRESS_FILE, JSON.stringify(progressData, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save progress:', error);
      // Don't throw - allow the operation to continue even if file write fails
      // In production, this should use a proper database
    }
  }

  /**
   * Get progress for a user
   */
  async getProgress(email: string): Promise<UserProgress | null> {
    await this.loadCache();
    return this.cache.get(email) || null;
  }

  /**
   * Create or update user progress
   */
  async saveProgress(email: string, questionId: number, correct: boolean, userAnswers?: string[]): Promise<void> {
    await this.loadCache();

    let userProgress = this.cache.get(email);
    
    if (!userProgress) {
      userProgress = {
        email,
        progress: {},
        lastActiveAt: new Date().toISOString(),
      };
    }

    userProgress.progress[questionId] = {
      answered: true,
      correct,
      lastAnsweredAt: new Date().toISOString(),
      userAnswers,
    };

    userProgress.lastActiveAt = new Date().toISOString();
    
    this.cache.set(email, userProgress);
    await this.saveCache();
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
    await this.loadCache();
    this.cache.delete(email);
    await this.saveCache();
  }
}

// Singleton instance
export const progressStore = new ProgressStore();

