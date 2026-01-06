/**
 * Fix DATABASE_URL - URL Encode Password
 * 
 * This script helps fix DATABASE_URL when password contains special characters
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

function urlEncodePassword(url: string): string {
  // Parse: postgresql://user:password@host:port/database?params
  const match = url.match(/^(postgresql:\/\/)([^:]+):([^@]+)@(.+)$/)
  
  if (!match) {
    throw new Error('Invalid DATABASE_URL format')
  }

  const [, protocol, user, password, rest] = match
  
  // URL encode password
  const encodedPassword = encodeURIComponent(password)
  
  // Reconstruct URL
  const fixedUrl = `${protocol}${user}:${encodedPassword}@${rest}`
  
  return fixedUrl
}

function checkAndFixEnvFile() {
  // Check both .env and .env.local files (priority: .env first)
  const envPath = join(process.cwd(), '.env')
  const envLocalPath = join(process.cwd(), '.env.local')
  
  let targetPath: string | null = null
  let targetFileName: string = ''
  
  if (existsSync(envPath)) {
    targetPath = envPath
    targetFileName = '.env'
    console.log('📁 Using .env file')
  } else if (existsSync(envLocalPath)) {
    targetPath = envLocalPath
    targetFileName = '.env.local'
    console.log('📁 Using .env.local file')
  } else {
    console.log('❌ Neither .env nor .env.local file found!')
    console.log('   Create .env file first.')
    return
  }

  const content = readFileSync(targetPath, 'utf-8')
  const lines = content.split('\n')
  
  let found = false
  let fixed = false
  
  const newLines = lines.map(line => {
    // Trim whitespace and check if line starts with DATABASE_URL=
    const trimmedLine = line.trim()
    if (trimmedLine.startsWith('DATABASE_URL=')) {
      found = true
      const match = trimmedLine.match(/^DATABASE_URL=["']?(.+?)["']?$/)
      
      if (!match) {
        console.log('⚠️  Could not parse DATABASE_URL line')
        return line
      }
      
      const url = match[1]
      
      // Check if it's a placeholder/template
      if (url.includes('user:password@host:port') || url.includes('user:password@host')) {
        console.log('⚠️  DATABASE_URL appears to be a placeholder/template')
        console.log('   Current value:', url.replace(/:([^:@]+)@/, ':****@'))
        console.log('   → Please replace with your actual Neon database connection string')
        console.log('   → Get it from: https://console.neon.tech')
        return line
      }
      
      // Check if password needs encoding
      const passwordMatch = url.match(/^postgresql:\/\/[^:]+:([^@]+)@/)
      
      if (passwordMatch) {
        const password = passwordMatch[1]
        const decodedPassword = decodeURIComponent(password)
        
        // Check if password contains special characters
        const specialChars = /[@#\$%&+\/:;=?]/
        
        if (specialChars.test(decodedPassword) && password === decodedPassword) {
          console.log('🔍 Found password with special characters!')
          console.log(`   Original password: ${password.substring(0, 10)}...`)
          
          const fixedUrl = urlEncodePassword(url)
          const fixedPassword = fixedUrl.match(/^postgresql:\/\/[^:]+:([^@]+)@/)![1]
          
          console.log(`   Encoded password: ${fixedPassword.substring(0, 20)}...`)
          console.log('✅ Fixed DATABASE_URL')
          
          fixed = true
          return `DATABASE_URL="${fixedUrl}"`
        } else {
          console.log('✅ Password is already encoded or has no special characters')
        }
      }
    }
    
    return line
  })
  
  if (!found) {
    console.log(`❌ DATABASE_URL not found in ${targetFileName}`)
    return
  }
  
  if (fixed) {
    const newContent = newLines.join('\n')
    writeFileSync(targetPath, newContent, 'utf-8')
    console.log(`\n✅ ${targetFileName} file updated!`)
    console.log('   Restart dev server: npm run dev')
  } else {
    console.log('\n✅ No changes needed')
  }
}

// Interactive mode: ask user for DATABASE_URL
function interactiveFix() {
  console.log('\n🔧 DATABASE_URL Password Encoder\n')
  console.log('If your password contains special characters (@, #, $, %, &, +, /, :, ;, =, ?),')
  console.log('they need to be URL encoded.\n')
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  readline.question('Enter your DATABASE_URL (password will be masked): ', (url: string) => {
    try {
      const fixed = urlEncodePassword(url)
      
      // Mask password for display
      const masked = fixed.replace(/:([^@]+)@/, ':****@')
      
      console.log('\n✅ Fixed DATABASE_URL:')
      console.log(masked)
      console.log('\n📋 Add this to your .env file:')
      console.log(`DATABASE_URL="${fixed}"`)
      
      readline.close()
    } catch (error: any) {
      console.error('❌ Error:', error.message)
      readline.close()
    }
  })
}

// Main
const args = process.argv.slice(2)

if (args.includes('--interactive') || args.includes('-i')) {
  interactiveFix()
} else {
  checkAndFixEnvFile()
}

