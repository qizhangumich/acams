/**
 * Connection String Validation Script
 * 
 * Validates that DATABASE_URL is properly formatted for Vercel/Serverless:
 * - Uses Neon pooler endpoint (-pooler in hostname)
 * - Includes pgbouncer=true
 * - Includes sslmode=require
 */

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set')
  process.exit(1)
}

console.log('🔍 Validating DATABASE_URL format...\n')

const issues: string[] = []
const warnings: string[] = []

// Check for pooler endpoint
if (!DATABASE_URL.includes('-pooler')) {
  issues.push('❌ Hostname does not contain "-pooler" (should use pooled connection for serverless)')
} else {
  console.log('✅ Using pooled connection (-pooler in hostname)')
}

// Check for pgbouncer parameter
if (!DATABASE_URL.includes('pgbouncer=true')) {
  issues.push('❌ Missing "pgbouncer=true" parameter (required for connection pooling)')
} else {
  console.log('✅ Includes pgbouncer=true')
}

// Check for sslmode
if (!DATABASE_URL.includes('sslmode=require')) {
  issues.push('❌ Missing "sslmode=require" parameter (required for secure connection)')
} else {
  console.log('✅ Includes sslmode=require')
}

// Check for port
if (!DATABASE_URL.match(/:\d+\//)) {
  warnings.push('⚠️  Port number not explicitly specified (defaults to 5432)')
} else {
  console.log('✅ Port number specified')
}

// Check protocol
if (!DATABASE_URL.startsWith('postgresql://')) {
  issues.push('❌ Must start with "postgresql://" (not "postgres://")')
} else {
  console.log('✅ Uses postgresql:// protocol')
}

// Results
console.log('\n' + '='.repeat(60))
if (issues.length > 0) {
  console.log('\n❌ Validation FAILED:\n')
  issues.forEach(issue => console.log(`   ${issue}`))
  console.log('\n📋 Required format:')
  console.log('   postgresql://USER:PASSWORD@ep-xxx-pooler.aws.neon.tech:5432/DB?pgbouncer=true&sslmode=require')
  process.exit(1)
} else {
  console.log('\n✅ Connection string is properly formatted for Vercel/Serverless!')
  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:')
    warnings.forEach(warning => console.log(`   ${warning}`))
  }
  console.log('\n📋 Architecture:')
  console.log('   - PostgreSQL (Neon): The database')
  console.log('   - Prisma: The access layer (imported from lib/prisma.ts)')
  console.log('   - Connection: Pooled via Neon pooler (serverless-safe)')
}

