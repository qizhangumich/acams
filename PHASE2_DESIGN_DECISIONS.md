# Phase 2: Design Decisions & Edge Cases

## 🎯 Design Decisions

### 1. Prisma Schema Design

#### Decision: UUID vs Auto-increment IDs
**Choice**: UUID for User, UserProgress, QuestionChat, WrongBook; Integer for Question
**Rationale**:
- Questions are pre-loaded from JSON with existing integer IDs
- User-related entities use UUID for security (no ID enumeration)
- UUID enables distributed systems and better privacy

#### Decision: JSON vs Separate Tables for Options
**Choice**: JSON column for Question.options
**Rationale**:
- Options are simple key-value pairs (A, B, C, D)
- No need for complex queries on options
- Simpler schema, easier to maintain
- Matches existing questions.json structure

#### Decision: Enum vs String for Status
**Choice**: Prisma enum for ProgressStatus and ChatRole
**Rationale**:
- Type safety at database and application level
- Prevents invalid values
- Better IDE support

#### Decision: Cascade Delete
**Choice**: `onDelete: Cascade` for all user-related records
**Rationale**:
- If user is deleted, all their data should be removed
- Prevents orphaned records
- GDPR compliance (right to be forgotten)

### 2. Authentication Design

#### Decision: Magic Link Token Storage
**Choice**: Separate table (MagicLinkToken) with expiration
**Rationale**:
- Can track token usage (one-time use)
- Easy to invalidate all tokens for a user
- Can add rate limiting per email
- Clear separation of concerns

#### Decision: Token Expiration
**Choice**: 15 minutes
**Rationale**:
- Balance between security and UX
- Long enough for user to check email
- Short enough to prevent abuse
- Industry standard

#### Decision: Session Management
**Choice**: JWT tokens stored in HTTP-only cookies
**Rationale**:
- Stateless (no server-side session storage)
- Works across multiple servers (scalable)
- HTTP-only prevents XSS attacks
- Can include user_id and expiration

#### Decision: User Creation Strategy
**Choice**: Create user on first magic link verification
**Rationale**:
- No need to pre-register
- Email verification = account creation
- Simpler flow, fewer steps

### 3. Progress Restore Logic

#### Decision: Resume Point Algorithm
**Choice**: 
1. Check User.last_question_id
2. Find first question with status 'not_started' after last_question_id
3. If none found, find first 'not_started' question overall
4. If all completed, return last question

**Rationale**:
- Respects user's last position
- Always finds next uncompleted question
- Handles edge case of all questions completed

#### Decision: Status Precedence
**Priority Order**:
1. `not_started` - Highest priority (needs attention)
2. `wrong` - Medium priority (needs review)
3. `correct` - Lowest priority (already mastered)

**Rationale**:
- Focus on uncompleted work first
- Wrong answers need review
- Correct answers are lower priority

#### Decision: Progress Update Strategy
**Choice**: Upsert (INSERT ... ON CONFLICT UPDATE)
**Rationale**:
- Idempotent operations
- Handles re-answering gracefully
- No duplicate records
- Atomic operation

### 4. Database Migration Strategy

#### Decision: Migration Approach
**Choice**: Prisma Migrate with version control
**Rationale**:
- Tracked in git
- Reproducible across environments
- Rollback capability
- Team collaboration

#### Decision: Seed Strategy
**Choice**: Separate seed script for questions
**Rationale**:
- Questions are large dataset
- Can be run independently
- Can be updated without affecting migrations
- Idempotent (can run multiple times)

---

## 🛡 Edge Cases & Behavior

### Authentication Edge Cases

#### Case 1: Expired Token
**Behavior**: 
- Return 401 error with message "Magic link expired"
- Offer option to resend magic link
- Clear expired token from database

#### Case 2: Invalid Token
**Behavior**:
- Return 401 error with message "Invalid magic link"
- Log attempt for security monitoring
- Don't reveal if email exists (security)

#### Case 3: Token Already Used
**Behavior**:
- Mark token as used after first verification
- Subsequent uses return 401 "Token already used"
- Prevent replay attacks

#### Case 4: Email Already Exists
**Behavior**:
- Find existing user
- Restore their progress
- Generate new session token
- No error, seamless login

#### Case 5: Rate Limiting
**Behavior**:
- Max 5 magic links per email per hour
- Return 429 "Too many requests" if exceeded
- Log attempts for monitoring

### Progress Restore Edge Cases

#### Case 1: No Progress Yet
**Behavior**:
- Return first question (ID: 1)
- Create UserProgress record with status 'not_started'
- Set User.last_question_id to 1

#### Case 2: All Questions Completed
**Behavior**:
- Return last question user answered
- Show completion message
- Allow review mode

#### Case 3: Last Question Deleted/Invalid
**Behavior**:
- Find next valid question
- Update User.last_question_id
- Continue from new position

#### Case 4: Concurrent Updates
**Behavior**:
- Use database transactions
- Last write wins (acceptable for progress)
- No race conditions with Prisma

#### Case 5: Partial Progress (Selected but not submitted)
**Behavior**:
- Don't save to database until submit
- Store in localStorage as backup
- On resume, show "Continue" option if localStorage has data

### Database Edge Cases

#### Case 1: Question Not Found
**Behavior**:
- Return 404 error
- Log missing question ID
- Don't crash, graceful error handling

#### Case 2: User Not Found
**Behavior**:
- Return 401 "Unauthorized"
- Redirect to login
- Clear invalid session

#### Case 3: Database Connection Failure
**Behavior**:
- Retry with exponential backoff (3 attempts)
- Return 503 "Service unavailable"
- Log error for monitoring
- Show user-friendly message

#### Case 4: Migration Failure
**Behavior**:
- Rollback transaction
- Log error details
- Don't apply partial migration
- Alert administrators

### Session Edge Cases

#### Case 1: Expired Session
**Behavior**:
- Return 401 "Session expired"
- Redirect to login
- Clear expired session cookie
- Offer to resend magic link

#### Case 2: Invalid Session Token
**Behavior**:
- Return 401 "Invalid session"
- Clear invalid cookie
- Redirect to login

#### Case 3: Missing Session Token
**Behavior**:
- Return 401 "Authentication required"
- Redirect to login
- Don't expose protected routes

---

## 🔒 Security Considerations

### Token Security
- **Magic Link Tokens**: 32-byte cryptographically secure random
- **JWT Secret**: Strong secret (min 32 characters)
- **Token Storage**: Database for magic links, HTTP-only cookies for sessions
- **Token Rotation**: New session token on each login

### Email Security
- **Email Validation**: Strict format validation
- **Rate Limiting**: Prevent email spam
- **No Email Enumeration**: Don't reveal if email exists

### Database Security
- **Parameterized Queries**: Prisma handles SQL injection prevention
- **User Isolation**: All queries filtered by user_id
- **Cascade Delete**: Proper cleanup on user deletion

---

## 📊 Performance Considerations

### Database Queries
- **Indexes**: All foreign keys and query patterns indexed
- **Batch Loading**: Load multiple records in single query
- **Connection Pooling**: Prisma connection pool

### Caching Strategy
- **Questions**: Cache in memory (immutable, large dataset)
- **User Progress**: Cache per session, invalidate on update
- **Chat History**: Load on demand, cache in component state

### API Optimization
- **Pagination**: Wrong book paginated (50 per page)
- **Selective Fields**: Only load needed fields
- **Lazy Loading**: Chat history loaded when panel opens

---

## ✅ Validation Rules

### Email Validation
- Format: RFC 5322 compliant
- Length: Max 255 characters
- Domain: Must have valid TLD
- Local part: Standard email characters

### Question ID Validation
- Must be positive integer
- Must exist in Question table
- Range: 1 to max question ID

### Answer Validation
- Must be array of strings
- Each answer must be valid option key (A, B, C, D, etc.)
- Must match question's available options
- Cannot be empty array

---

## 🧪 Testing Strategy

### Unit Tests
- Token generation and validation
- Progress restore logic
- Status precedence rules
- Edge case handlers

### Integration Tests
- Magic link flow (end-to-end)
- Progress save and restore
- Session management
- Database migrations

### Edge Case Tests
- Expired tokens
- Invalid data
- Concurrent updates
- Database failures

---

**End of Design Decisions Document**

