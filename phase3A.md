We are now implementing Phase 3A.

Scope:
Phase 3A = Question Page with answer submission and status display ONLY.

Hard rules:
- Do NOT modify Prisma schema
- Do NOT modify authentication logic
- Do NOT implement explanation, chat, dashboard, or navigation
- UI must be 100% driven by backend state

Tasks:
1. Implement Question Page (Next.js App Router)
2. On page load:
   - Call GET /api/progress/resume
   - Render the returned question and userProgress
3. Implement answer selection UI
4. On submit:
   - Call POST /api/progress
   - Use backend response to display Correct / Incorrect
5. After submission:
   - Disable further input OR clearly show read-only state

Before coding:
- Explain what data is read from DB
- Explain what data is written to DB
- Explicitly state what this phase does NOT do

Success criteria:
- Page refresh does not change state
- Same question shows same status on different devices
- UI never guesses correctness locally

If any new requirement appears, STOP and explain instead of implementing.
