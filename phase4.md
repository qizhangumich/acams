We are now implementing Phase 4.

Phase 4 = Exam Sprint Review Mode (READ-ONLY).

Hard rules:
- Do NOT modify Prisma schema
- Do NOT write to database
- Do NOT change UserProgress or WrongBook
- All data is derived from existing tables

Scope:
1. Implement Sprint Dashboard
   - High-risk summary
   - Domain risk aggregation
   - Clear CTA to start review

2. Implement Focus Queue
   - Generate daily review list
   - Sort by wrong_count and recency
   - No persistence

3. Implement Review Mode
   - Read-only question view
   - Explanation expanded by default
   - Chat history visible
   - Optional continued chat (append-only)

Before coding:
- Explain how high-risk questions are identified
- Explain how daily queue is generated
- Explicitly list forbidden side effects

Success criteria:
- Review flow does not affect any learning state
- Refreshing does not lose correctness
- Review mode feels distinct from normal study mode

If any mutation seems necessary, STOP and explain instead of implementing.
