# ACAMS Learning System

A comprehensive learning system for ACAMS certification exam preparation with AI-powered explanations, progress tracking, and review modes.

## 🚀 Features

### Core Features
- **Question Bank**: Practice questions from `questions.json`
- **Progress Tracking**: Persistent learning progress per user
- **Email Magic Link Authentication**: Passwordless login via email
- **AI Explanations**: AI-powered explanations for incorrect answers (English & Chinese)
- **Question Chat**: Per-question AI chat for deeper understanding
- **Dashboard**: Overall progress statistics and domain-level aggregation
- **Wrong Book**: Track and review incorrect answers
- **Review Mode**: Exam sprint review with high-risk question identification

### Technical Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (Neon) - The database server
- **Database Access**: Prisma ORM - The access layer (replaces direct connections)
- **Authentication**: JWT-based session with HTTP-only cookies
- **AI**: OpenAI GPT-4o-mini for explanations and chat
- **Email**: Resend for magic link delivery
- **Deployment**: Vercel

> **Architecture Note**: PostgreSQL is the database. Prisma is the access layer (not a database replacement). See [DATABASE_ARCHITECTURE.md](./DATABASE_ARCHITECTURE.md) for details.

---

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database (Neon recommended)
- OpenAI API key
- Resend API key (for email)

---

## 🛠️ Local Development

### 1. Clone Repository

```bash
git clone https://github.com/qizhangumich/acams.git
cd acams
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create `.env.local`:

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"

# JWT Secret (min 32 characters)
JWT_SECRET="your-strong-random-secret-min-32-characters"

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxx"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# OpenAI
OPENAI_API_KEY="sk-xxxxxxxxxxxxx"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Set Up Database

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed questions from questions.json
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3000

---

## 🚀 Deployment to Vercel

### Quick Deploy

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com
   - Click "Add New..." → "Project"
   - Select `qizhangumich/acams` repository
   - Click "Import"

3. **Configure Environment Variables**
   - Add all required environment variables (see `.env.local` above)
   - Ensure all environments are selected (Production, Preview, Development)

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

5. **Set Up Database**
   - Create Neon PostgreSQL database
   - Run migrations: `npm run db:migrate`
   - Seed data: `npm run db:seed`

**详细部署指南**: 查看 [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)

---

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/              # Authentication (magic link, verify, me, logout)
│   │   ├── progress/          # Progress tracking (save, resume, get)
│   │   ├── chat/             # Question-level chat
│   │   ├── questions/        # Question data
│   │   ├── dashboard/        # Dashboard statistics
│   │   ├── wrong-book/       # Wrong book data
│   │   └── review/           # Review mode (sprint dashboard, queue)
│   ├── questions/            # Question practice page
│   ├── dashboard/            # Dashboard page
│   ├── wrong-book/           # Wrong book page
│   ├── review/               # Review mode pages
│   └── login/                # Login page
├── lib/
│   ├── prisma.ts             # Prisma client
│   ├── auth/                 # Authentication utilities
│   ├── progress/              # Progress restoration logic
│   └── db-client.ts          # Database client wrapper
├── prisma/
│   ├── schema.prisma         # Database schema
│   ├── seed.ts               # Seed script
│   └── migrations/           # Database migrations
├── scripts/
│   └── test-api-flow.ts      # API testing script
└── questions.json            # Question content (immutable)
```

---

## 🗄️ Database Schema

### Models

- **User**: User accounts (email, last_question_id, last_active_at)
- **Question**: Question bank (read-only, loaded from JSON)
- **UserProgress**: Per-question progress tracking
- **WrongBook**: Wrong answer tracking (wrong_count, last_wrong_at)
- **QuestionChat**: Per-question chat history
- **MagicLinkToken**: Magic link authentication tokens

See `prisma/schema.prisma` for full schema.

---

## 🔐 Authentication Flow

1. User enters email → `POST /api/auth/send-magic-link`
2. System sends magic link email
3. User clicks link → `GET /api/auth/verify?token=xxx`
4. System creates/updates user, sets JWT session cookie
5. User is authenticated (session persists for 30 days)

---

## 📊 API Endpoints

### Authentication
- `POST /api/auth/send-magic-link` - Send magic link email
- `GET /api/auth/verify` - Verify magic link token
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Log out

### Progress
- `GET /api/progress/resume` - Resume from last question
- `POST /api/progress` - Save answer
- `GET /api/progress?questionId=X` - Get progress for specific question

### Questions
- `GET /api/questions/[questionId]` - Get specific question

### Chat
- `GET /api/chat/[questionId]` - Get chat history
- `POST /api/chat/[questionId]` - Send chat message

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

### Wrong Book
- `GET /api/wrong-book` - Get wrong questions

### Review
- `GET /api/review/sprint-dashboard` - Get sprint dashboard
- `GET /api/review/queue` - Generate daily review queue

---

## 🧪 Testing

### API Flow Test

```bash
# Start dev server
npm run dev

# In another terminal, run tests
npm run test:api
```

---

## 📚 Documentation

- [PHASE2_VERIFICATION.md](./PHASE2_VERIFICATION.md) - Phase 2 completion checklist
- [PHASE3A_IMPLEMENTATION.md](./PHASE3A_IMPLEMENTATION.md) - Phase 3A implementation
- [PHASE3B_VERIFICATION.md](./PHASE3B_VERIFICATION.md) - Phase 3B verification
- [PHASE3C_VERIFICATION.md](./PHASE3C_VERIFICATION.md) - Phase 3C verification
- [PHASE3D_VERIFICATION.md](./PHASE3D_VERIFICATION.md) - Phase 3D verification
- [PHASE4_VERIFICATION.md](./PHASE4_VERIFICATION.md) - Phase 4 verification
- [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) - Deployment guide
- [ENV_SETUP.md](./ENV_SETUP.md) - Environment variables setup

---

## 🔒 Security

- JWT tokens stored in HTTP-only cookies
- Session tokens expire after 30 days
- All API routes require authentication (except magic link)
- Database queries use parameterized statements (Prisma)
- No sensitive data in client-side code

---

## 📝 License

Private project - All rights reserved

---

## 🔗 Links

- **Live Site**: https://acams.vercel.app
- **GitHub**: https://github.com/qizhangumich/acams

---

**Built with ❤️ for ACAMS exam preparation**

