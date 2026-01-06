# 🔍 验证页面 404 错误排查

## 🚨 当前问题

访问 `https://acams.vercel.app/auth/verify?token=xxx&email=xxx` 返回 404 错误。

---

## 🎯 可能的原因

### 1️⃣ Vercel 还没有部署最新代码（最可能）

**检查方法**:
1. 访问 Vercel Dashboard: https://vercel.com/dashboard
2. 选择项目 `acams`
3. 进入 "Deployments" 页面
4. 检查最新部署的 commit hash

**应该看到**:
- ✅ Commit `b315a68` 或更新 ("Add /auth/verify page route")
- ✅ 部署状态为 "Ready"（绿色）

**如果没有**:
- ❌ 最新部署是旧的 commit
- → 需要等待自动部署或手动触发

### 2️⃣ 文件路径问题

**检查 GitHub**:
- 访问: https://github.com/qizhangumich/acams/tree/main/app/auth/verify
- 应该看到:
  - ✅ `page.tsx`
  - ✅ `page.module.css`

**如果没有**:
- ❌ 文件未正确提交
- → 需要重新提交并推送

### 3️⃣ 构建失败

**检查 Vercel 构建日志**:
1. Vercel Dashboard → Deployments
2. 点击最新部署
3. 查看 "Build Logs"
4. 查找错误信息

**常见错误**:
- TypeScript 编译错误
- 导入路径错误
- 环境变量缺失

### 4️⃣ URL 参数解码问题

**问题**: Email 在 URL 中是编码的 (`zhangqi362%40gmail.com`)

**已修复**: 代码现在会自动解码 email 参数

---

## ✅ 已应用的修复

### 1. Email URL 解码

```typescript
// 修复前
const email = searchParams.email

// 修复后
const email = searchParams.email ? decodeURIComponent(searchParams.email) : undefined
```

### 2. 错误处理

代码已经包含完整的错误处理：
- 缺少参数 → 重定向到 `/login?error=missing_parameters`
- 验证失败 → 重定向到 `/login?error=verification_failed`
- Token 过期 → 重定向到 `/login?error=Magic link expired`
- 数据库错误 → 重定向到 `/login?error=verification_failed`

---

## 🔍 验证步骤

### Step 1: 检查 Vercel 部署

1. **访问 Vercel Dashboard**
2. **查看最新部署的 commit**
3. **确认包含 `b315a68` 或更新**

### Step 2: 检查文件是否存在

在 GitHub 上确认：
```
https://github.com/qizhangumich/acams/tree/main/app/auth/verify
```

应该看到 `page.tsx` 文件。

### Step 3: 测试本地

```bash
npm run dev
```

然后访问：
```
http://localhost:3000/auth/verify?token=test&email=test@example.com
```

**预期**:
- ✅ 如果本地正常 → 问题在 Vercel 部署
- ❌ 如果本地也 404 → 代码有问题

### Step 4: 检查构建日志

在 Vercel Dashboard 中：
1. 进入最新部署
2. 查看 "Build Logs"
3. 查找错误或警告

---

## 🚀 立即解决方案

### 方案 A: 等待自动部署（推荐）

如果代码已推送到 GitHub，Vercel 应该会自动检测并部署。通常需要 1-2 分钟。

### 方案 B: 手动触发部署

1. **在 Vercel Dashboard 中**:
   - 进入项目
   - 点击 "Redeploy" 按钮

2. **或推送空 commit**:
   ```bash
   git commit --allow-empty -m "Trigger Vercel deployment"
   git push origin main
   ```

### 方案 C: 检查 Root Directory

如果所有路由都 404：
1. Vercel Dashboard → Settings → General
2. 检查 "Root Directory"
3. 应该设置为 `.` 或留空

---

## 📋 验证页面工作流程

当用户访问 `/auth/verify?token=xxx&email=xxx` 时：

1. **接收参数**
   - 从 URL 获取 `token` 和 `email`
   - 自动解码 email（`%40` → `@`）

2. **验证 Token**
   - 调用 `verifyMagicLinkToken(token, email)`
   - 检查 token 是否存在
   - 检查 email 是否匹配
   - 检查是否过期
   - 检查是否已使用

3. **创建/查找用户**
   - 如果用户不存在，创建新用户
   - 如果用户存在，更新 `last_active_at`

4. **设置 Session**
   - 生成 JWT session token
   - 设置 HTTP-only cookie

5. **重定向**
   - 成功 → 重定向到 `/questions`
   - 失败 → 重定向到 `/login?error=xxx`

---

## 🐛 调试技巧

### 查看 Vercel 函数日志

1. Vercel Dashboard → 项目 → Functions
2. 查看 `/auth/verify` 的日志
3. 查找错误信息

### 添加临时日志

如果需要调试，可以在代码中添加：

```typescript
console.log('Token:', token)
console.log('Email:', email)
console.log('Verification result:', result)
```

**注意**: 部署后记得移除调试代码。

---

## ✅ 成功标志

修复后，访问验证链接应该：

1. **不再返回 404**
2. **验证成功** → 重定向到 `/questions`
3. **验证失败** → 重定向到 `/login?error=xxx`
4. **Cookie 正确设置** → 可以在浏览器 DevTools 中看到 `session_token`

---

## 📚 相关文件

- `app/auth/verify/page.tsx` - 验证页面路由
- `lib/auth/magic-link.ts` - Token 验证逻辑
- `lib/auth/session.ts` - Session 管理
- `lib/prisma.ts` - 数据库连接

---

## 🎯 下一步

1. **检查 Vercel 部署状态**
2. **确认文件已正确部署**
3. **测试验证链接**
4. **如果仍然 404，检查构建日志**

