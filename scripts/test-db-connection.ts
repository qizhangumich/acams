/**
 * Test Database Connection
 * 
 * Simple script to verify database connection and Prisma setup
 */

import { prisma } from '../lib/prisma'

async function testConnection() {
  try {
    console.log('Testing database connection...')
    
    // Test 1: Simple query
    const userCount = await prisma.user.count()
    console.log(`✅ Database connection successful!`)
    console.log(`✅ User count: ${userCount}`)
    
    // Test 2: Check if the question bank is seeded
    try {
      const questionCount = await prisma.question.count()
      console.log(`✅ Question table exists!`)
      console.log(`✅ Question count: ${questionCount}`)
      if (questionCount === 0) {
        console.warn('⚠️  Question bank is empty. Run: npm run db:seed')
      }
    } catch (error: any) {
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        console.error('❌ Question table does not exist!')
        console.error('   Run: npm run db:migrate')
        process.exit(1)
      }
      throw error
    }

    console.log('\n✅ All tests passed! Database is ready.')
    process.exit(0)
  } catch (error: any) {
    console.error('\n❌ Database connection failed!')
    console.error('Error:', error.message)
    
    if (error.code === 'P1001') {
      console.error('\n💡 Possible issues:')
      console.error('   1. DATABASE_URL is not set or incorrect')
      console.error('   2. Database server is not running')
      console.error('   3. Network connection issue')
    } else if (error.code === 'P1013') {
      console.error('\n💡 DATABASE_URL format is invalid')
      console.error('   Expected: postgresql://user:password@host:port/database?sslmode=require')
    } else if (error.code === 'P2021') {
      console.error('\n💡 Database tables do not exist')
      console.error('   Run: npm run db:migrate')
    }
    
    process.exit(1)
  }
}

testConnection()

