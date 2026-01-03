import { Question } from '@/types';
import { readFileSync } from 'fs';
import path from 'path';

/**
 * Data service to load questions from questions.json
 * This is the ONLY source of question content - immutable at runtime
 */
class DataService {
  private questions: Question[] = [];
  private initialized = false;

  /**
   * Load questions from questions.json
   * This should only be called once and questions should never be modified
   */
  loadQuestions(): Question[] {
    if (!this.initialized) {
      try {
        const filePath = path.join(process.cwd(), 'questions.json');
        const fileContent = readFileSync(filePath, 'utf-8');
        this.questions = JSON.parse(fileContent) as Question[];
        this.initialized = true;
      } catch (error) {
        console.error('Failed to load questions.json:', error);
        this.questions = [];
      }
    }
    return this.questions;
  }

  /**
   * Get all questions
   */
  getAllQuestions(): Question[] {
    return this.loadQuestions();
  }

  /**
   * Get a question by ID
   */
  getQuestionById(id: number): Question | undefined {
    return this.loadQuestions().find(q => q.id === id);
  }

  /**
   * Get total number of questions
   */
  getTotalQuestions(): number {
    return this.loadQuestions().length;
  }
}

// Singleton instance
export const dataService = new DataService();

