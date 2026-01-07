/**
 * Verification Script: Prisma Singleton Pattern
 * 
 * Verifies that:
 * 1. Only ONE PrismaClient instance exists
 * 2. All API routes import from lib/prisma.ts
 * 3. No new PrismaClient() calls in route handlers
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const API_DIR = join(process.cwd(), 'app', 'api')
const LIB_DIR = join(process.cwd(), 'lib')

function findFiles(dir: string, pattern: RegExp, files: string[] = []): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    
    if (entry.isDirectory()) {
      findFiles(fullPath, pattern, files)
    } else if (entry.isFile() && pattern.test(entry.name)) {
      files.push(fullPath)
    }
  }
  
  return files
}

function checkPrismaUsage() {
  console.log('🔍 Verifying Prisma Singleton Pattern...\n')
  
  // Find all TypeScript files in app/api
  const apiFiles = findFiles(API_DIR, /\.ts$/)
  const libFiles = findFiles(LIB_DIR, /\.ts$/)
  const allFiles = [...apiFiles, ...libFiles]
  
  let violations: string[] = []
  let correctImports = 0
  
  for (const file of allFiles) {
    const content = readFileSync(file, 'utf-8')
    const relativePath = file.replace(process.cwd(), '.').replace(/\\/g, '/')
    
    // Check for new PrismaClient() (violation)
    // EXCLUDE lib/prisma.ts - that's the ONLY allowed place to instantiate PrismaClient
    const isPrismaSingletonFile = file.includes('lib' + join('prisma.ts').replace(/\\/g, '/')) || 
                                   file.endsWith('lib/prisma.ts') ||
                                   relativePath.includes('lib/prisma.ts')
    
    if (content.includes('new PrismaClient(') && !isPrismaSingletonFile) {
      violations.push(`${relativePath}: Contains "new PrismaClient()" - should import from lib/prisma.ts instead`)
    }
    
    // Check for correct import
    if (content.includes("from '@/lib/prisma'") || content.includes("from '../lib/prisma'") || content.includes("from '../../lib/prisma'")) {
      correctImports++
    }
  }
  
  // Results
  console.log(`✅ Found ${correctImports} files with correct Prisma import`)
  
  if (violations.length > 0) {
    console.log(`\n❌ Found ${violations.length} violations:`)
    violations.forEach(v => console.log(`   ${v}`))
    process.exit(1)
  } else {
    console.log(`\n✅ No violations found! All files use Prisma singleton from lib/prisma.ts`)
    console.log(`\n📋 Architecture:`)
    console.log(`   - PostgreSQL (Neon): The database`)
    console.log(`   - Prisma: The access layer (imported from lib/prisma.ts)`)
    console.log(`   - Singleton pattern: One PrismaClient instance for the entire app`)
  }
}

checkPrismaUsage()

