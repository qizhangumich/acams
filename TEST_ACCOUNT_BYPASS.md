# Test Account Rate Limit Bypass

## Overview

Test accounts can request unlimited magic links without rate limiting. This is useful for development and testing scenarios where frequent magic link requests are needed.

## Configuration

### Hardcoded Test Accounts

The following emails are hardcoded as test accounts (in `lib/auth/magic-link.ts`):

- `jeremy4crypto@gmail.com`
- `zhangqi362@gmail.com`

### Environment Variable (Optional)

You can also configure test accounts via environment variable:

```bash
MAGIC_LINK_BYPASS_EMAILS="email1@example.com,email2@example.com,email3@example.com"
```

**Note**: If `MAGIC_LINK_BYPASS_EMAILS` is set, it **replaces** the hardcoded list (does not merge).

## How It Works

1. **Email Normalization**: All emails are normalized (trimmed and lowercased) before checking
2. **Bypass Check**: Before rate limiting, the system checks if the email is in the bypass list
3. **Rate Limit Skip**: If it's a test account:
   - Skips `prisma.magicLinkToken.count()` query
   - Skips rate limit enforcement
   - Logs: `[createMagicLink] Test account detected, bypassing rate limits`
4. **Token Creation**: Test accounts still create tokens normally (for tracking/debugging)

## Production Behavior

- **Test Accounts**: Unlimited magic link requests
- **Normal Users**: Rate limited to 5 requests per hour (unchanged)

## Implementation Details

**File**: `lib/auth/magic-link.ts`

**Functions**:
- `getBypassEmails()`: Returns list of bypass emails (env var or hardcoded)
- `isTestAccount(email)`: Checks if email is in bypass list

**Rate Limit Logic**:
```typescript
const isTest = isTestAccount(normalizedEmail)

if (!isTest) {
  // Rate limit check only for non-test accounts
  // ... existing rate limit logic ...
}
```

## Security Considerations

- Test accounts are **not** exempt from:
  - Email validation
  - Token expiration (15 minutes)
  - Token usage tracking
  - Database operations
  
- Only rate limiting is bypassed
- Test accounts still consume database resources (tokens are still created)
- Consider cleaning up test account tokens periodically if needed

## Adding/Removing Test Accounts

### Option 1: Environment Variable (Recommended for Production)

Add to `.env.local` or Vercel environment variables:

```bash
MAGIC_LINK_BYPASS_EMAILS="jeremy4crypto@gmail.com,zhangqi362@gmail.com"
```

### Option 2: Hardcoded List

Edit `lib/auth/magic-link.ts`:

```typescript
function getBypassEmails(): string[] {
  // ... env var check ...
  
  return [
    'jeremy4crypto@gmail.com',
    'zhangqi362@gmail.com',
    'newtest@example.com', // Add new test account
  ]
}
```

## Verification

To verify the bypass is working:

1. Request a magic link for a test account
2. Check logs for: `[createMagicLink] Test account detected, bypassing rate limits`
3. Request multiple magic links rapidly - should not hit rate limit
4. Request magic link for a normal account - should be rate limited after 5 requests/hour

