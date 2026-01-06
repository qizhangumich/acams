# Phase 3C: Question-level Chat Design

## 🎯 范围强制执行（Scope Enforcement）

### 如何强制执行 user + question 范围

#### 1. 数据库层面

**QuestionChat 模型**（已存在于 Prisma schema）:
```prisma
model QuestionChat {
  id            String   @id @default(cuid())
  user_id       String
  question_id   Int
  role          ChatRole  // 'user' | 'assistant'
  content       String
  created_at    DateTime @default(now())
  
  user          User     @relation(fields: [user_id], references: [id], onDelete: Cascade)
  question      Question @relation(fields: [question_id], references: [id], onDelete: Cascade)
  
  @@unique([user_id, question_id, created_at])
  @@index([user_id, question_id])
}
```

**范围保证**:
- ✅ `user_id` + `question_id` 复合索引确保查询范围
- ✅ 外键约束确保数据完整性
- ✅ `onDelete: Cascade` 确保用户删除时清理聊天记录

#### 2. API 层面

**POST /api/chat/:questionId**:
```typescript
// 1. 从 session 获取 user_id
const user = await getUserFromSession(sessionToken)

// 2. 从 URL 参数获取 question_id
const questionId = parseInt(params.questionId)

// 3. 验证 question 存在且属于当前用户可访问
const question = await prisma.question.findUnique({
  where: { id: questionId }
})

// 4. 所有聊天操作都使用 user_id + question_id
await prisma.questionChat.create({
  data: {
    user_id: user.id,        // 强制使用 session 中的 user_id
    question_id: questionId, // 强制使用 URL 参数
    role: 'user',
    content: userMessage
  }
})
```

**范围验证**:
- ✅ 用户只能访问自己的聊天记录
- ✅ 每个问题有独立的聊天历史
- ✅ 无法跨问题访问聊天记录

#### 3. 前端层面

**组件状态管理**:
```typescript
// 当前问题 ID（从页面加载时获取）
const currentQuestionId = question.id

// 聊天历史（按 question_id 加载）
useEffect(() => {
  if (question.id) {
    loadChatHistory(question.id) // 只加载当前问题的聊天
  }
}, [question.id]) // 问题变化时重新加载
```

**范围保证**:
- ✅ 切换问题时，`question.id` 变化触发重新加载
- ✅ 每个问题有独立的聊天状态
- ✅ 无法在 UI 中访问其他问题的聊天

---

## 🛡️ 副作用防护（Side Effect Prevention）

### 如何防止副作用

#### 1. 不修改 UserProgress

**验证**:
- ✅ 聊天 API 不调用 `prisma.userProgress` 的任何操作
- ✅ 不更新 `status`, `selected_answer`, `updated_at`
- ✅ 聊天和答题完全独立

**代码检查**:
```typescript
// ✅ 正确：只操作 QuestionChat
await prisma.questionChat.create({...})

// ❌ 禁止：不操作 UserProgress
// await prisma.userProgress.update({...}) // 不存在
```

#### 2. 不修改 WrongBook

**验证**:
- ✅ 聊天 API 不调用 `prisma.wrongBook` 的任何操作
- ✅ 不更新 `wrong_count`, `last_wrong_at`
- ✅ 聊天不影响错题统计

#### 3. 不修改 Question 数据

**验证**:
- ✅ 聊天 API 只读取 `Question` 数据（用于上下文）
- ✅ 不修改 `explanation`, `explanation_ai_en`, `explanation_ai_ch`
- ✅ 聊天是独立的对话，不影响问题内容

#### 4. 聊天不影响答题流程

**验证**:
- ✅ 聊天失败不影响 `POST /api/progress`
- ✅ 聊天和答题使用不同的 API 端点
- ✅ 前端错误处理隔离

---

## ⚠️ 失败行为（Failure Behavior）

### AI 错误处理

#### 1. OpenAI API 错误

**场景**: OpenAI API 返回错误（网络错误、API 错误、超时等）

**处理**:
```typescript
try {
  const response = await openai.chat.completions.create({...})
} catch (error) {
  // 1. 不保存用户消息（保持一致性）
  // 2. 返回错误响应给前端
  // 3. 前端显示错误消息
  // 4. 不影响答题功能
  return NextResponse.json({
    success: false,
    message: 'Failed to get AI response. Please try again.'
  }, { status: 500 })
}
```

**影响范围**:
- ✅ 不影响 `UserProgress`
- ✅ 不影响 `WrongBook`
- ✅ 不影响答题功能
- ✅ 用户消息不保存（如果 AI 响应失败）

#### 2. 超时处理

**场景**: OpenAI API 响应超时（> 30 秒）

**处理**:
```typescript
// 设置超时
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 30000)

try {
  const response = await openai.chat.completions.create({
    ...,
    signal: controller.signal
  })
} catch (error) {
  if (error.name === 'AbortError') {
    return NextResponse.json({
      success: false,
      message: 'Request timeout. Please try again.'
    }, { status: 504 })
  }
}
```

**影响范围**:
- ✅ 超时不影响其他功能
- ✅ 前端显示超时错误
- ✅ 用户可以重试

#### 3. 部分失败处理

**场景**: 用户消息保存成功，但 AI 响应失败

**处理**:
```typescript
// 使用事务确保原子性
await prisma.$transaction(async (tx) => {
  // 1. 保存用户消息
  await tx.questionChat.create({
    data: { user_id, question_id, role: 'user', content }
  })
  
  // 2. 获取 AI 响应
  try {
    const aiResponse = await getAIResponse(...)
    
    // 3. 保存 AI 消息
    await tx.questionChat.create({
      data: { user_id, question_id, role: 'assistant', content: aiResponse }
    })
  } catch (error) {
    // 如果 AI 失败，回滚用户消息（保持一致性）
    throw error // 事务自动回滚
  }
})
```

**影响范围**:
- ✅ 要么全部成功，要么全部失败
- ✅ 不会出现只有用户消息没有 AI 响应的情况

---

## 🔒 系统提示（System Prompt）

### 固定且限制性的系统提示

**系统提示模板**:
```
You are a helpful assistant for an Anti-Money Laundering (AML) exam preparation system.

You are helping a student understand a specific exam question. Your role is to:
1. Answer questions ONLY about the current question
2. Provide explanations that help understand the correct answer
3. Stay within the scope of AML/compliance knowledge
4. Do NOT provide answers directly - guide the student to understand

Current Question Context:
- Question ID: {questionId}
- Domain: {domain}
- Question: {questionText}
- Options: {options}
- Correct Answer(s): {correctAnswers}

IMPORTANT RULES:
- You MUST only discuss the current question
- You MUST NOT discuss other questions
- You MUST NOT change or modify the question
- You MUST NOT provide direct answers without explanation
- You MUST stay within AML/compliance scope
```

**限制性措施**:
- ✅ 系统提示固定，用户无法修改
- ✅ 包含问题上下文，限制讨论范围
- ✅ 明确禁止跨问题讨论
- ✅ 明确禁止直接给出答案

---

## 📋 实现检查清单

### 范围强制执行

- [ ] API 从 session 获取 user_id
- [ ] API 从 URL 参数获取 question_id
- [ ] 所有查询使用 user_id + question_id
- [ ] 前端按 question_id 加载聊天历史
- [ ] 切换问题时重置聊天 UI

### 副作用防护

- [ ] 不修改 UserProgress
- [ ] 不修改 WrongBook
- [ ] 不修改 Question 数据
- [ ] 聊天和答题完全独立

### 失败处理

- [ ] OpenAI API 错误处理
- [ ] 超时处理（30 秒）
- [ ] 部分失败回滚（事务）
- [ ] 错误不影响答题功能

### 系统提示

- [ ] 系统提示固定
- [ ] 包含问题上下文
- [ ] 限制讨论范围
- [ ] 用户无法修改

---

**End of Design Document**

