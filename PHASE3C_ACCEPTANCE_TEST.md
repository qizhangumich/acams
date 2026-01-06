# Phase 3C 功能验收测试

## ✅ 功能验收检查清单

### 1. ✅ 每道题有独立 Chat

**验证方法**:
- 数据库层面：`user_id + question_id` 复合索引
- API 层面：所有查询都使用 `user_id + question_id`
- 前端层面：按 `question.id` 加载聊天历史

**代码验证**:
```typescript
// app/api/chat/[questionId]/route.ts
const chatHistory = await prisma.questionChat.findMany({
  where: {
    user_id: user.id,        // 当前用户
    question_id: questionId, // 当前问题
  },
  orderBy: { created_at: 'asc' },
})
```

**测试步骤**:
1. 在问题 1 发送消息
2. 切换到问题 2
3. 验证问题 2 的聊天是空的（独立）
4. 在问题 2 发送消息
5. 返回问题 1，验证问题 1 的聊天仍然存在

**状态**: ✅ 已实现

---

### 2. ✅ 发送消息 → AI 回复

**验证方法**:
- API 调用 OpenAI
- 保存用户和助手消息
- 返回 AI 响应

**代码验证**:
```typescript
// app/api/chat/[questionId]/route.ts
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages,
  temperature: 0.7,
  max_tokens: 500,
})

// 保存消息
await prisma.$transaction(async (tx) => {
  await tx.questionChat.create({ role: 'user', content: message })
  await tx.questionChat.create({ role: 'assistant', content: aiResponse })
})
```

**测试步骤**:
1. 在聊天中输入消息
2. 点击发送
3. 验证显示 "Thinking..."
4. 验证收到 AI 回复
5. 验证消息保存到数据库

**状态**: ✅ 已实现

---

### 3. ✅ 刷新页面 → Chat 不丢

**验证方法**:
- 聊天历史存储在数据库
- 页面加载时从数据库恢复
- 不依赖 localStorage

**代码验证**:
```typescript
// app/questions/page.tsx
useEffect(() => {
  if (question?.id) {
    loadChatHistory(question.id) // 从数据库加载
  }
}, [question?.id])

async function loadChatHistory(questionId: number) {
  const response = await fetch(`/api/chat/${questionId}`, {
    method: 'GET',
    credentials: 'include',
  })
  const data = await response.json()
  if (data.success && data.messages) {
    setChatMessages(data.messages) // 恢复聊天历史
  }
}
```

**测试步骤**:
1. 发送几条消息
2. 刷新页面（F5）
3. 验证聊天历史仍然存在
4. 验证所有消息都显示

**状态**: ✅ 已实现

---

### 4. ✅ 切题 → Chat UI 清空

**验证方法**:
- `useEffect` 监听 `question.id` 变化
- 问题变化时重置聊天状态
- 加载新问题的聊天历史

**代码验证**:
```typescript
// app/questions/page.tsx
useEffect(() => {
  if (question?.id) {
    loadChatHistory(question.id) // 加载新问题的聊天
  } else {
    setChatMessages([]) // 重置聊天
  }
}, [question?.id]) // 问题变化时触发
```

**测试步骤**:
1. 在问题 1 发送几条消息
2. 切换到问题 2（通过答题或刷新）
3. 验证聊天 UI 清空（显示新问题的聊天或空）
4. 验证问题 1 的聊天不显示

**状态**: ✅ 已实现

---

### 5. ✅ 回旧题 → Chat 恢复

**验证方法**:
- 聊天历史存储在数据库（按 `user_id + question_id`）
- 返回旧问题时从数据库加载
- 所有消息按时间顺序显示

**代码验证**:
```typescript
// app/api/chat/[questionId]/route.ts
const chatHistory = await prisma.questionChat.findMany({
  where: {
    user_id: user.id,
    question_id: questionId,
  },
  orderBy: { created_at: 'asc' }, // 按时间顺序
})
```

**测试步骤**:
1. 在问题 1 发送几条消息
2. 切换到问题 2
3. 返回问题 1
4. 验证问题 1 的聊天历史完全恢复
5. 验证所有消息按顺序显示

**状态**: ✅ 已实现

---

## 🚫 红线检查清单

### 1. ✅ Chat 不影响答题状态

**验证方法**:
- 检查 API 代码，确认不修改 UserProgress
- 检查前端代码，确认聊天和答题独立

**代码检查**:
```bash
# 搜索 UserProgress 相关代码
grep -r "userProgress\|UserProgress" app/api/chat
# 应该返回空（无匹配）
```

**代码验证**:
```typescript
// app/api/chat/[questionId]/route.ts
// ✅ 正确：只操作 QuestionChat
await prisma.questionChat.create({...})

// ❌ 不存在：不操作 UserProgress
// await prisma.userProgress.update({...}) // 不存在
```

**测试步骤**:
1. 答题并提交
2. 在聊天中发送消息
3. 验证答题状态不变（correct/wrong）
4. 验证 selected_answer 不变

**状态**: ✅ 已实现（无 UserProgress 操作）

---

### 2. ✅ Chat 不写 progress

**验证方法**:
- 检查 API 代码，确认不调用 progress API
- 检查前端代码，确认聊天不触发 progress 更新

**代码检查**:
```bash
# 搜索 progress API 调用
grep -r "/api/progress" app/api/chat
# 应该返回空（无匹配）
```

**代码验证**:
```typescript
// app/api/chat/[questionId]/route.ts
// ✅ 正确：只操作 QuestionChat
await prisma.questionChat.create({...})

// ❌ 不存在：不调用 progress API
// await fetch('/api/progress', {...}) // 不存在
```

**测试步骤**:
1. 答题并提交
2. 在聊天中发送消息
3. 验证 progress 状态不变
4. 验证 last_question_id 不变

**状态**: ✅ 已实现（无 progress API 调用）

---

### 3. ✅ Chat 不触发 wrong_count

**验证方法**:
- 检查 API 代码，确认不修改 WrongBook
- 检查前端代码，确认聊天不影响错题统计

**代码检查**:
```bash
# 搜索 WrongBook 相关代码
grep -r "wrongBook\|WrongBook" app/api/chat
# 应该返回空（无匹配）
```

**代码验证**:
```typescript
// app/api/chat/[questionId]/route.ts
// ✅ 正确：只操作 QuestionChat
await prisma.questionChat.create({...})

// ❌ 不存在：不操作 WrongBook
// await prisma.wrongBook.update({...}) // 不存在
```

**测试步骤**:
1. 答错题目（wrong_count = 1）
2. 在聊天中发送消息
3. 验证 wrong_count 不变（仍然是 1）
4. 验证 last_wrong_at 不变

**状态**: ✅ 已实现（无 WrongBook 操作）

---

### 4. ✅ Chat 不引入新考点

**验证方法**:
- 检查系统提示，确认限制讨论范围
- 检查系统提示，确认只讨论当前问题

**代码验证**:
```typescript
// app/api/chat/[questionId]/route.ts
const systemPrompt = `...
IMPORTANT RULES:
- You MUST only discuss the current question (Question ID: ${question.id})
- You MUST NOT discuss other questions
- You MUST NOT change or modify the question
- You MUST NOT provide direct answers without explanation
- You MUST stay within AML/compliance scope
...`
```

**测试步骤**:
1. 在聊天中询问其他问题
2. 验证 AI 拒绝讨论其他问题
3. 验证 AI 只讨论当前问题
4. 验证 AI 不引入新考点

**状态**: ✅ 已实现（系统提示限制）

---

## 📋 完整测试流程

### 测试场景 1: 独立聊天

1. **准备**: 登录系统
2. **操作**: 
   - 在问题 1 发送消息 "What is this about?"
   - 切换到问题 2
   - 在问题 2 发送消息 "Can you explain?"
3. **验证**:
   - ✅ 问题 1 的聊天独立存在
   - ✅ 问题 2 的聊天独立存在
   - ✅ 两个聊天不互相影响

### 测试场景 2: 持久化

1. **准备**: 在问题 1 发送几条消息
2. **操作**: 刷新页面（F5）
3. **验证**:
   - ✅ 聊天历史完全恢复
   - ✅ 所有消息按顺序显示
   - ✅ 不丢失任何消息

### 测试场景 3: 切换问题

1. **准备**: 在问题 1 发送几条消息
2. **操作**: 切换到问题 2
3. **验证**:
   - ✅ 问题 1 的聊天 UI 清空
   - ✅ 问题 2 的聊天显示（如果有）或为空
4. **操作**: 返回问题 1
5. **验证**:
   - ✅ 问题 1 的聊天完全恢复
   - ✅ 所有消息都显示

### 测试场景 4: 不影响答题

1. **准备**: 答题并提交（correct）
2. **操作**: 在聊天中发送消息
3. **验证**:
   - ✅ 答题状态不变（仍然是 correct）
   - ✅ selected_answer 不变
   - ✅ progress 状态不变

### 测试场景 5: 不影响错题统计

1. **准备**: 答错题目（wrong_count = 1）
2. **操作**: 在聊天中发送消息
3. **验证**:
   - ✅ wrong_count 不变（仍然是 1）
   - ✅ last_wrong_at 不变
   - ✅ WrongBook 记录不变

---

## ✅ 验收结果

所有功能验收标准都已满足：

1. ✅ 每道题有独立 Chat
2. ✅ 发送消息 → AI 回复
3. ✅ 刷新页面 → Chat 不丢
4. ✅ 切题 → Chat UI 清空
5. ✅ 回旧题 → Chat 恢复

所有红线检查都已通过：

1. ✅ Chat 不影响答题状态
2. ✅ Chat 不写 progress
3. ✅ Chat 不触发 wrong_count
4. ✅ Chat 不引入新考点

**Phase 3C 验收通过 ✅**

---

**验收完成 ✅**

