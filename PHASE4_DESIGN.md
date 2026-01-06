# Phase 4: Exam Sprint Review Mode Design

## 🎯 高风险问题识别（High-Risk Question Identification）

### 识别逻辑

**高风险问题的定义**:
1. **错误次数多**: `wrong_count >= 2`（答错 2 次或以上）
2. **最近错误**: `last_wrong_at` 在最近 7 天内
3. **错误率高**: 如果该问题答过多次，错误率 > 50%

**计算公式**:
```typescript
// 高风险评分（0-100）
const riskScore = 
  (wrong_count * 30) +                    // 错误次数权重（最高 60 分）
  (isRecent ? 30 : 0) +                   // 最近错误权重（30 分）
  (errorRate > 0.5 ? 10 : 0)              // 错误率权重（10 分）

// 高风险阈值
const isHighRisk = riskScore >= 50
```

**数据来源**:
- `WrongBook` 表: `wrong_count`, `last_wrong_at`
- `UserProgress` 表: `status` (用于计算错误率)

**实现逻辑**:
```typescript
// 1. 获取所有错题
const wrongQuestions = await prisma.wrongBook.findMany({
  where: { user_id: user.id },
  include: {
    question: { select: { id: true, domain: true } },
  },
})

// 2. 获取对应的进度（用于计算错误率）
const progressMap = new Map()
const progressRecords = await prisma.userProgress.findMany({
  where: {
    user_id: user.id,
    question_id: { in: wrongQuestions.map(w => w.question_id) },
  },
})

progressRecords.forEach(p => {
  progressMap.set(p.question_id, p)
})

// 3. 计算风险评分
const highRiskQuestions = wrongQuestions.map(wrong => {
  const progress = progressMap.get(wrong.question_id)
  const totalAttempts = progress ? (progress.status === 'correct' ? 1 : 0) + wrong.wrong_count : wrong.wrong_count
  const errorRate = totalAttempts > 0 ? wrong.wrong_count / totalAttempts : 1
  
  const daysSinceLastWrong = Math.floor(
    (Date.now() - new Date(wrong.last_wrong_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  const isRecent = daysSinceLastWrong <= 7
  
  const riskScore = 
    (Math.min(wrong.wrong_count, 2) * 30) +  // 错误次数（最高 2 次，60 分）
    (isRecent ? 30 : 0) +                     // 最近错误（30 分）
    (errorRate > 0.5 ? 10 : 0)                // 错误率（10 分）
  
  return {
    question_id: wrong.question_id,
    wrong_count: wrong.wrong_count,
    last_wrong_at: wrong.last_wrong_at,
    domain: wrong.question.domain,
    risk_score: riskScore,
    is_high_risk: riskScore >= 50,
  }
}).filter(q => q.is_high_risk)
```

---

## 📋 每日队列生成（Daily Queue Generation）

### 生成逻辑

**队列特点**:
- 无持久化（每次访问重新生成）
- 基于当前时间（每天可能不同）
- 排序：高风险优先，然后按错误次数和最近错误时间

**生成步骤**:
1. 获取所有高风险问题
2. 按风险评分降序排序
3. 如果风险评分相同，按 `wrong_count` 降序
4. 如果 `wrong_count` 相同，按 `last_wrong_at` 降序
5. 限制数量（例如：最多 20 题）

**实现逻辑**:
```typescript
// 1. 获取高风险问题（使用上面的逻辑）
const highRiskQuestions = await getHighRiskQuestions(user.id)

// 2. 排序
highRiskQuestions.sort((a, b) => {
  // 首先按风险评分
  if (b.risk_score !== a.risk_score) {
    return b.risk_score - a.risk_score
  }
  // 然后按错误次数
  if (b.wrong_count !== a.wrong_count) {
    return b.wrong_count - a.wrong_count
  }
  // 最后按最近错误时间
  return new Date(b.last_wrong_at).getTime() - new Date(a.last_wrong_at).getTime()
})

// 3. 限制数量
const dailyQueue = highRiskQuestions.slice(0, 20)
```

**无持久化**:
- 不保存到数据库
- 不保存到 localStorage
- 每次访问重新计算
- 基于当前时间动态生成

---

## 🚫 禁止的副作用

### 明确禁止的操作

#### 1. 数据库写入

- ❌ 不调用 `prisma.*.create()`
- ❌ 不调用 `prisma.*.update()`
- ❌ 不调用 `prisma.*.delete()`
- ❌ 不调用 `prisma.*.upsert()`
- ❌ 不调用任何会修改数据库的操作

**允许的操作**:
- ✅ `prisma.*.findMany()` - 读取
- ✅ `prisma.*.findUnique()` - 读取
- ✅ `prisma.*.count()` - 读取
- ✅ `prisma.*.groupBy()` - 读取聚合

#### 2. 修改 UserProgress

- ❌ 不更新 `status`
- ❌ 不更新 `selected_answer`
- ❌ 不更新 `updated_at`
- ❌ 不创建新的 UserProgress 记录

#### 3. 修改 WrongBook

- ❌ 不更新 `wrong_count`
- ❌ 不更新 `last_wrong_at`
- ❌ 不创建新的 WrongBook 记录
- ❌ 不删除 WrongBook 记录

#### 4. 修改 User

- ❌ 不更新 `last_question_id`
- ❌ 不更新 `last_active_at`

#### 5. 修改 Question

- ❌ 不修改任何问题数据

#### 6. 修改 QuestionChat（Review Mode 除外）

- ✅ Review Mode 中允许继续聊天（append-only）
- ❌ 不修改现有聊天消息
- ❌ 不删除聊天消息

**注意**: Review Mode 中的聊天是 append-only，只添加新消息，不修改现有消息。这与 Phase 3C 的实现一致。

---

## 📊 数据读取分析

### Sprint Dashboard 数据

**数据源**:
- `WrongBook` 表: 所有错题
- `UserProgress` 表: 进度记录（用于计算错误率）
- `Question` 表: 问题领域信息

**读取操作**:
```typescript
// 1. 获取所有错题
const wrongQuestions = await prisma.wrongBook.findMany({
  where: { user_id: user.id },
  include: { question: { select: { domain: true } } },
})

// 2. 获取对应进度
const progressRecords = await prisma.userProgress.findMany({
  where: {
    user_id: user.id,
    question_id: { in: wrongQuestions.map(w => w.question_id) },
  },
})

// 3. 计算高风险问题
const highRiskQuestions = calculateHighRisk(wrongQuestions, progressRecords)

// 4. 按领域聚合
const domainRisk = aggregateByDomain(highRiskQuestions)
```

---

### Focus Queue 数据

**数据源**:
- 基于 Sprint Dashboard 的高风险问题
- 动态生成，不持久化

**生成逻辑**:
```typescript
// 从高风险问题生成队列
const dailyQueue = highRiskQuestions
  .sort(/* 排序逻辑 */)
  .slice(0, 20) // 限制数量
```

---

### Review Mode 数据

**数据源**:
- `Question` 表: 问题数据
- `UserProgress` 表: 进度状态
- `WrongBook` 表: 错误统计
- `QuestionChat` 表: 聊天历史

**读取操作**:
```typescript
// 1. 获取问题
const question = await prisma.question.findUnique({
  where: { id: questionId },
})

// 2. 获取进度
const progress = await prisma.userProgress.findUnique({
  where: { user_id_question_id: { user_id, question_id } },
})

// 3. 获取错误统计
const wrongBook = await prisma.wrongBook.findUnique({
  where: { user_id_question_id: { user_id, question_id } },
})

// 4. 获取聊天历史
const chatHistory = await prisma.questionChat.findMany({
  where: { user_id, question_id },
  orderBy: { created_at: 'asc' },
})
```

---

## 🎨 UI 设计

### Sprint Dashboard

**布局**:
```
Sprint Dashboard
├── High-Risk Summary
│   ├── Total High-Risk Questions
│   ├── Risk Distribution (by domain)
│   └── Recent Mistakes Count
├── Domain Risk Aggregation
│   └── Table: Domain | High-Risk Count | Total Wrong
└── CTA Button
    └── "Start Review" → Focus Queue
```

### Focus Queue

**布局**:
```
Focus Queue
├── Queue Header
│   ├── "Daily Review Queue"
│   └── "X questions to review"
├── Question List
│   └── Each item:
│       ├── Question preview
│       ├── Wrong count
│       ├── Risk score
│       └── "Review" button
└── Navigation
    └── "Back to Dashboard"
```

### Review Mode

**布局**:
```
Review Mode
├── Question Card (Read-only)
│   ├── Question text
│   ├── Options (showing correct answers)
│   └── Status badge (Wrong X times)
├── Explanation Panel (Expanded by default)
│   ├── Official Explanation
│   ├── AI Explanation (EN)
│   └── AI Explanation (中文)
├── Chat Panel (Visible)
│   ├── Chat history
│   └── Chat input (optional, append-only)
└── Navigation
    ├── "Next Question"
    └── "Back to Queue"
```

---

## 🔄 导航流程

### Dashboard → Focus Queue

**流程**:
1. 用户点击 "Start Review"
2. 导航到 `/review/queue`
3. 生成每日队列（动态，不持久化）

### Focus Queue → Review Mode

**流程**:
1. 用户点击 "Review" 按钮
2. 导航到 `/review/[questionId]`
3. 加载问题、进度、聊天历史
4. 解释面板默认展开

### Review Mode → Next Question

**流程**:
1. 用户点击 "Next Question"
2. 从队列中获取下一个问题
3. 导航到 `/review/[nextQuestionId]`
4. 保持队列状态（前端状态，不持久化）

---

## ✅ 成功标准验证

### 1. 复习流程不影响任何学习状态

**验证**:
- ✅ 不修改 UserProgress
- ✅ 不修改 WrongBook
- ✅ 不修改 User
- ✅ 只允许 QuestionChat append-only（与 Phase 3C 一致）

### 2. 刷新不丢失正确性

**验证**:
- ✅ 所有数据从数据库读取
- ✅ 不依赖前端状态
- ✅ 刷新后重新加载数据

### 3. 复习模式感觉与正常学习模式不同

**验证**:
- ✅ 解释面板默认展开
- ✅ 显示错误次数和风险评分
- ✅ 只读模式（不能提交答案）
- ✅ 不同的 UI 样式

---

**End of Design Document**

