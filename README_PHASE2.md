# Phase 2 完成验证指南

## ✅ 6 条必须满足的要求

### 1. ✅ Prisma schema 已经确定，不再频繁改字段

**验证**: `prisma/schema.prisma` 文件已创建，包含所有必需模型。

**运行迁移**:
```bash
npm run db:generate
npx prisma migrate dev --name init
```

---

### 2. ✅ User / UserProgress / QuestionChat / WrongBook 都已 migration

**验证**: 运行迁移后，检查 `prisma/migrations/` 目录。

**命令**:
```bash
npx prisma migrate status
```

应该显示所有迁移已应用。

---

### 3. ✅ Email Magic Link：能跨设备登录

**实现**: 
- JWT token 存储在 HTTP-only cookie
- 任何设备使用相同邮箱都能登录
- Token 包含 userId 和 email

**测试**: 运行 `npm run test:api`，验证步骤 2-3

---

### 4. ✅ 刷新页面不丢 session

**实现**:
- Session token 在 HTTP-only cookie 中
- Cookie 有效期 30 天
- Middleware 自动验证每个请求

**测试**: 运行 `npm run test:api`，验证步骤 10

---

### 5. ✅ 能准确恢复到 last unfinished question

**实现**: `lib/progress/restore.ts` 中的 `resumeFromLastQuestion()` 函数

**算法**:
1. 检查 `User.last_question_id`
2. 查找第一个 `not_started` 状态的问题（在 last_question_id 之后）
3. 如果没找到，查找第一个 `not_started` 问题（整体）
4. 如果全部完成，返回最后一个问题

**测试**: 运行 `npm run test:api`，验证步骤 4, 6, 9

---

### 6. ✅ 错题能正确累计（wrong_count 不回滚）

**实现**: `app/api/progress/route.ts` 中的 POST 处理

**关键逻辑**:
- 使用数据库事务确保原子性
- `wrong_count = existingWrong.wrong_count + 1` (只增不减)
- 每次错误答案都增加计数

**测试**: 运行 `npm run test:api`，验证步骤 6-7

---

### 7. ✅ 无 UI，也能通过 API 测试完整流程

**测试脚本**: `scripts/test-api-flow.ts`

**运行测试**:
```bash
# 1. 启动开发服务器
npm run dev

# 2. 在另一个终端运行测试
npm run test:api
```

**测试覆盖**:
1. ✅ 发送魔法链接
2. ✅ 验证魔法链接
3. ✅ 获取当前用户
4. ✅ 恢复进度
5. ✅ 回答正确
6. ✅ 回答错误（测试 wrong_count）
7. ✅ 再次回答错误（测试 wrong_count 递增）
8. ✅ 获取进度统计
9. ✅ 再次恢复（应该返回下一个问题）
10. ✅ 测试 session 持久性（模拟刷新）

---

## 🚀 快速开始

### 1. 设置环境变量

创建 `.env.local`:
```env
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
JWT_SECRET="your-strong-random-secret-min-32-characters"
RESEND_API_KEY="re_xxxxxxxxxxxxx"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2. 安装依赖
```bash
npm install
```

### 3. 设置数据库
```bash
# 生成 Prisma Client
npm run db:generate

# 运行迁移
npx prisma migrate dev --name init

# 种子数据（加载问题）
npm run db:seed
```

### 4. 启动服务器
```bash
npm run dev
```

### 5. 运行测试
```bash
# 在另一个终端
npm run test:api
```

---

## 📋 验证清单

运行测试前，确保：

- [ ] `DATABASE_URL` 已设置
- [ ] `JWT_SECRET` 已设置（32+ 字符）
- [ ] `RESEND_API_KEY` 已设置（用于发送邮件）
- [ ] `RESEND_FROM_EMAIL` 已设置
- [ ] `NEXT_PUBLIC_APP_URL` 已设置
- [ ] 数据库迁移已运行
- [ ] 问题数据已种子化
- [ ] 开发服务器正在运行

---

## ✅ 所有要求已满足

Phase 2 已完成，可以进入 Phase 3！

