We are now implementing Phase 3B.

Phase 3B = Explanation Layer (READ-ONLY).

Hard rules:
- Do NOT modify Prisma schema
- Do NOT add or modify any API routes
- Do NOT write to database
- Do NOT modify UserProgress or WrongBook
- Explanation must be collapsed by default

Tasks:
1. Add a “Show Explanation” button on the Question Page
2. Implement an Explanation Panel that toggles open/close
3. Inside the panel, render tabbed content:
   - Official Explanation
   - AI Explanation (EN)
   - AI Explanation (中文)
4. Explanation content must come ONLY from Question fields

Before coding:
- Explicitly explain why this layer is read-only
- Explicitly state what state is allowed (UI-only)
- Explicitly list forbidden side effects

Success criteria:
- Opening explanation does not trigger any API calls
- Refreshing page collapses explanation
- Explanation works identically for correct and wrong answers

If any database write or API change seems necessary, STOP and explain instead of implementing.
