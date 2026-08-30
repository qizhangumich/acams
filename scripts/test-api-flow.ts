/**
 * API smoke test (read-only).
 *
 * Logs in with the admin credentials and exercises the main read
 * endpoints. Makes NO writes to progress data.
 *
 * Usage: start the dev server, then `npm run test:api`.
 */

import 'dotenv/config'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const USERNAME = process.env.ADMIN_USERNAME || 'admin'
const PASSWORD = process.env.ADMIN_PASSWORD || ''

if (!PASSWORD) {
  console.error('Set ADMIN_PASSWORD in .env to run this test.')
  process.exit(1)
}

async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  cookies?: string
): Promise<{ status: number; data: any; cookies: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }
  if (cookies) headers['Cookie'] = cookies

  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers })
  const data = await response.json().catch(() => null)
  return { status: response.status, data, cookies: response.headers.getSetCookie().join('; ') }
}

async function main() {
  console.log('Starting API smoke test against', BASE_URL, '\n')

  // 1. Unauthenticated requests are rejected
  const unauthed = await apiRequest('/api/progress/summary')
  if (unauthed.status !== 401) throw new Error(`Expected 401 unauthenticated, got ${unauthed.status}`)
  console.log('1. Unauthenticated request rejected (401)')

  // 2. Wrong password is rejected
  const badLogin = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: USERNAME, password: 'wrong-password' }),
  })
  if (badLogin.status !== 401) throw new Error(`Expected 401 for bad password, got ${badLogin.status}`)
  console.log('2. Wrong password rejected (401)')

  // 3. Login
  const login = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  })
  if (!login.data?.success || !login.cookies) throw new Error('Login failed')
  const session = login.cookies
  console.log('3. Logged in as', login.data.user.email)

  // 4. Session works
  const me = await apiRequest('/api/auth/me', {}, session)
  if (!me.data?.success) throw new Error('auth/me failed')
  console.log('4. Session valid:', me.data.user.email)

  // 5. Read endpoints respond
  const checks: Array<[string, string]> = [
    ['/api/progress/summary', 'progress summary'],
    ['/api/progress/resume', 'resume'],
    ['/api/wrong-book', 'wrong book'],
    ['/api/review/queue', 'review queue'],
    ['/api/review/sprint-dashboard', 'sprint dashboard'],
    ['/api/exam', 'exam list'],
  ]
  for (const [endpoint, label] of checks) {
    const res = await apiRequest(endpoint, {}, session)
    if (res.status !== 200 || !res.data?.success) {
      throw new Error(`${label} failed: ${res.status} ${JSON.stringify(res.data)?.slice(0, 200)}`)
    }
    console.log(`5. ${label} OK`)
  }

  console.log('\nAll smoke tests passed.')
}

main().catch((error) => {
  console.error('Smoke test failed:', error)
  process.exit(1)
})
