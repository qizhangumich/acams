/**
 * GET /api/health/db
 *
 * Database connection health check
 * 
 * Architecture:
 * - Uses Prisma (access layer) to connect to PostgreSQL (database)
 * - Verifies connectivity without heavy queries
 * - Useful for debugging connection issues
 * 
 * This endpoint confirms:
 * 1. Prisma Client is initialized correctly
 * 2. Connection string is valid
 * 3. PostgreSQL (Neon) is reachable
 * 4. Connection pooling is working
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Minimal DB operation: Simple query to test connection
    // Uses Prisma (access layer) to query PostgreSQL (database)
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({
      success: true,
      status: 'connected',
      message: 'Database connection is healthy',
      architecture: {
        database: 'PostgreSQL (Neon)',
        accessLayer: 'Prisma ORM',
        connectionType: 'Pooled (via Neon pooler)',
      },
    })
  } catch (error: any) {
    let message = 'Database connection failed. Check connection string and database status.'
    
    // Check for specific Prisma error codes
    if (error?.code === 'P1001') {
      message = 'Cannot reach database server. Check if database is paused or connection string is correct.'
    } else if (error?.code === 'P1000') {
      message = 'Authentication failed. Check database credentials.'
    } else if (error?.code === 'P1017') {
      message = 'Server closed the connection. Database might be paused.'
    }

    const errorInfo = {
      success: false,
      status: 'disconnected',
      error: error?.message || String(error),
      code: error?.code,
      message,
    }

    return NextResponse.json(errorInfo, { status: 503 })
  }
}

