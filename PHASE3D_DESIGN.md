# Phase 3D: Dashboard + Wrong Book Design

## 📊 数据读取分析

### Dashboard 页面数据

#### 1. 总体统计（Overall Stats）

**数据源**: `UserProgress` 表

**读取操作**:
```typescript
// 1. 获取总问题数
const totalQuestions = await prisma.question.count()

// 2. 获取用户进度统计（按状态分组）
const progressCounts = await prisma.userProgress.groupBy({
  by: ['status'],
  where: { user_id: user.id },
  _count: true,
})

// 结果示例:
// [
//   { status: 'correct', _count: 50 },
//   { status: 'wrong', _count: 20 },
//   { status: 'not_started', _count: 0 } // 不会出现，因为 not_started 不保存
// ]

// 3. 计算统计
const completed = counts.correct + counts.wrong
const not_started = totalQuestions - completed
```

**数据字段**:
- `total_questions`: 总问题数
- `completed`: 已完成（correct + wrong）
- `correct`: 正确答案数
- `wrong`: 错误答案数
- `not_started`: 未开始数

#### 2. 领域级别聚合（Domain-level Aggregation）

**数据源**: `UserProgress` + `Question` 表（JOIN）

**读取操作**:
```typescript
// 获取用户进度，包含问题领域信息
const progressWithDomain = await prisma.userProgress.findMany({
  where: { user_id: user.id },
  include: {
    question: {
      select: {
        domain: true,
      },
    },
  },
})

// 按领域聚合
const domainStats = progressWithDomain.reduce((acc, progress) => {
  const domain = progress.question.domain
  if (!acc[domain]) {
    acc[domain] = { correct: 0, wrong: 0, total: 0 }
  }
  if (progress.status === 'correct') acc[domain].correct++
  if (progress.status === 'wrong') acc[domain].wrong++
  acc[domain].total++
  return acc
}, {})
```

**数据字段**:
- `domain`: 领域名称
- `correct`: 该领域正确答案数
- `wrong`: 该领域错误答案数
- `total`: 该领域总完成数

#### 3. 最后问题 ID

**数据源**: `User` 表

**读取操作**:
```typescript
const user = await prisma.user.findUnique({
  where: { id: user.id },
  select: {
    last_question_id: true,
  },
})
```

**数据字段**:
- `last_question_id`: 最后答题的问题 ID（用于 Resume 按钮）

---

### Wrong Book 页面数据

#### 1. 错题列表

**数据源**: `WrongBook` + `Question` 表（JOIN）

**读取操作**:
```typescript
const wrongQuestions = await prisma.wrongBook.findMany({
  where: { user_id: user.id },
  include: {
    question: {
      select: {
        id: true,
        domain: true,
        question_text: true,
      },
    },
  },
  orderBy: [
    { wrong_count: 'desc' }, // 按错误次数降序
    { last_wrong_at: 'desc' }, // 再按最后错误时间降序
  ],
})
```

**数据字段**:
- `question_id`: 问题 ID
- `wrong_count`: 错误次数
- `last_wrong_at`: 最后错误时间
- `question.domain`: 问题领域
- `question.question_text`: 问题文本（用于显示）

---

## 🔄 聚合方式

### Dashboard 聚合

#### 总体统计聚合

**方法**: 使用 Prisma `groupBy`

```typescript
const progressCounts = await prisma.userProgress.groupBy({
  by: ['status'],
  where: { user_id: user.id },
  _count: true,
})

// 转换为对象
const counts = {
  not_started: 0,
  correct: 0,
  wrong: 0,
}

progressCounts.forEach((item) => {
  counts[item.status as keyof typeof counts] = item._count
})

// 计算衍生值
const completed = counts.correct + counts.wrong
const not_started = totalQuestions - completed
```

#### 领域级别聚合

**方法**: 使用 Prisma `include` + JavaScript `reduce`

```typescript
// 1. 获取所有进度记录（包含问题领域）
const progressWithDomain = await prisma.userProgress.findMany({
  where: { user_id: user.id },
  include: { question: { select: { domain: true } } },
})

// 2. 在内存中聚合
const domainStats = progressWithDomain.reduce((acc, progress) => {
  const domain = progress.question.domain
  if (!acc[domain]) {
    acc[domain] = { correct: 0, wrong: 0, total: 0 }
  }
  if (progress.status === 'correct') acc[domain].correct++
  if (progress.status === 'wrong') acc[domain].wrong++
  acc[domain].total++
  return acc
}, {})

// 3. 转换为数组格式
const domainStatsArray = Object.entries(domainStats).map(([domain, stats]) => ({
  domain,
  ...stats,
}))
```

---

### Wrong Book 聚合

**方法**: 使用 Prisma `orderBy`（数据库排序）

```typescript
const wrongQuestions = await prisma.wrongBook.findMany({
  where: { user_id: user.id },
  include: { question: { select: { id: true, domain: true, question_text: true } } },
  orderBy: [
    { wrong_count: 'desc' }, // 错误次数最多的在前
    { last_wrong_at: 'desc' }, // 最近错误的在前
  ],
})
```

**排序逻辑**:
1. 首先按 `wrong_count` 降序（错误次数多的优先）
2. 然后按 `last_wrong_at` 降序（最近错误的优先）

---

## ❌ 禁止的副作用

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
- ❌ 不修改 `explanation`
- ❌ 不修改 `explanation_ai_en`
- ❌ 不修改 `explanation_ai_ch`

#### 6. 修改 QuestionChat

- ❌ 不创建新的聊天消息
- ❌ 不修改现有聊天消息

---

## 🎯 导航流程

### Dashboard → Question Page

**流程**:
1. 用户点击 "Resume" 按钮
2. 导航到 `/questions`（使用现有逻辑）
3. `GET /api/progress/resume` 自动返回下一个问题

**实现**:
```typescript
<Link href="/questions">
  <button>Resume</button>
</Link>
```

### Dashboard → Wrong Book

**流程**:
1. 用户点击 "Wrong Book" 按钮
2. 导航到 `/wrong-book`

**实现**:
```typescript
<Link href="/wrong-book">
  <button>Wrong Book</button>
</Link>
```

### Wrong Book → Question Page

**流程**:
1. 用户点击错题
2. 导航到 `/questions?questionId=123`
3. Question Page 读取 `questionId` 参数
4. 直接加载指定问题（而不是 resume）

**实现**:
```typescript
// Wrong Book 页面
<Link href={`/questions?questionId=${wrongQuestion.question_id}`}>
  <div>{wrongQuestion.question.question_text}</div>
</Link>

// Question Page
const searchParams = useSearchParams()
const questionIdParam = searchParams.get('questionId')
if (questionIdParam) {
  // 加载指定问题
  loadSpecificQuestion(parseInt(questionIdParam))
} else {
  // 使用 resume 逻辑
  loadQuestion()
}
```

---

## 📋 实现检查清单

### Dashboard 页面

- [ ] 显示总体统计（total / completed / correct / wrong / not_started）
- [ ] 显示领域级别聚合
- [ ] "Resume" 按钮（导航到 `/questions`）
- [ ] "Wrong Book" 按钮（导航到 `/wrong-book`）
- [ ] 所有数据从数据库读取（只读）

### Wrong Book 页面

- [ ] 列出所有错题
- [ ] 显示 `wrong_count` 和 `domain`
- [ ] 按错误次数和最后错误时间排序
- [ ] 点击错题导航到 Question Page（带 questionId 参数）
- [ ] 所有数据从数据库读取（只读）

### API 端点

- [ ] `GET /api/dashboard` - 获取 Dashboard 数据
- [ ] `GET /api/wrong-book` - 获取 Wrong Book 数据
- [ ] 所有 API 只读，不写入数据库

---

**End of Design Document**

