Based on the architecture above,
we now enter Phase 2: Foundation Implementation.

ONLY implement the following parts:

1. Prisma schema (production-grade)
   - User
   - Question (read-only)
   - UserProgress
   - QuestionChat
   - WrongBook

2. Database migration strategy

3. Email Magic Link authentication
   - Token generation & verification
   - User creation on first login
   - Session restore across devices

4. User progress restore logic
   - Resume last unfinished question
   - Define clear status precedence rules

DO NOT implement:
- Question UI
- Chat UI
- Wrong Book UI
- Explanation rendering

Before writing code:
- Explicitly explain design decisions
- Explicitly define edge-case behavior

This phase must be stable and extensible.
