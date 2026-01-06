# ACAMS Learning System -- Cursor Ultimate Prompt

## 🎯 Role & Goal

You are a **senior full-stack engineer and system architect**.

You are helping me rebuild an **ACAMS exam preparation system** that
is: - crash-resistant - progress-aware - learning-oriented (not just a
question bank)

The system must support **long-term study**, **question-level
thinking**, and **review based on mistakes**.

------------------------------------------------------------------------

## 🧠 Core Product Philosophy (IMPORTANT)

This is **NOT** a simple quiz app.

This is a **personal learning system** with: - Persistent identity
(email-based) - Persistent progress - Persistent thinking (chat history
per question) - Persistent mistakes (wrong book)

Design everything accordingly.

------------------------------------------------------------------------

## 🧩 Tech Stack Assumptions

-   Frontend: Next.js (App Router) + React
-   Backend: Next.js API routes
-   Database: PostgreSQL (via Prisma)
-   Auth: Email Magic Link (no password)
-   AI: OpenAI API (ChatGPT)

If you need to make reasonable assumptions, do so and explain briefly.

------------------------------------------------------------------------

## 🧱 DATA MODELS (Must be explicit)

### User

-   id
-   email (unique)
-   created_at

### Question

-   id
-   domain
-   question_text
-   options (A/B/C/D...)
-   correct_answers
-   explanation
-   explanation_ai_en
-   explanation_ai_ch

(Questions already exist and are loaded from JSON initially.)

### UserProgress (CRITICAL)

Tracks per-question progress per user: - user_id - question_id - status:
not_started \| correct \| wrong - selected_answer - updated_at

Rules: - Progress must auto-restore on login - User resumes from last
unfinished question

### QuestionChat (CORE FEATURE)

Stores ChatGPT conversation per question: - id - user_id - question_id -
role (user \| assistant) - content - created_at

Rules: - Chat is strictly scoped to the current question - Chat history
reloads when revisiting question - System prompt restricts answers to
exam logic only

### WrongBook

Tracks mistakes: - user_id - question_id - wrong_count - last_wrong_at

Rules: - Increment wrong_count on each wrong attempt - Used to generate
Wrong Questions page

------------------------------------------------------------------------

## 🔐 AUTHENTICATION (Email Magic Link)

Implement passwordless email login.

Requirements: - Email = unique identity - Create user if not exists -
Restore progress on login - Redirect to last active question - No
passwords, no social login

Explain briefly how token verification works.

------------------------------------------------------------------------

## 🖥️ FRONTEND PAGES

### Question Page

Includes: - Question & options (no explanations by default) -
Explanation panel (collapsed, tabbed): - Official - AI EN - AI 中文 -
Question Chat ("Ask about this question")

Chat behavior: - Scoped to current question - Stored in DB - Reloaded on
revisit

### Progress Dashboard

-   Total questions
-   Completed / Correct / Wrong
-   Resume button

### Wrong Book Page

-   Wrong questions list
-   Wrong count
-   Click to reopen question + chat
-   Optional domain filter

------------------------------------------------------------------------

## 🤖 CHATGPT INTEGRATION

Use fixed system prompt:

You are an ACAMS exam tutor. Only answer questions related to the
current exam question. Explain using exam logic and regulatory
reasoning. Do not introduce unrelated concepts. Do not expand beyond the
scope of the question.

Context includes: - Question text - Options - Correct answer (hidden
from user)

------------------------------------------------------------------------

## 🔁 USER FLOW

1.  User opens site
2.  Enters email
3.  Clicks magic link
4.  System restores progress, last question, chats
5.  User answers question
6.  System saves progress & updates wrong book
7.  User optionally views explanation or chats
8.  User leaves and later resumes seamlessly

------------------------------------------------------------------------

## 🧪 EDGE CASES

-   Refresh
-   Crash
-   Device switch
-   Partial attempt
-   Re-answering
-   Multiple wrong attempts

------------------------------------------------------------------------

## 📦 OUTPUT FORMAT REQUIRED

Respond with: 1. Architecture explanation 2. Prisma schema 3. API routes
4. Frontend structure 5. ChatGPT integration 6. UX logic snippets

Do not skip steps.

------------------------------------------------------------------------

## 🚀 Quality Bar

The system should feel: - Calm - Serious - Trustworthy - Like a personal
compliance tutor

If optional vs essential, label clearly.

**Start now.**
