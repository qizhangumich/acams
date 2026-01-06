# ACAMS Learning System - System Architecture & Design

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Core Principles](#core-principles)
3. [Technology Stack](#technology-stack)
4. [Data Models](#data-models)
5. [Database Schema (Prisma)](#database-schema-prisma)
6. [API Architecture](#api-architecture)
7. [Frontend Architecture](#frontend-architecture)
8. [Authentication Flow](#authentication-flow)
9. [ChatGPT Integration](#chatgpt-integration)
10. [User Flows](#user-flows)
11. [Edge Cases & Resilience](#edge-cases--resilience)
12. [Security Considerations](#security-considerations)
13. [Performance Considerations](#performance-considerations)

---

## 🎯 System Overview

### Purpose
A **personal learning system** for ACAMS exam preparation that emphasizes:
- **Long-term study** with persistent progress
- **Question-level thinking** through AI-powered chat
- **Mistake-based review** via wrong book tracking

### Key Differentiators
- **NOT** a simple quiz app
- **Persistent identity** (email-based, no passwords)
- **Persistent progress** across sessions/devices
- **Persistent thinking** (chat history per question)
- **Persistent mistakes** (wrong book for focused review)

### System Goals
- **Crash-resistant**: Progress never lost
- **Progress-aware**: Always resume from last state
- **Learning-oriented**: Focus on understanding, not just testing

---

## 🧠 Core Principles

### 1. Persistence First
- All user state must be persisted immediately
- No reliance on client-side storage alone
- Progress auto-restores on login

### 2. Question-Centric Design
- Each question is a learning unit
- Chat is scoped to individual questions
- Explanations are contextual to the question

### 3. Mistake-Driven Learning
- Wrong answers are tracked and emphasized
- Wrong book enables focused review
- Wrong count helps prioritize study

### 4. Seamless Continuity
- User resumes from last unfinished question
- Chat history reloads when revisiting questions
- Progress persists across devices

---

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: React 18+
- **Styling**: CSS Modules (or Tailwind CSS)
- **State Management**: React Context + Server State (React Query/SWR)
- **Form Handling**: React Hook Form

### Backend
- **Framework**: Next.js API Routes
- **Database ORM**: Prisma
- **Database**: PostgreSQL (via Neon or Vercel Postgres)
- **Authentication**: Email Magic Link (Resend or similar)
- **AI Integration**: OpenAI API (ChatGPT)

### Infrastructure
- **Hosting**: Vercel (recommended)
- **Database**: Neon PostgreSQL or Vercel Postgres
- **Email Service**: Resend, SendGrid, or similar
- **Environment**: Node.js 18+

---

## 📊 Data Models

### User
```typescript
{
  id: string (UUID)
  email: string (unique, indexed)
  created_at: DateTime
  last_active_at: DateTime (nullable)
  last_question_id: number (nullable) // Resume point
}
```

**Purpose**: Unique identity per email. Tracks last activity for resume functionality.

### Question
```typescript
{
  id: number (primary key)
  domain: string
  question_text: string
  options: JSON // { "A": "...", "B": "...", ... }
  correct_answers: string[] // ["A", "B"]
  explanation: string (official explanation)
  explanation_ai_en: string (nullable)
  explanation_ai_ch: string (nullable)
  is_complete: boolean
  normalized_question: string (nullable)
}
```

**Purpose**: Immutable question data. Loaded from JSON initially, AI explanations added later.

**Note**: Questions are read-only after initial load. AI explanations are added via batch process.

### UserProgress
```typescript
{
  id: string (UUID)
  user_id: string (FK -> User)
  question_id: number (FK -> Question)
  status: enum ['not_started', 'correct', 'wrong']
  selected_answer: string[] (nullable) // User's selected answers
  updated_at: DateTime
  created_at: DateTime
}
```

**Purpose**: Tracks per-question progress per user.

**Rules**:
- One record per user-question combination (unique constraint)
- Status updates on each answer attempt
- Auto-restores on login
- Used to determine resume point

**Indexes**:
- `(user_id, question_id)` - unique
- `(user_id, status)` - for filtering
- `(user_id, updated_at)` - for resume logic

### QuestionChat
```typescript
{
  id: string (UUID)
  user_id: string (FK -> User)
  question_id: number (FK -> Question)
  role: enum ['user', 'assistant']
  content: string
  created_at: DateTime
}
```

**Purpose**: Stores ChatGPT conversation per question per user.

**Rules**:
- Chat is strictly scoped to current question
- History reloads when revisiting question
- System prompt restricts answers to exam logic
- Ordered by `created_at` for conversation flow

**Indexes**:
- `(user_id, question_id, created_at)` - for loading chat history

### WrongBook
```typescript
{
  id: string (UUID)
  user_id: string (FK -> User)
  question_id: number (FK -> Question)
  wrong_count: number (default: 1)
  last_wrong_at: DateTime
  created_at: DateTime
}
```

**Purpose**: Tracks mistakes for focused review.

**Rules**:
- Increment `wrong_count` on each wrong attempt
- Update `last_wrong_at` on each wrong attempt
- Used to generate Wrong Questions page
- One record per user-question (unique constraint)

**Indexes**:
- `(user_id, question_id)` - unique
- `(user_id, wrong_count DESC, last_wrong_at DESC)` - for wrong book page

---

## 🗄 Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id              String    @id @default(uuid())
  email           String    @unique
  created_at      DateTime  @default(now())
  last_active_at  DateTime?
  last_question_id Int?

  progress        UserProgress[]
  chats           QuestionChat[]
  wrong_book      WrongBook[]

  @@index([email])
  @@index([last_active_at])
}

model Question {
  id                  Int      @id
  domain              String
  question_text       String   @db.Text
  options             Json     // { "A": "...", "B": "..." }
  correct_answers     String[] // ["A", "B"]
  explanation         String   @db.Text
  explanation_ai_en   String?  @db.Text
  explanation_ai_ch   String?  @db.Text
  is_complete         Boolean  @default(false)
  normalized_question String?  @db.Text

  progress            UserProgress[]
  chats               QuestionChat[]
  wrong_book          WrongBook[]

  @@index([domain])
  @@index([is_complete])
}

model UserProgress {
  id              String    @id @default(uuid())
  user_id         String
  question_id     Int
  status          ProgressStatus @default(not_started)
  selected_answer String[]?
  updated_at      DateTime  @default(now()) @updatedAt
  created_at      DateTime  @default(now())

  user            User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  question        Question  @relation(fields: [question_id], references: [id], onDelete: Cascade)

  @@unique([user_id, question_id])
  @@index([user_id, status])
  @@index([user_id, updated_at])
}

enum ProgressStatus {
  not_started
  correct
  wrong
}

model QuestionChat {
  id          String   @id @default(uuid())
  user_id     String
  question_id Int
  role        ChatRole
  content     String   @db.Text
  created_at  DateTime @default(now())

  user        User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  question    Question @relation(fields: [question_id], references: [id], onDelete: Cascade)

  @@index([user_id, question_id, created_at])
}

enum ChatRole {
  user
  assistant
}

model WrongBook {
  id            String   @id @default(uuid())
  user_id       String
  question_id   Int
  wrong_count   Int      @default(1)
  last_wrong_at DateTime @default(now())
  created_at    DateTime @default(now())

  user          User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  question      Question @relation(fields: [question_id], references: [id], onDelete: Cascade)

  @@unique([user_id, question_id])
  @@index([user_id, wrong_count(sort: Desc), last_wrong_at(sort: Desc)])
}
```

---

## 🔌 API Architecture

### Authentication Routes

#### `POST /api/auth/send-magic-link`
**Purpose**: Send magic link email to user

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Magic link sent to email"
}
```

**Logic**:
1. Validate email format
2. Generate secure token (JWT or crypto.randomBytes)
3. Store token in database with expiration (e.g., 15 minutes)
4. Send email with magic link: `https://domain.com/auth/verify?token=xxx&email=xxx`
5. Return success (don't reveal if email exists)

#### `GET /api/auth/verify`
**Purpose**: Verify magic link token and create/login user

**Query Params**:
- `token`: Magic link token
- `email`: User email

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "sessionToken": "jwt-token"
}
```

**Logic**:
1. Validate token and expiration
2. Verify email matches token
3. Find or create user
4. Restore progress state
5. Generate session token (JWT)
6. Return user data and session token
7. Redirect to question page (or last question)

#### `GET /api/auth/me`
**Purpose**: Get current user from session

**Headers**: `Authorization: Bearer <sessionToken>`

**Response**:
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "last_question_id": 123
  }
}
```

#### `POST /api/auth/logout`
**Purpose**: Invalidate session

**Response**:
```json
{
  "success": true
}
```

### Question Routes

#### `GET /api/questions`
**Purpose**: Get all questions (for initial load)

**Query Params**:
- `domain` (optional): Filter by domain

**Response**:
```json
{
  "questions": [
    {
      "id": 1,
      "domain": "AML",
      "question_text": "...",
      "options": { "A": "...", "B": "..." },
      "correct_answers": ["A"],
      "explanation": "...",
      "explanation_ai_en": "...",
      "explanation_ai_ch": "..."
    }
  ],
  "total": 500
}
```

**Note**: Questions are loaded from JSON file initially, then served from database.

#### `GET /api/questions/:id`
**Purpose**: Get single question with user's progress

**Headers**: `Authorization: Bearer <sessionToken>`

**Response**:
```json
{
  "question": {
    "id": 1,
    "domain": "AML",
    "question_text": "...",
    "options": { "A": "...", "B": "..." },
    "correct_answers": ["A"],
    "explanation": "...",
    "explanation_ai_en": "...",
    "explanation_ai_ch": "..."
  },
  "progress": {
    "status": "not_started",
    "selected_answer": null
  },
  "chat_history": [
    {
      "role": "user",
      "content": "...",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Progress Routes

#### `POST /api/progress`
**Purpose**: Save user's answer and update progress

**Headers**: `Authorization: Bearer <sessionToken>`

**Request**:
```json
{
  "question_id": 1,
  "selected_answer": ["A"],
  "is_correct": true
}
```

**Response**:
```json
{
  "success": true,
  "progress": {
    "status": "correct",
    "selected_answer": ["A"]
  }
}
```

**Logic**:
1. Validate user session
2. Upsert UserProgress record
3. If wrong, update/insert WrongBook record
4. Update User.last_question_id
5. Update User.last_active_at
6. Return updated progress

#### `GET /api/progress`
**Purpose**: Get user's overall progress

**Headers**: `Authorization: Bearer <sessionToken>`

**Response**:
```json
{
  "total_questions": 500,
  "completed": 150,
  "correct": 120,
  "wrong": 30,
  "not_started": 350,
  "last_question_id": 123
}
```

#### `GET /api/progress/resume`
**Purpose**: Get next question to resume from

**Headers**: `Authorization: Bearer <sessionToken>`

**Response**:
```json
{
  "question_id": 123,
  "question": { ... }
}
```

**Logic**:
1. Check User.last_question_id
2. Find first question with status 'not_started' after last_question_id
3. If none, return first not_started question
4. Return question data

### Chat Routes

#### `GET /api/chat/:questionId`
**Purpose**: Get chat history for a question

**Headers**: `Authorization: Bearer <sessionToken>`

**Response**:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "...",
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "role": "assistant",
      "content": "...",
      "created_at": "2024-01-01T00:00:01Z"
    }
  ]
}
```

#### `POST /api/chat/:questionId`
**Purpose**: Send message to ChatGPT and save response

**Headers**: `Authorization: Bearer <sessionToken>`

**Request**:
```json
{
  "message": "Why is A the correct answer?"
}
```

**Response**:
```json
{
  "message": {
    "role": "assistant",
    "content": "...",
    "created_at": "2024-01-01T00:00:01Z"
  }
}
```

**Logic**:
1. Validate user session
2. Load chat history for this question
3. Load question data (text, options, correct_answers)
4. Construct system prompt with question context
5. Call OpenAI API with chat history
6. Save user message and assistant response to QuestionChat
7. Return assistant response

### Wrong Book Routes

#### `GET /api/wrong-book`
**Purpose**: Get user's wrong questions

**Headers**: `Authorization: Bearer <sessionToken>`

**Query Params**:
- `domain` (optional): Filter by domain
- `limit` (optional): Limit results
- `offset` (optional): Pagination offset

**Response**:
```json
{
  "questions": [
    {
      "question_id": 1,
      "question": { ... },
      "wrong_count": 3,
      "last_wrong_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 30
}
```

---

## 🖥 Frontend Architecture

### Page Structure

```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx          # Email input + magic link request
│   └── auth/
│       └── verify/
│           └── page.tsx      # Magic link verification
├── (protected)/
│   ├── questions/
│   │   ├── page.tsx          # Question list / navigation
│   │   └── [id]/
│   │       └── page.tsx      # Individual question page
│   ├── dashboard/
│   │   └── page.tsx          # Progress dashboard
│   └── wrong-book/
│       └── page.tsx          # Wrong questions page
└── layout.tsx                # Root layout with auth provider
```

### Component Structure

```
components/
├── auth/
│   ├── LoginForm.tsx         # Email input form
│   └── MagicLinkSent.tsx     # Confirmation message
├── questions/
│   ├── QuestionCard.tsx       # Question display
│   ├── OptionsList.tsx        # Answer options
│   ├── ExplanationPanel.tsx   # Collapsible explanation tabs
│   │   ├── OfficialExplanation.tsx
│   │   ├── AIExplanationEN.tsx
│   │   ├── AIExplanationCH.tsx
│   │   └── QuestionChat.tsx
│   └── AnswerFeedback.tsx    # Correct/wrong feedback
├── progress/
│   ├── ProgressStats.tsx      # Stats display
│   └── ResumeButton.tsx       # Resume from last question
├── wrong-book/
│   ├── WrongQuestionList.tsx
│   └── WrongQuestionCard.tsx
└── shared/
    ├── LoadingSpinner.tsx
    ├── ErrorMessage.tsx
    └── DomainFilter.tsx
```

### State Management

#### Server State (React Query/SWR)
- User session
- Questions data
- Progress data
- Chat history
- Wrong book data

#### Client State (React Context)
- Current question ID
- Selected answers (before submission)
- UI state (explanation panel open/closed, active tab)

### Key Pages

#### Question Page (`/questions/[id]`)
**Layout**:
```
┌─────────────────────────────────────┐
│  Question Navigation (prev/next)     │
├─────────────────────────────────────┤
│  Question Text                       │
│  ┌─────────────────────────────────┐ │
│  │ Options (A, B, C, D)           │ │
│  │ [Select answers]                │ │
│  └─────────────────────────────────┘ │
│  [Submit Answer]                     │
├─────────────────────────────────────┤
│  Explanation Panel (collapsed)      │
│  ┌─────────────────────────────────┐ │
│  │ Tabs: Official | AI EN | AI 中文│ │
│  │                                │ │
│  │ [Selected Tab Content]         │ │
│  │                                │ │
│  │ [Ask about this question]      │ │
│  │ ┌─────────────────────────────┐│ │
│  │ │ Chat Interface              ││ │
│  │ │ [Message history]           ││ │
│  │ │ [Input field]               ││ │
│  │ └─────────────────────────────┘│ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Features**:
- Question text and options
- Multi-select answer (if multiple correct answers)
- Submit button (disabled until answer selected)
- Feedback on submit (correct/wrong)
- Explanation panel (collapsible, tabbed)
- Chat interface (scoped to question)

#### Dashboard (`/dashboard`)
**Layout**:
```
┌─────────────────────────────────────┐
│  Progress Statistics                 │
│  ┌─────────┬─────────┬─────────┐   │
│  │ Total   │ Complete│ Correct │   │
│  │ 500     │ 150     │ 120     │   │
│  └─────────┴─────────┴─────────┘   │
│  ┌─────────┬─────────┐             │
│  │ Wrong   │ Not Done│             │
│  │ 30      │ 350     │             │
│  └─────────┴─────────┘             │
│                                     │
│  [Resume from Last Question]       │
│  [View Wrong Book]                  │
└─────────────────────────────────────┘
```

#### Wrong Book Page (`/wrong-book`)
**Layout**:
```
┌─────────────────────────────────────┐
│  Wrong Questions (30)               │
│  [Domain Filter: All | AML | ...]   │
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐ │
│  │ Q123: Question text...          │ │
│  │ Wrong: 3 times                  │ │
│  │ Last wrong: 2 days ago          │ │
│  │ [Review Question]               │ │
│  └─────────────────────────────────┘ │
│  ┌─────────────────────────────────┐ │
│  │ Q456: Question text...          │ │
│  │ Wrong: 2 times                  │ │
│  │ Last wrong: 5 days ago          │ │
│  │ [Review Question]               │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

### Magic Link Flow

1. **User enters email** → `POST /api/auth/send-magic-link`
2. **System generates token** → Store in database with expiration
3. **System sends email** → Link: `https://domain.com/auth/verify?token=xxx&email=xxx`
4. **User clicks link** → `GET /api/auth/verify`
5. **System validates token** → Check expiration, verify email
6. **System creates/finds user** → Upsert User record
7. **System restores progress** → Load UserProgress, last_question_id
8. **System generates session** → JWT token
9. **System redirects** → `/questions/[last_question_id]` or `/dashboard`

### Session Management

- **JWT Token**: Stored in HTTP-only cookie or localStorage
- **Token Expiration**: 30 days (configurable)
- **Refresh**: On each API call, extend expiration
- **Logout**: Invalidate token on server

### Token Verification

**Middleware**: `middleware.ts` (Next.js)
```typescript
// Verify JWT on protected routes
// Extract user_id from token
// Attach to request context
```

---

## 🤖 ChatGPT Integration

### System Prompt (Fixed)

```
You are an ACAMS exam tutor. Only answer questions related to the current exam question. Explain using exam logic and regulatory reasoning. Do not introduce unrelated concepts. Do not expand beyond the scope of the question.

Current Question:
[Question text]

Options:
[Options list]

Correct Answer: [Hidden from user, used for context only]

User's Question: [User's chat message]
```

### Chat Context

**Included in every request**:
- Question text
- Options
- Correct answer (for context, not shown to user)
- Chat history (conversation so far)

**Excluded**:
- User's previous answers
- Progress status
- Other questions

### API Integration

**Endpoint**: `POST /api/chat/:questionId`

**Request Flow**:
1. Load question data
2. Load chat history from QuestionChat
3. Construct messages array:
   - System message (with question context)
   - Chat history (user/assistant pairs)
   - New user message
4. Call OpenAI API:
   ```typescript
   openai.chat.completions.create({
     model: "gpt-4o-mini",
     messages: [...],
     temperature: 0.7,
     max_tokens: 500
   })
   ```
5. Save user message and assistant response to QuestionChat
6. Return assistant response

### Rate Limiting

- **Per user**: 50 messages per hour (configurable)
- **Per question**: No limit (chat is scoped to question)
- **Error handling**: Graceful degradation if API fails

---

## 🔁 User Flows

### Flow 1: First-Time User

1. User opens site → `/login`
2. User enters email → `POST /api/auth/send-magic-link`
3. User receives email → Clicks magic link
4. System verifies → Creates user, initializes progress
5. System redirects → `/questions/1` (first question)
6. User answers question → `POST /api/progress`
7. System saves progress → Updates UserProgress, WrongBook (if wrong)
8. User views explanation → Opens explanation panel
9. User chats → `POST /api/chat/1`
10. User leaves → Progress saved

### Flow 2: Returning User

1. User opens site → `/login`
2. User enters email → `POST /api/auth/send-magic-link`
3. User receives email → Clicks magic link
4. System verifies → Finds existing user
5. System restores progress → Loads UserProgress, last_question_id
6. System redirects → `/questions/[last_question_id]` or next not_started
7. User continues → Seamless continuation

### Flow 3: Review Wrong Questions

1. User navigates → `/wrong-book`
2. System loads → `GET /api/wrong-book`
3. User sees list → Wrong questions with counts
4. User clicks question → `/questions/[id]`
5. System loads → Question + chat history
6. User reviews → Views explanation, chats
7. User re-answers → `POST /api/progress`
8. System updates → WrongBook.wrong_count increments if still wrong

### Flow 4: Question Chat

1. User on question page → `/questions/123`
2. User opens chat → Clicks "Ask about this question"
3. System loads history → `GET /api/chat/123`
4. User types message → "Why is A correct?"
5. System sends → `POST /api/chat/123`
6. System calls OpenAI → With question context + history
7. System saves → User message + assistant response
8. System displays → Response in chat interface
9. User continues → Conversation scoped to question 123

---

## 🛡 Edge Cases & Resilience

### Refresh
- **Problem**: User refreshes page mid-answer
- **Solution**: 
  - Auto-save selected answers to client state
  - Restore from UserProgress on load
  - Show "Resume" if partial attempt exists

### Crash
- **Problem**: Browser/app crashes
- **Solution**:
  - Progress saved immediately on submit
  - Selected answers saved to localStorage (backup)
  - On reload, restore from database first, then localStorage

### Device Switch
- **Problem**: User switches devices
- **Solution**:
  - All state in database
  - Magic link works on any device
  - Progress syncs automatically

### Partial Attempt
- **Problem**: User selects answer but doesn't submit
- **Solution**:
  - Save to localStorage
  - Show "Continue" button on return
  - Don't mark as "answered" until submit

### Re-answering
- **Problem**: User wants to re-answer question
- **Solution**:
  - Allow re-submission
  - Update UserProgress.status
  - Increment WrongBook.wrong_count if wrong again

### Multiple Wrong Attempts
- **Problem**: User gets question wrong multiple times
- **Solution**:
  - WrongBook.wrong_count increments
  - Wrong book shows count
  - Prioritize high-count questions

### Network Failure
- **Problem**: API call fails
- **Solution**:
  - Retry with exponential backoff
  - Show error message
  - Save to localStorage as backup
  - Sync when connection restored

### Token Expiration
- **Problem**: Magic link token expires
- **Solution**:
  - Show "Link expired" message
  - Offer to resend magic link
  - Clear expired tokens from database

---

## 🔒 Security Considerations

### Authentication
- **Magic link tokens**: Cryptographically secure (crypto.randomBytes)
- **Token expiration**: 15 minutes
- **One-time use**: Invalidate after verification
- **Email verification**: Token must match email

### Authorization
- **Session tokens**: JWT with user_id
- **Protected routes**: Middleware verifies token
- **User isolation**: All queries filtered by user_id

### Data Protection
- **SQL injection**: Prisma parameterized queries
- **XSS**: React auto-escaping
- **CSRF**: SameSite cookies
- **Rate limiting**: Per-user API limits

### Privacy
- **Email storage**: Encrypted at rest (database)
- **Chat history**: User-specific, not shared
- **Progress data**: User-specific, not shared

---

## ⚡ Performance Considerations

### Database
- **Indexes**: All foreign keys and query patterns indexed
- **Connection pooling**: Prisma connection pool
- **Query optimization**: Select only needed fields

### Caching
- **Questions**: Cache in memory (immutable)
- **Progress**: Cache per session
- **Chat history**: Load on demand, cache in component

### API Optimization
- **Batch loading**: Load multiple questions at once
- **Pagination**: Wrong book paginated
- **Lazy loading**: Chat history loaded on open

### Frontend
- **Code splitting**: Route-based splitting
- **Image optimization**: Next.js Image component
- **Static generation**: Question data pre-rendered

---

## 📝 Implementation Notes

### Phase 1: Core Setup
1. Initialize Next.js project
2. Set up Prisma with PostgreSQL
3. Create database schema
4. Seed questions from JSON

### Phase 2: Authentication
1. Implement magic link flow
2. Set up email service
3. Create session management
4. Add protected routes middleware

### Phase 3: Question System
1. Build question page
2. Implement answer submission
3. Add progress tracking
4. Create explanation panel

### Phase 4: Chat Integration
1. Integrate OpenAI API
2. Build chat interface
3. Implement chat history
4. Add rate limiting

### Phase 5: Wrong Book
1. Build wrong book page
2. Implement wrong tracking
3. Add domain filtering
4. Create review flow

### Phase 6: Polish
1. Add error handling
2. Implement loading states
3. Add edge case handling
4. Performance optimization

---

## 🎨 UX Guidelines

### Design Principles
- **Calm**: No aggressive colors or animations
- **Serious**: Professional, compliance-focused
- **Trustworthy**: Clear, consistent, reliable
- **Personal**: Feels like a personal tutor

### Visual Hierarchy
- **Question**: Large, clear text
- **Options**: Easy to read, easy to select
- **Feedback**: Immediate, clear (green/red)
- **Explanations**: Collapsible, organized

### Interactions
- **Smooth**: No jarring transitions
- **Responsive**: Immediate feedback on actions
- **Forgiving**: Easy to undo, easy to correct
- **Guided**: Clear next steps

---

## ✅ Quality Checklist

### Functionality
- [ ] Magic link authentication works
- [ ] Progress persists across sessions
- [ ] Chat history loads correctly
- [ ] Wrong book tracks mistakes
- [ ] Resume from last question works

### Resilience
- [ ] Handles network failures
- [ ] Handles token expiration
- [ ] Handles crashes gracefully
- [ ] Handles device switches

### Performance
- [ ] Fast page loads
- [ ] Smooth interactions
- [ ] Efficient database queries
- [ ] Optimized API calls

### Security
- [ ] Secure authentication
- [ ] User data isolation
- [ ] SQL injection prevention
- [ ] XSS prevention

---

**End of Architecture Document**

