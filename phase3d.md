We are now implementing Phase 3D.

Phase 3D = Dashboard + Wrong Book (READ-ONLY decision layer).

Hard rules:
- Do NOT modify Prisma schema
- Do NOT write to database
- Do NOT change UserProgress or WrongBook
- UI must be derived entirely from existing data

Scope:
1. Implement Dashboard page
   - Overall stats (total / completed / correct / wrong)
   - Domain-level aggregation
   - Clear CTA buttons (Resume / Wrong Book)

2. Implement Wrong Book page
   - List wrong questions
   - Show wrong_count and domain
   - Click to reopen Question Page with full context

Data sources:
- UserProgress
- WrongBook
- Question
- QuestionChat (only when navigating back)

Before coding:
- Explain what data is read
- Explain how aggregation is done
- Explicitly list forbidden side effects

Success criteria:
- Dashboard reflects real progress
- Wrong Book shows accurate mistake history
- Navigating from Wrong Book restores full context
- No API performs write operations

If any mutation seems necessary, STOP and explain instead of implementing.
