/**
 * Prisma Client Singleton
 * 
 * Prevents multiple instances of Prisma Client in development
 * (Next.js hot reload can create multiple instances)
 * 
 * This is the standard pattern for Neon + Next.js to prevent
 * "terminating connection due to administrator command" errors
 */

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

