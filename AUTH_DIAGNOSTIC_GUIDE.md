# 🔍 Authentication Loop Diagnostic Guide

## Root Cause Analysis

### Why successful verification can still redirect to /login

When magic link verification succeeds but user is still redirected to `/login`, the issue is **always** one of these 5 root causes:

#### a) Cookie not set
**Symptoms:**
- Network shows `Set-Cookie` header is missing in `/api/auth/verify` response
- Browser DevTools → Application → Cookies shows no `session_token`

**How to identify:**
1. Check Network tab → `/api/auth/verify` → Response Headers
2. Look for `Set-Cookie: session_token=...`
3. If missing → Cookie not being set

**Fix:**
- Ensure `response.cookies.set()` is called on redirect response
- Verify cookie attributes are correct

---

#### b) Cookie set but not persisted
**Symptoms:**
- `Set-Cookie` header exists in response
- Cookie appears in browser DevTools
- Cookie disappears on redirect or page refresh

**How to identify:**
1. Check Network tab → `/api/auth/verify` → Response Headers → `Set-Cookie`
2. Check Browser DevTools → Application → Cookies → `session_token`
3. Follow redirect to `/questions`
4. Check if cookie still exists

**Fix:**
- Verify `path=/` is set
- Verify `maxAge` or `expires` is set
- Check if `secure` flag is blocking in development
- Ensure `sameSite` is not too restrictive

---

#### c) Cookie name / scope mismatch
**Symptoms:**
- Cookie exists but middleware can't read it
- Cookie name differs between set and read

**How to identify:**
1. Check `/api/auth/verify` sets: `session_token`
2. Check `middleware.ts` reads: `session_token`
3. Verify exact string match (case-sensitive)

**Fix:**
- Use constant: `SESSION_COOKIE_NAME = 'session_token'`
- Import same constant in both files

---

#### d) Middleware runs before cookie is readable
**Symptoms:**
- Cookie is set correctly
- Cookie exists in browser
- Middleware logs show cookie is missing

**How to identify:**
1. Check middleware logs for cookie presence
2. Check if middleware runs on redirect request
3. Verify cookie is sent with redirect request

**Fix:**
- Ensure cookie `path=/` includes all routes
- Verify cookie is sent with redirect (307/303)
- Check middleware matcher doesn't exclude route

---

#### e) Session logic differs between API and middleware
**Symptoms:**
- Token is valid in API
- Token is invalid in middleware
- Different JWT_SECRET or verification logic

**How to identify:**
1. Compare `JWT_SECRET` in both files
2. Compare `verifySessionToken` implementation
3. Check token expiration logic

**Fix:**
- Use same `verifySessionToken` function
- Ensure `JWT_SECRET` is same in both contexts
- Verify token format is consistent

---

## Debugging Steps

### Step 1: Check Cookie Setting
```bash
# In browser DevTools → Network tab
1. Click magic link
2. Find `/api/auth/verify` request
3. Check Response Headers → `Set-Cookie`
4. Verify: `Set-Cookie: session_token=...; HttpOnly; Path=/; SameSite=Lax`
```

### Step 2: Check Cookie Persistence
```bash
# In browser DevTools → Application → Cookies
1. After verification, check cookies
2. Verify `session_token` exists
3. Check attributes: HttpOnly, Path=/, SameSite=Lax
4. Follow redirect to `/questions`
5. Verify cookie still exists
```

### Step 3: Check Middleware Reading
```bash
# In Vercel Logs or local console
1. Look for `[MIDDLEWARE]` logs
2. Check `hasSessionToken: true/false`
3. Check `tokenExists: true/false`
4. Check `isValid: true/false`
```

### Step 4: Check Session Verification
```bash
# In Vercel Logs
1. Look for `[SESSION] Token verified:` logs
2. Check if verification succeeds
3. Check if JWT_SECRET matches
```

---

## Expected Log Flow

### Successful Authentication:
```
[VERIFY API] Session created: { userId: '...', email: '...' }
[VERIFY API] Cookie set on response: { hasSetCookie: true, ... }
[MIDDLEWARE] Checking /questions: { hasSessionToken: true }
[MIDDLEWARE] Session token check: { tokenExists: true, ... }
[SESSION] Token verified: { userId: '...', email: '...' }
[MIDDLEWARE] Session verification: { isValid: true, ... }
[MIDDLEWARE] ✅ Valid session - allowing access
```

### Failed Authentication:
```
[VERIFY API] Session created: { ... }
[VERIFY API] Cookie set on response: { hasSetCookie: true, ... }
[MIDDLEWARE] Checking /questions: { hasSessionToken: false }  ← PROBLEM
[MIDDLEWARE] ❌ No session token - redirecting to login
```

---

## Quick Fixes

### Fix 1: Cookie Not Set
```ts
// In app/api/auth/verify/route.ts
const response = NextResponse.redirect(new URL('/questions', request.url))
response.cookies.set('session_token', sessionToken, {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 30 * 24 * 60 * 60,
})
```

### Fix 2: Cookie Name Mismatch
```ts
// Use constant everywhere
import { SESSION_COOKIE_NAME } from '@/lib/auth/session'

// Set cookie
response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {...})

// Read cookie
const cookie = request.cookies.get(SESSION_COOKIE_NAME)
```

### Fix 3: Middleware Matcher
```ts
// In middleware.ts
export const config = {
  matcher: [
    '/questions/:path*',  // Must match exactly
    '/dashboard/:path*',
    '/wrong-book/:path*',
  ],
}
```

---

## Next Steps

1. Deploy with debugging enabled
2. Test magic link flow
3. Check Vercel logs for debug output
4. Identify which root cause is happening
5. Apply appropriate fix

