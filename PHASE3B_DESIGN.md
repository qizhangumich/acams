# Phase 3B: Explanation Layer Design

## 🎯 为什么这层是只读的（Read-Only）

### 设计原则

1. **数据来源**: 解释数据已经存在于 `Question` 表中
   - `explanation` - 官方解释
   - `explanation_ai_en` - AI 英文解释
   - `explanation_ai_ch` - AI 中文解释

2. **无需后端处理**: 
   - 解释是静态内容，不需要计算或生成
   - 不需要用户特定的数据
   - 不需要实时更新

3. **性能考虑**:
   - 避免不必要的 API 调用
   - 减少服务器负载
   - 提供即时响应

4. **架构清晰**:
   - 解释是问题的属性，不是用户状态
   - 保持前端展示层和后端逻辑层分离

---

## ✅ 允许的状态（UI-Only）

### 允许的 UI 状态

1. **面板展开/折叠状态**
   - `isExplanationOpen: boolean` - 控制面板显示/隐藏
   - 纯前端状态，不持久化

2. **当前激活的标签页**
   - `activeTab: 'official' | 'ai_en' | 'ai_ch'` - 当前显示的标签
   - 纯前端状态，不持久化

3. **加载状态**（如果需要）
   - `loadingExplanation: boolean` - 仅用于 UI 反馈
   - 但 Phase 3B 中不需要，因为数据已存在

### 状态管理

```typescript
// ✅ 允许：纯 UI 状态
const [isExplanationOpen, setIsExplanationOpen] = useState(false)
const [activeTab, setActiveTab] = useState<'official' | 'ai_en' | 'ai_ch'>('official')

// ✅ 允许：从 question 数据读取（已从后端获取）
const officialExplanation = question.explanation
const aiExplanationEN = question.explanation_ai_en
const aiExplanationCH = question.explanation_ai_ch
```

---

## ❌ 禁止的副作用

### 禁止的操作

1. **数据库写入**
   - ❌ 不调用任何 API 写入数据库
   - ❌ 不修改 UserProgress
   - ❌ 不修改 WrongBook
   - ❌ 不修改 User
   - ❌ 不创建任何新记录

2. **API 调用**
   - ❌ 不添加新的 API 路由
   - ❌ 不修改现有 API 路由
   - ❌ 不调用 `/api/chat`（Phase 3B 不实现聊天）
   - ❌ 不调用任何后端服务

3. **状态持久化**
   - ❌ 不使用 localStorage 保存展开状态
   - ❌ 不使用 sessionStorage
   - ❌ 不保存到数据库
   - ❌ 刷新后默认折叠（符合要求）

4. **数据修改**
   - ❌ 不修改 question 数据
   - ❌ 不修改 progress 数据
   - ❌ 不修改任何从后端获取的数据

5. **副作用操作**
   - ❌ 不触发任何副作用
   - ❌ 不发送分析事件
   - ❌ 不记录用户行为（Phase 3B 范围外）

---

## 📊 数据流

### 数据来源

**所有解释数据来自 Question 对象**（已在页面加载时获取）:

```typescript
// 从 GET /api/progress/resume 返回的 question 对象
question: {
  id: number
  explanation: string           // 官方解释
  explanation_ai_en: string?   // AI 英文解释（可选）
  explanation_ai_ch: string?   // AI 中文解释（可选）
  ...
}
```

### 数据使用

```typescript
// ✅ 正确：直接使用 question 数据
const officialExplanation = question.explanation
const aiExplanationEN = question.explanation_ai_en || 'Not available'
const aiExplanationCH = question.explanation_ai_ch || '暂无'

// ❌ 错误：不应该这样做
// fetch('/api/explanation/...') // 不需要 API 调用
// await saveExplanationView(...) // 不需要保存
```

---

## 🎨 UI 设计

### 布局结构

```
Question Page
├── Question Text
├── Options
├── Submit Button / Status
└── Explanation Panel (collapsed by default)
    ├── "Show Explanation" Button
    └── Panel Content (when open)
        ├── Tabs: [Official | AI EN | AI 中文]
        └── Tab Content
            └── Explanation Text
```

### 交互行为

1. **默认状态**: 解释面板折叠
2. **点击 "Show Explanation"**: 展开面板，显示默认标签（Official）
3. **切换标签**: 切换显示不同解释
4. **点击 "Hide Explanation"**: 折叠面板
5. **刷新页面**: 面板恢复折叠状态

---

## ✅ 成功标准验证

### 1. 打开解释不触发任何 API 调用

**验证**:
- ✅ 点击 "Show Explanation" 只更新 UI 状态
- ✅ 不调用 `fetch()` 或任何 API
- ✅ 数据直接从 `question` 对象读取

### 2. 刷新页面折叠解释

**验证**:
- ✅ `isExplanationOpen` 初始化为 `false`
- ✅ 刷新后面板默认折叠
- ✅ 不保存展开状态到任何地方

### 3. 解释对正确和错误答案同样工作

**验证**:
- ✅ 解释显示逻辑不依赖 `progress.status`
- ✅ 无论答案正确或错误，解释内容相同
- ✅ 解释面板功能一致

---

## 🔍 实现检查清单

### 代码检查

- [ ] 无 `fetch()` 调用（除了已有的 loadQuestion）
- [ ] 无数据库写入操作
- [ ] 无 API 路由修改
- [ ] 无 localStorage/sessionStorage
- [ ] 状态仅用于 UI（isExplanationOpen, activeTab）
- [ ] 数据仅从 question 对象读取

### 功能检查

- [ ] "Show Explanation" 按钮存在
- [ ] 面板可以展开/折叠
- [ ] 三个标签页可以切换
- [ ] 解释内容正确显示
- [ ] 刷新后默认折叠
- [ ] 对正确/错误答案同样工作

---

**End of Design Document**

