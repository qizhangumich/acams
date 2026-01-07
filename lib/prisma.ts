/**
 * ============================================
 * DATABASE ARCHITECTURE CLARIFICATION
 * ============================================
 * 
 * PostgreSQL (Neon) is the DATABASE.
 * Prisma is the DATABASE ACCESS LAYER (ORM/Client).
 * 
 * We are NOT replacing PostgreSQL with Prisma.
 * We are replacing direct TCP/psql-style connections
 * with a Serverless-safe access layer (Prisma).
 * 
 * Why Prisma for Serverless (Vercel)?
 * ------------------------------------
 * 1. Direct PostgreSQL connections are unsafe in Serverless:
 *    - Each function invocation would create new TCP connections
 *    - Neon free tier has connection limits
 *    - Cold starts cause connection timeouts (P1001 errors)
 * 
 * 2. Prisma + Neon Pooler solves this:
 *    - Connection pooling via Neon's pooler endpoint
 *    - Reuses connections across function invocations
 *    - Handles connection lifecycle automatically
 * 
 * 3. Singleton pattern prevents connection leaks:
 *    - Single PrismaClient instance shared across all routes
 *    - Prevents "terminating connection due to administrator command" errors
 *    - Required for Next.js hot reload in development
 * 
 * Connection String Format (Required):
 * ------------------------------------
 * DATABASE_URL must use Neon's pooler endpoint:
 * 
 * postgresql://USER:PASSWORD@ep-xxx-pooler.aws.neon.tech/DB?pgbouncer=true&sslmode=require
 * 
 * Key requirements:
 * - Hostname must contain "-pooler" (e.g., ep-xxx-pooler.us-east-1.aws.neon.tech)
 * - Must include ?pgbouncer=true for connection pooling
 * - Must include &sslmode=require for secure connections
 * - Do NOT use direct connection (without -pooler) in production
 * 
 * ============================================
 */

import { PrismaClient } from '@prisma/client'

/**
 * Prisma Client Singleton
 * 
 * CRITICAL: This is the ONLY place where PrismaClient is instantiated.
 * All API routes MUST import `prisma` from this file.
 * 
 * DO NOT create new PrismaClient() instances in:
 * - API route handlers
 * - Server components
 * - Middleware
 * - Any other files
 * 
 * Why singleton?
 * - Prevents connection pool exhaustion
 * - Ensures connection reuse in Serverless
 * - Required for Next.js hot reload (dev mode)
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Single PrismaClient instance for the entire application.
 * 
 * In development: Reused across hot reloads (stored in globalThis)
 * In production: Single instance per serverless function lifecycle
 */
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

// Store in globalThis for development hot reload (prevents multiple instances)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

