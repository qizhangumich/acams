# Architecture Overview

## Data Flow

### 1. Questions Loading
```
questions.json (root)
    ↓
lib/data-service.ts (server-side only)
    ↓
app/api/questions/route.ts
    ↓
app/questions/page.tsx (client-side fetch)
```

**Key Points:**
- `questions.json` is read only via `fs.readFileSync` in `data-service.ts`
- Questions are never modified at runtime
- Questions are served via API route to client components

### 2. Email Storage
```
User enters email
    ↓
app/page.tsx (landing page)
    ↓
localStorage.setItem('userEmail', email)
    ↓
app/questions/page.tsx reads from localStorage
```

**Key Points:**
- Email is stored in browser `localStorage` (client-side only)
- No server-side session management
- Email is used as user identifier for progress tracking

### 3. Progress Persistence
```
User answers question
    ↓
app/questions/page.tsx
    ↓
POST /api/progress { email, questionId, correct }
    ↓
lib/progress-store.ts
    ↓
progress-data.json (file-based storage)
```

**Key Points:**
- Progress is saved to server via API
- File-based storage works for development
- For Vercel production, replace `progress-store.ts` with database-backed implementation

## Data Models

### Question (from questions.json)
```typescript
{
  id: number;
  domain: string;
  question: string;
  options: Record<string, string>;  // { "A": "...", "B": "..." }
  correct_answers: string[];        // ["A", "B"]
  explanation: string;
  is_complete: boolean;
  normalized_question: string;
}
```

### UserProgress
```typescript
{
  email: string;
  progress: {
    [questionId: number]: {
      answered: boolean;
      correct: boolean;
      lastAnsweredAt?: string;
    }
  };
  lastActiveAt: string;
}
```

## File Locations

| Component | Location | Purpose |
|-----------|----------|---------|
| Questions Data | `questions.json` | Immutable question content |
| Data Service | `lib/data-service.ts` | Load questions.json |
| Progress Store | `lib/progress-store.ts` | Persist user progress |
| Landing Page | `app/page.tsx` | Email input |
| Questions Page | `app/questions/page.tsx` | Question practice UI |
| Questions API | `app/api/questions/route.ts` | Serve questions |
| Progress API | `app/api/progress/route.ts` | Save/load progress |

## Storage Strategy

### Current (Development)
- **Email**: Browser `localStorage`
- **Progress**: File-based JSON (`progress-data.json`)

### Production (Vercel)
- **Email**: Browser `localStorage` (unchanged)
- **Progress**: Database (Vercel KV, Postgres, or third-party)

## Security Considerations

1. **Email Validation**: Basic regex validation on client-side
2. **No Authentication**: Email is treated as identifier only
3. **Progress Access**: Progress is tied to email - no cross-user access protection
4. **API Security**: No rate limiting or authentication (add if needed)

## Future Enhancements (if needed)

1. Replace file-based progress store with database
2. Add question filtering by domain
3. Add progress statistics/analytics
4. Add question search functionality
5. Add export progress feature

