🎯 开发目标（High-level Goal）

在现有 CAMS Quiz 网站（Next.js + SQLite） 中，
为用户答错的题目增加一个 AI 解释功能，
通过调用 OpenAI API（Chat Completion），
自动生成考试导向、结构清晰、可读性强的错题解析。

🧩 功能范围（Scope）
1️⃣ 触发方式（Frontend）

当用户 答错一道题 后：

页面显示一个按钮：

🤖 Explain this question (AI)


点击按钮后：

页面进入 loading 状态

调用后端 API

返回 AI 生成的解释

在当前题目下方 展开显示解释内容

2️⃣ 后端 API（Backend）
API Endpoint
POST /api/ai/explain

Request Body（JSON）
{
  "question_id": 123,
  "question": "Which two factors should increase the risk of a correspondent bank customer ...?",
  "options": {
    "A": "The customer is located in a Financial Action Task Force member country ...",
    "B": "The customer is located in a Financial Action Task Force member country and the bank’s head ...",
    "C": "...",
    "D": "..."
  },
  "correct_answers": ["B", "D"],
  "user_answers": ["A"],
  "topic": "Wolfsberg / Correspondent Banking",
  "language": "English"
}


language 允许值：

"English"

"Chinese"

3️⃣ AI Prompt（核心部分，必须严格使用）
System Prompt
You are a senior AML and CAMS instructor.
Your explanations must be accurate, exam-oriented, and easy to understand.

User Prompt（固定模板）
Explain the following CAMS multiple-choice question.

Instructions:
1. First, briefly explain what concept or risk area the question is testing.
2. Then explain why each correct option is correct.
3. Then explain why each incorrect option is incorrect.
4. Use concise bullet points.
5. Focus on CAMS exam logic rather than long regulatory quotations.
6. Write in {language}.

Question:
{question}

Options:
{options}

Correct answers:
{correct_answers}

User selected:
{user_answers}

Topic:
{topic}


⚠️ {language} 必须由后端动态替换为 "English" 或 "Chinese"

4️⃣ OpenAI API 调用要求

使用 Chat Completions API

模型建议：

gpt-4o-mini（成本低、解释能力足够）

参数建议：

{
  temperature: 0.3,
  max_tokens: 600
}

5️⃣ API Response（后端返回给前端）
{
  "explanation": "This question tests understanding of correspondent banking risk factors...\n\n• Correct options:\n- B: ...\n- D: ...\n\n• Incorrect options:\n- A: ...\n- C: ..."
}

6️⃣ 前端展示要求（UI）

AI 解释展示为：

灰色或浅蓝背景卡片

标题：

AI Explanation


内容支持：

换行

bullet points

不允许编辑

7️⃣ 基本防护（必须做）

同一道题：

一次请求后缓存结果（SQLite 或 in-memory）

防止滥用：

免费用户：

每天最多 1 次 AI 解释

付费用户：

不限制（后续 Phase）

🧠 非功能性要求（Important）

不在前端暴露 OpenAI API Key

所有 AI 请求必须走 server-side API

解释内容 只围绕当前题目

不允许生成与考试无关的内容

🚀 交付结果（Definition of Done）

用户答错题目 → 点击 AI Explain

5–10 秒内返回结构化解释

解释内容清晰、考试导向明确

可切换语言（English / Chinese）

🧩 额外加分（Optional）

在解释末尾追加一句：

Tip for CAMS exam: