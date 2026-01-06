/**
 * Check Environment Variables
 * 
 * Quick script to verify DATABASE_URL format
 */

console.log('\n🔍 Environment Variables Check\n')

// Load .env file if exists (for scripts)
const { existsSync } = require('fs')
const { join } = require('path')
const envPath = join(process.cwd(), '.env')
const envLocalPath = join(process.cwd(), '.env.local')

// Priority: .env first, then .env.local
if (existsSync(envPath)) {
  require('dotenv').config({ path: envPath })
  console.log('📁 Loading from .env')
} else if (existsSync(envLocalPath)) {
  require('dotenv').config({ path: envLocalPath })
  console.log('📁 Loading from .env.local')
} else {
  console.log('⚠️  No .env or .env.local file found')
}

// Check DATABASE_URL
const dbUrl = process.env.DATABASE_URL

if (!dbUrl) {
  console.log('❌ DATABASE_URL is UNDEFINED')
  console.log('   → Prisma will fail to connect')
  console.log('   → Fix: Add DATABASE_URL to .env.local')
  process.exit(1)
}

console.log('✅ DATABASE_URL is SET')

// Mask password for display
const masked = dbUrl.replace(/:([^:@]+)@/, ':****@')
console.log('📋 DATABASE_URL (masked):', masked)

// Check protocol
if (!dbUrl.startsWith('postgresql://')) {
  console.log('❌ Protocol should be "postgresql://" (not "postgres://")')
} else {
  console.log('✅ Protocol: postgresql://')
}

// Check port
// Neon format: postgresql://user:password@host/database (no explicit port, uses default 5432)
// Standard format: postgresql://user:password@host:PORT/database
const portMatch = dbUrl.match(/@[^:/]+:(\d+)/)
if (!portMatch) {
  // No explicit port - this is valid for Neon (uses default 5432)
  const hostMatch = dbUrl.match(/@([^:/]+)/)
  if (hostMatch && hostMatch[1].includes('neon.tech')) {
    console.log('✅ Neon format detected (no explicit port, will use default 5432)')
  } else {
    console.log('⚠️  No explicit port number found')
    console.log('   → PostgreSQL will use default port 5432')
    console.log('   → This is valid for Neon/Supabase')
  }
} else {
  const port = portMatch[1]
  console.log(`✅ Port found: ${port}`)
  
  // Validate port is numeric
  if (isNaN(Number(port))) {
    console.log(`❌ Port "${port}" is not a valid number!`)
  } else {
    console.log(`✅ Port is numeric: ${port}`)
  }
}

// Check sslmode
if (!dbUrl.includes('sslmode=require')) {
  console.log('⚠️  Missing "sslmode=require"')
  console.log('   → Neon/Supabase require SSL')
  console.log('   → Add: ?sslmode=require')
} else {
  console.log('✅ sslmode=require found')
}

// Check format
// Accept both formats:
// 1. With port: postgresql://user:password@host:PORT/database?params
// 2. Without port (Neon): postgresql://user:password@host/database?params
const urlPatternWithPort = /^postgresql:\/\/[^:]+:[^@]+@[^:]+:\d+\/[^?]+/
const urlPatternWithoutPort = /^postgresql:\/\/[^:]+:[^@]+@[^/]+\/[^?]+/
if (!urlPatternWithPort.test(dbUrl) && !urlPatternWithoutPort.test(dbUrl)) {
  console.log('⚠️  URL format may be incorrect')
  console.log('   → Expected: postgresql://user:password@host[:port]/database?params')
  console.log('   → Neon format (no port) is also valid')
} else {
  console.log('✅ URL format looks correct')
}

console.log('\n📋 Accepted formats:')
console.log('   postgresql://user:password@host:5432/database?sslmode=require')
console.log('   postgresql://user:password@host/database?sslmode=require (Neon)\n')

