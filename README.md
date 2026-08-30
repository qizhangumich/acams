# ACAMS Learning Platform

A web platform for ACAMS (CAMS) certification exam preparation: an 860-question practice bank with progress tracking, a wrong-answer book, review modes, and per-question AI explanations and chat.

**Live site**: https://acams.vercel.app

## Features

- **Question practice** (`/questions`) — answer questions one by one, submit, see the correct answer and explanation, and resume where you left off
- **Mock exams** (`/exam`) — timed simulations (30 / 60 / full 120-question, 210-minute exam) with domain-weighted sampling, a navigation grid, auto-submit at zero, and a scored report (75% pass mark) with per-domain breakdown; misses feed the review schedule
- **Spaced repetition** (`/review/queue`, `/review/session`) — every missed question becomes a review card (SM-2-style scheduling: correct answers push the card out 1d → 3d → interval×ease; wrong answers make it due again immediately)
- **Admin login** (`/login`) — single-user username/password sign-in (credentials via `ADMIN_USERNAME` / `ADMIN_PASSWORD`), JWT session in an HTTP-only cookie
- **Dashboard** (`/dashboard`) — overall and per-domain progress statistics
- **Wrong book** (`/wrong-book`) — every question you've missed, with wrong counts
- **Sprint review** (`/review/sprint`) — exam-sprint dashboard highlighting high-risk questions
- **AI chat & explanations** — per-question chat and AI-generated explanations (English and Chinese) via OpenAI
- **Personal tags & notes** — tag questions and keep a private note per question

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL on Neon (Prisma ORM, pooled connection) |
| Auth | Single-admin username/password + JWT session cookie (`jose`) |
| AI | OpenAI (`gpt-4o-mini`) |
| Hosting | Vercel |

## Local development

### 1. Install

```bash
npm install
```

### 2. Environment variables

Create `.env`:

```env
# Neon Postgres — DATABASE_URL must use the -pooler host; DIRECT_URL the direct host
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxx.REGION.aws.neon.tech/neondb?sslmode=require"

AUTH_SECRET="min-32-character-random-secret"   # signs the session JWT
OPENAI_API_KEY="sk-..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Login credentials (all optional)
# ADMIN_USERNAME defaults to "admin".
# The password is verified against ADMIN_PASSWORD if set, otherwise against
# the SHA-256 digest in ADMIN_PASSWORD_SHA256 (a default digest is built in,
# so the app works with no configuration).
ADMIN_USERNAME="admin"
ADMIN_PASSWORD="..."
ADMIN_EMAIL="zhangqi362@gmail.com"             # the account progress is stored under
```

Notes (Windows/Neon):
- `DATABASE_URL` uses the pooler host (`-pooler`) with `pgbouncer=true`; `DIRECT_URL` uses the direct host — the seed script prefers it for bulk writes.
- Avoid `channel_binding=require` in connection strings if Prisma reports TLS credential errors.

### 3. Database

```bash
npm run db:generate   # generate Prisma client
npm run db:migrate    # apply migrations
npm run db:seed       # load questions.json into the Question table
```

### 4. Run

```bash
npm run dev           # http://localhost:3000
npx next build        # production build check (use this if `npm run build` hits a locked Prisma engine on Windows)
```

## Project structure

```
├── app/
│   ├── api/
│   │   ├── auth/          # send-magic-link, verify, me, logout
│   │   ├── questions/     # question fetch/submit, per-question tags & notes
│   │   ├── progress/      # save/resume/reset/summary
│   │   ├── exam/          # mock exams: start, state, answer, submit
│   │   ├── chat/          # per-question AI chat
│   │   ├── wrong-book/    # wrong answers
│   │   ├── review/        # SRS queue, review answers, sprint dashboard
│   │   └── health/        # health + DB health checks
│   ├── questions/         # practice UI (+ components/: options, tags, notes, chat, explanation)
│   ├── exam/              # exam home, runner, and report UIs
│   ├── dashboard/         # stats UI
│   ├── wrong-book/        # wrong book UI
│   ├── review/            # review UIs (queue, session player, sprint, per-question)
│   ├── components/        # shared UI (OptionList)
│   └── login/, auth/      # login + magic-link verify pages
├── lib/
│   ├── prisma.ts          # Prisma client singleton (the only PrismaClient instance)
│   ├── auth/              # session (JWT), magic-link, email, route auth helper
│   ├── exam/              # exam sampling, timing, scoring
│   ├── review/            # spaced-repetition scheduling (SM-2 lite)
│   └── progress/          # progress service + restore logic
├── middleware.ts          # auth gate for protected pages and API routes
├── prisma/                # schema, migrations, seed
├── scripts/               # maintenance scripts (see below)
└── questions.json         # question bank source of truth (860 questions)
```

## Data model (Prisma)

- **User** — email identity plus resume state (`current_index`, `current_answers`)
- **Question** — the bank, seeded from `questions.json` (domain, options, correct answers, explanations incl. AI EN/CH)
- **UserProgress** — per-user per-question status (`not_started` / `correct` / `wrong`)
- **WrongBook** — wrong-answer counts and recency per user
- **ExamAttempt** — mock exam state: sampled question ids, answers, timing, score, per-domain stats
- **ReviewCard** — spaced-repetition schedule per missed question (interval, ease, reps, lapses, due date)
- **QuestionChat** — per-question chat history
- **UserQuestionTag / UserQuestionNote** — personal tags and notes

## Auth flow

1. `POST /api/auth/login` — checks `{ username, password }` against `ADMIN_USERNAME` / `ADMIN_PASSWORD`, upserts the `ADMIN_EMAIL` account, and sets a 30-day JWT cookie
2. `middleware.ts` guards all app pages and data API routes; it injects `x-user-id` / `x-user-email` headers for handlers and never mutates auth state

## Maintenance scripts

```bash
npm run db:seed                                  # (re)seed questions from questions.json
python scripts/clean_questions.py                # dry-run OCR cleanup of questions.json (--apply to write)
npx tsx scripts/smoke-exam.ts                    # read-only smoke test of exam sampling/scoring
npx tsx scripts/update-database-from-json.ts     # push questions.json edits to the DB
npx tsx scripts/check-env.ts                     # validate env vars
npx tsx scripts/test-db-connection.ts            # DB connectivity check
npm run test:api                                 # API flow test (dev server must be running)
npx tsx scripts/add-english-explanations.ts      # backfill AI explanations (EN)
npx tsx scripts/add-chinese-explanations.ts      # backfill AI explanations (CH)
```

Workflow for editing question content: edit `questions.json` → `npm run db:seed` → spot-check in the app.

## Deployment

Push to `main` → Vercel builds automatically (`prisma generate && next build`). Set all env vars from step 2 in the Vercel project settings. Migrations are applied manually with `npm run db:migrate` against the Neon database.
