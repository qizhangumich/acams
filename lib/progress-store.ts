import { UserProgress, QuestionProgress } from '@/types';
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
 * Progress Store
 * 
 * Manages user learning progress.
 * Uses Neon PostgreSQL for persistent storage.
 */
class ProgressStore {
  /**
   * Get progress for a user
   */
  async getProgress(email: string): Promise<UserProgress | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();
    const result = await db`
      SELECT email, progress, last_active_at
      FROM user_progress
      WHERE email = ${normalizedEmail}
    ` as Array<{
      email: string;
      progress: any; // JSONB from database
      last_active_at: Date;
    }>;

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return {
      email: row.email,
      progress: row.progress as Record<number, QuestionProgress>,
      lastActiveAt: row.last_active_at.toISOString(),
    };
  }

  /**
   * Create or update user progress
   */
  async saveProgress(email: string, questionId: number, correct: boolean, userAnswers?: string[]): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();

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
    
    // Save to database using UPSERT
    const db = getDb();
    await db`
      INSERT INTO user_progress (email, progress, last_active_at)
      VALUES (${normalizedEmail}, ${JSON.stringify(userProgress.progress)}::jsonb, ${userProgress.lastActiveAt})
      ON CONFLICT (email)
      DO UPDATE SET progress = ${JSON.stringify(userProgress.progress)}::jsonb, last_active_at = ${userProgress.lastActiveAt}
    `;
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
    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();
    await db`
      DELETE FROM user_progress WHERE email = ${normalizedEmail}
    `;
  }
}

// Singleton instance
export const progressStore = new ProgressStore();
