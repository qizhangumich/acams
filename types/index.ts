// Question data structure from questions.json
export interface Question {
  id: number;
  domain: string;
  question: string;
  options: Record<string, string>;
  correct_answers: string[];
  explanation: string;
  is_complete: boolean;
  normalized_question: string;
}

// User model
export interface User {
  email: string;
  createdAt: string;
}

// Progress model
export interface QuestionProgress {
  answered: boolean;
  correct: boolean;
  lastAnsweredAt?: string;
  userAnswers?: string[];
}

export interface UserProgress {
  email: string;
  progress: Record<number, QuestionProgress>;
  lastActiveAt: string;
}

