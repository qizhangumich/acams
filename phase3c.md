We are now implementing Phase 3C.

Phase 3C = Question-level Chat (scoped, persistent).

Hard rules:
- Do NOT modify Prisma schema
- Do NOT modify UserProgress or WrongBook
- Chat must be strictly scoped to user + question
- Chat messages are append-only
- AI system prompt must be fixed and restrictive

Tasks:
1. Implement QuestionChat UI component
2. Load chat history for current question
3. Implement POST /api/chat
4. Persist both user and assistant messages
5. Call OpenAI with strict system prompt and question context

Forbidden:
- Cross-question chat
- Chat affecting progress or score
- Free-form AI explanations
- User-defined system prompts

Before coding:
- Explicitly explain how scope is enforced
- Explicitly explain how side effects are prevented
- Explicitly describe failure behavior (AI error, timeout)

Success criteria:
- Switching questions resets chat UI
- Returning to old question restores full chat
- Chat failure does not affect answering questions

If any rule is violated, STOP and explain instead of implementing.
