# ACAMS Learning System Guide

## What this project is

This is a `Next.js + Prisma + PostgreSQL (Neon)` learning system for ACAMS exam practice.

Main capabilities:

- magic-link email login
- question practice
- progress tracking
- wrong-book review
- dashboard statistics
- per-question AI chat

## Environment setup

Create or update `.env` with working database credentials and app secrets.

Recommended Neon setup:

```env
DATABASE_URL="postgresql://USER:PASSWORD@YOUR-POOLER-HOST/neondb?sslmode=require&pgbouncer=true"
DIRECT_URL="postgresql://USER:PASSWORD@YOUR-DIRECT-HOST/neondb?sslmode=require"
JWT_SECRET="your-secret"
OPENAI_API_KEY="your-openai-key"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Notes:

- `DATABASE_URL` should use the Neon `-pooler` host.
- `DIRECT_URL` should use the direct host without `-pooler`.
- On Windows, avoid `channel_binding=require` if Prisma client shows TLS credential errors.

## First-time setup

Install dependencies:

```bash
npm install
```

Generate the Prisma client:

```bash
npm run db:generate
```

Run migrations:

```bash
npm run db:migrate
```

Seed the question bank from `questions.json`:

```bash
npm run db:seed
```

## Start the app

For local development:

```bash
npm run dev
```

For a production build check:

```bash
npx next build
```

Open:

- `http://localhost:3000`

## How to use the app

### 1. Log in

Go to `/login`, enter your email, and use the magic link sent to your inbox.

### 2. Practice questions

Go to `/questions`.

You can:

- answer the current question
- submit and see whether you were correct
- move to the next question
- resume from saved progress

### 3. Review performance

Use:

- `/dashboard` for overall progress
- `/wrong-book` for missed questions
- `/review/queue` for review items
- `/review/sprint` for sprint review statistics

### 4. Ask AI about a question

Open a question and use the chat panel to ask for clarification about that specific question.

## Database commands

Useful commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
npx prisma migrate status
npx prisma db pull
```

What they do:

- `db:generate`: regenerate Prisma client
- `db:migrate`: apply schema changes to the database
- `db:seed`: load or refresh the `Question` table from `questions.json`
- `migrate status`: check whether migrations are up to date
- `db pull`: introspect an existing non-empty database

## Current project notes

- The question source of truth is `questions.json`.
- The seed script reads `questions.json` and upserts all questions into the `Question` table.
- The seed script is configured to prefer `DIRECT_URL`, which is more reliable for bulk writes.
- The build currently succeeds with `npx next build`.

## Troubleshooting

### `prisma db pull` says the database is empty

That usually means the connection works, but the database has no tables yet.

Run:

```bash
npm run db:migrate
```

### Seed fails with TLS or credential errors on Windows

Check:

- `DIRECT_URL` exists
- `DIRECT_URL` does not use the `-pooler` host
- connection strings do not include `channel_binding=require`

Then rerun:

```bash
npm run db:seed
```

### `npm run build` fails during `prisma generate` on Windows

This can happen when Prisma's engine file is locked by the OS.

Use:

```bash
npx next build
```

If it keeps happening, close other Node processes and try again.

## Recommended workflow

When updating question data:

1. edit `questions.json`
2. run `npm run db:seed`
3. verify a few rows in the app or database

When updating schema:

1. edit `prisma/schema.prisma`
2. run `npm run db:migrate`
3. run `npm run db:generate`

