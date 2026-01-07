# Error Handling Improvements

## Issues Addressed

### 1. Email Send Timeout (ETIMEDOUT)

**Problem**: Resend API calls were timing out without a timeout limit, causing requests to hang indefinitely.

**Solution**:
- Added 10-second timeout to email sending
- Uses `Promise.race()` to enforce timeout
- Improved error logging with error type classification (TIMEOUT, NETWORK, UNKNOWN)
- Email failures don't block token creation (fire-and-forget pattern)

**Implementation**: `lib/auth/email.ts`

```typescript
const EMAIL_SEND_TIMEOUT_MS = 10000

// Race between email send and timeout
await Promise.race([
  resend.emails.send({ ... }),
  timeoutPromise,
])
```

### 2. PostgreSQL Connection Errors

**Problem**: Prisma connections were being closed unexpectedly, causing "Error in PostgreSQL connection: Error { kind: Closed, cause: None }".

**Solution**:
- Enhanced error detection for connection errors
- Added detection for "Connection closed" messages
- Improved error logging with structured error information
- Better error messages for users

**Implementation**: `lib/auth/magic-link.ts`

```typescript
const isConnectionError = 
  dbError.code === 'P1001' || 
  dbError.errorCode === 'P1001' ||
  dbError.name === 'PrismaClientInitializationError' ||
  dbError.message?.includes('Can\'t reach database server') ||
  dbError.message?.includes('Connection closed') ||
  dbError.message?.includes('Error in PostgreSQL connection')
```

## Error Handling Strategy

### Email Sending

1. **Timeout Protection**: 10-second timeout prevents indefinite hangs
2. **Non-Blocking**: Email failures don't prevent token creation
3. **Error Classification**: Errors are classified as TIMEOUT, NETWORK, or UNKNOWN
4. **Detailed Logging**: Logs include error code, errno, syscall for debugging

### Database Operations

1. **Connection Error Detection**: Detects various connection error patterns
2. **User-Friendly Messages**: Returns clear error messages instead of technical errors
3. **Graceful Degradation**: Connection errors return 400 with clear message
4. **Structured Logging**: Logs include error code, name, and message

## Error Types Handled

### Email Errors

- `ETIMEDOUT`: Network timeout
- `ECONNRESET`: Connection reset
- `ENOTFOUND`: DNS resolution failure
- Generic fetch errors

### Database Errors

- `P1001`: Cannot reach database server
- `PrismaClientInitializationError`: Client initialization failure
- `Connection closed`: Connection was closed unexpectedly
- Generic database errors

## Monitoring

All errors are logged with:
- Error message
- Error code
- Error type classification
- Partial email (for privacy)
- Timestamp (via console.log)

## Best Practices

1. **Never block critical operations**: Token creation succeeds even if email fails
2. **Timeout all external calls**: Prevent indefinite hangs
3. **Classify errors**: Helps with debugging and monitoring
4. **User-friendly messages**: Don't expose technical details to users
5. **Structured logging**: Makes debugging easier

## Future Improvements

- Add retry logic for transient network errors
- Implement exponential backoff for email sending
- Add metrics/monitoring for error rates
- Consider using a queue system for email sending (e.g., BullMQ)

