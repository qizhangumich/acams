/**
 * GET /api/health/db
 *
 * Database connection health check
 * Useful for debugging connection issues
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json({
      success: true,
      status: 'connected',
      message: 'Database connection is healthy',
    })
  } catch (error: any) {
    const errorInfo = {
      success: false,
      status: 'disconnected',
      error: error?.message || String(error),
      code: error?.code,
    }

    // Check for specific Prisma error codes
    if (error?.code === 'P1001') {
      errorInfo.message = 'Cannot reach database server. Check if database is paused or connection string is correct.'
    } else if (error?.code === 'P1000') {
      errorInfo.message = 'Authentication failed. Check database credentials.'
    } else if (error?.code === 'P1017') {
      errorInfo.message = 'Server closed the connection. Database might be paused.'
    } else {
      errorInfo.message = 'Database connection failed. Check connection string and database status.'
    }

    return NextResponse.json(errorInfo, { status: 503 })
  }
}

