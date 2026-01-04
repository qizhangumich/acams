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
│   │   ├── ai/
│   │   │   └── explain/
│   │   │       └── route.ts      # POST AI explanation
│   │   ├── payment/
│   │   │   └── activate/
│   │   │       └── route.ts      # POST Activate paid access
│   │   └── subscription/
│   │       ├── check/
│   │       │   └── route.ts      # GET Check payment status
│   │       └── set/
│   │           └── route.ts      # POST Set payment status
│   ├── questions/
│   │   ├── page.tsx              # Question practice page
│   │   └── page.module.css
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                  # Landing page (email input)
├── lib/
│   ├── data-service.ts           # Load questions.json
│   ├── kv-client.ts              # Vercel KV client wrapper
│   ├── progress-store.ts         # Progress persistence (KV)
│   ├── subscription-store.ts     # Payment status storage (KV)
│   ├── payment-context-store.ts  # Payment context storage (KV)
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
- Vercel KV storage for user progress
- Maps email → progress data
- Persistent across serverless function invocations

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
- Free users: 1 explanation per day per email
- Paid users: Unlimited explanations
- Cached per question and language combination
- Supports English and Chinese languages

### `POST /api/payment/activate`
Body: `{ email: string }`
Activates paid access for a user after payment
- Idempotent operation (safe to call multiple times)
- Normalizes email (trim, lowercase)
- No Stripe verification required (payment handled by Stripe)

### `GET /api/subscription/check?email=user@example.com`
Returns payment status for a user
- Returns: `{ is_paid: boolean, subscribed: boolean }`

## Development

```bash
npm install
npm run dev
```

### Environment Variables

Create a `.env.local` file in the root directory with:

```
OPENAI_API_KEY=your_api_key_here
KV_REST_API_URL=your_vercel_kv_rest_api_url
KV_REST_API_TOKEN=your_vercel_kv_rest_api_token
```

**Required Keys:**
- `OPENAI_API_KEY`: Get from [OpenAI Platform](https://platform.openai.com/api-keys)
- `KV_REST_API_URL`: Get from Vercel Dashboard → Storage → KV → REST API URL
- `KV_REST_API_TOKEN`: Get from Vercel Dashboard → Storage → KV → REST API Token

**Note**: 
- The AI explanation feature requires a valid OpenAI API key. Without it, the AI explanation button will show an error when clicked.
- Payment functionality uses Stripe Payment Links - no API keys needed. Apple Pay and other payment methods are automatically supported by Stripe.
- **Vercel KV is required** for data persistence. See `VERCEL_KV_SETUP.md` for setup instructions.

### Payment Flow

1. User clicks "Subscribe" button → Redirects to Stripe Payment Link
2. User completes payment on Stripe
3. Stripe redirects to `/paid` page
4. User enters their email address
5. System activates paid access for that email
6. User gains unlimited AI explanations

**Important**: Configure your Stripe Payment Link to redirect to:
- Success URL: `https://your-domain.com/paid`

## Deployment to Vercel

1. Push to GitHub
2. Connect repository to Vercel
3. Deploy

### Important Notes for Vercel

The application uses **Vercel KV** for data persistence:
- User progress is stored in KV
- Payment/subscription status is stored in KV
- Payment contexts are stored in KV

**Setup Required:**
1. Create a KV database in Vercel Dashboard
2. Add environment variables: `KV_REST_API_URL` and `KV_REST_API_TOKEN`
3. See `VERCEL_KV_SETUP.md` for detailed setup instructions

All data is now persistent across serverless function invocations.

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

