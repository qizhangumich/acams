# ACAMS Question Bank

A clean, minimal question bank application for ACAMS certification practice.

## Architecture

### Data Layer
- **Source**: `questions.json` is the ONLY content source
- **Location**: Root directory
- **Loading**: Questions are loaded via `lib/data-service.ts`
- **Immutable**: Question content is never modified at runtime

### Account System
- **Email-only**: No passwords, no verification, no magic links
- **Storage**: Email stored in browser `localStorage` (client-side)
- **Model**: Simple user identifier based on email

### Progress Tracking
- **Storage**: File-based JSON store (`progress-data.json`)
- **API**: `/api/progress` endpoints handle progress persistence
- **Model**: Tracks answered questions, correctness, and timestamps per email

### File Structure

```
├── app/
│   ├── api/
│   │   ├── questions/
│   │   │   └── route.ts          # GET all questions
│   │   ├── progress/
│   │   │   ├── route.ts          # GET/POST progress
│   │   │   └── reset/
│   │   │       └── route.ts      # Reset progress
│   │   └── ai/
│   │       └── explain/
│   │           └── route.ts      # POST AI explanation
│   ├── questions/
│   │   ├── page.tsx              # Question practice page
│   │   └── page.module.css
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # Landing page (email input)
├── lib/
│   ├── data-service.ts           # Load questions.json
│   ├── progress-store.ts         # Progress persistence
│   └── ai-cache.ts               # AI explanation cache & rate limiting
├── types/
│   └── index.ts                  # TypeScript types
├── questions.json                 # Question content (immutable)
└── package.json
```

## Key Components

### 1. Data Service (`lib/data-service.ts`)
- Singleton service that loads `questions.json` once
- Provides methods to get all questions or by ID
- Questions are immutable after loading

### 2. Progress Store (`lib/progress-store.ts`)
- File-based storage for user progress
- Maps email → progress data
- **Note**: For Vercel production, consider using a database (Vercel KV, Postgres, etc.)

### 3. Landing Page (`app/page.tsx`)
- Simple email input form
- Stores email in `localStorage`
- Redirects to `/questions` after submission

### 4. Questions Page (`app/questions/page.tsx`)
- Loads questions from API
- Displays questions with multiple choice options (uses `normalized_question`)
- Tracks and saves progress automatically
- AI explanation feature for incorrect answers
- Language toggle (English/Chinese) for AI explanations
- Navigation between questions
- Reset progress option

### 5. AI Explanation Service (`lib/ai-cache.ts`)
- In-memory caching of AI explanations per question and language
- Rate limiting: 1 explanation per day per email
- Prevents duplicate API calls for the same question+language

### 6. AI Explanation API (`app/api/ai/explain/route.ts`)
- Integrates with OpenAI Chat Completions API
- Uses gpt-4o-mini model for cost efficiency
- Generates exam-oriented explanations following CAMS exam logic
- Returns structured explanations with bullet points

## API Endpoints

### `GET /api/questions`
Returns all questions from `questions.json`

### `GET /api/progress?email=user@example.com`
Returns progress for a user

### `POST /api/progress`
Body: `{ email: string, questionId: number, correct: boolean }`
Saves progress for a question

### `POST /api/progress/reset`
Body: `{ email: string }`
Resets all progress for a user

### `POST /api/ai/explain`
Body: `{ question_id, question, options, correct_answers, user_answers, topic, language, email }`
Generates AI-powered explanation for an incorrectly answered question
- Rate limited: 1 explanation per day per email
- Cached per question and language combination
- Supports English and Chinese languages

## Development

```bash
npm install
npm run dev
```

### Environment Variables

Create a `.env.local` file in the root directory with:

```
OPENAI_API_KEY=your_api_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

**Required Keys:**
- `OPENAI_API_KEY`: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Get from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
- `STRIPE_SECRET_KEY`: Get from [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

**Note**: 
- The AI explanation feature requires a valid OpenAI API key. Without it, the AI explanation button will show an error when clicked.
- Payment functionality (including Apple Pay) requires valid Stripe keys. Apple Pay will automatically appear as an option on supported devices when using Stripe Payment Element.

## Deployment to Vercel

1. Push to GitHub
2. Connect repository to Vercel
3. Deploy

### Important Notes for Vercel

The current progress store uses file-based storage, which **will not persist** across serverless function invocations on Vercel. For production:

1. **Option 1**: Use Vercel KV (Redis)
2. **Option 2**: Use Vercel Postgres
3. **Option 3**: Use a third-party database (Supabase, PlanetScale, etc.)

The code structure is ready - just replace `lib/progress-store.ts` with a database-backed implementation.

## Constraints Met

✅ `questions.json` as ONLY content source  
✅ Email-only authentication (no passwords, verification, magic links)  
✅ Persistent learning progress per email  
✅ AI-powered explanations for incorrect answers  
✅ Language support (English/Chinese) for AI explanations  
✅ Rate limiting and caching for AI features  
✅ Simple, stable code suitable for Vercel  
✅ No unnecessary abstractions  
✅ Minimal, readable files  

