# Database Architecture: PostgreSQL + Prisma

## Clarification: PostgreSQL vs Prisma

### PostgreSQL (Neon) = The Database
- **PostgreSQL** is the actual database server (hosted on Neon)
- Stores all data: Users, Questions, UserProgress, WrongBook, QuestionChat
- Runs on Neon's infrastructure
- **We are NOT replacing PostgreSQL**

### Prisma = The Database Access Layer
- **Prisma** is NOT a database
- Prisma is an ORM (Object-Relational Mapping) tool
- It's a **client library** that connects to PostgreSQL
- Provides type-safe database queries
- **We are replacing direct TCP/psql connections with Prisma**

## Why Prisma for Serverless (Vercel)?

### Problem with Direct PostgreSQL Connections

In serverless environments (like Vercel), direct PostgreSQL connections have issues:

1. **Connection Limits**: Each function invocation creates new TCP connections
2. **Cold Starts**: New connections timeout during cold starts (P1001 errors)
3. **Connection Exhaustion**: Neon free tier has connection limits
4. **No Connection Reuse**: Each request = new connection = slow + unreliable

### Solution: Prisma + Neon Pooler

1. **Connection Pooling**: Neon's pooler endpoint (`-pooler` in hostname) manages connections
2. **Connection Reuse**: Prisma reuses connections across function invocations
3. **Automatic Lifecycle**: Prisma handles connection open/close automatically
4. **Serverless-Safe**: Designed for stateless serverless functions

## Connection String Format

### Required Format for Vercel/Serverless

```
postgresql://USER:PASSWORD@ep-xxx-pooler.aws.neon.tech/DB?pgbouncer=true&sslmode=require
```

### Key Requirements

- ✅ **Hostname must contain `-pooler`**: `ep-xxx-pooler.us-east-1.aws.neon.tech`
- ✅ **Must include `?pgbouncer=true`**: Enables connection pooling
- ✅ **Must include `&sslmode=require`**: Secure SSL connection
- ❌ **Do NOT use direct connection** (without `-pooler`) in production

### Example

```
DATABASE_URL="postgresql://neondb_owner:password@ep-little-sun-a4bvenrx-pooler.us-east-1.aws.neon.tech:5432/neondb?pgbouncer=true&sslmode=require"
```

## Prisma Client Singleton Pattern

### Why Singleton?

- **Prevents Connection Leaks**: Single instance = controlled connection pool
- **Required for Next.js**: Hot reload in dev mode would create multiple instances
- **Serverless-Safe**: One client per function lifecycle

### Implementation

All database access goes through `lib/prisma.ts`:

```typescript
// ✅ CORRECT: Import from singleton
import { prisma } from '@/lib/prisma'

// ❌ WRONG: Never create new instances
const prisma = new PrismaClient() // DON'T DO THIS
```

## Architecture Diagram

```
┌─────────────────┐
│   Next.js App   │
│  (Vercel)       │
└────────┬────────┘
         │
         │ import { prisma } from '@/lib/prisma'
         │
┌────────▼────────┐
│  Prisma Client  │  ← Access Layer (ORM)
│  (Singleton)   │
└────────┬────────┘
         │
         │ PostgreSQL Protocol
         │ (via Neon Pooler)
         │
┌────────▼────────┐
│  Neon Pooler    │  ← Connection Pooling
│  (-pooler)      │
└────────┬────────┘
         │
         │ Direct Connection
         │
┌────────▼────────┐
│  PostgreSQL     │  ← The Database
│  (Neon)         │
└─────────────────┘
```

## Summary

- **PostgreSQL (Neon)**: The database server
- **Prisma**: The access layer (replaces direct connections)
- **Neon Pooler**: Connection pooling for serverless
- **Singleton Pattern**: One PrismaClient instance for the app

We're not replacing PostgreSQL. We're using Prisma as a safer, serverless-compatible way to access PostgreSQL.

