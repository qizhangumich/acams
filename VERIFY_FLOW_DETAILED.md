# 🔍 Magic Link 验证流程详细说明

## 📧 用户点击邮件中的链接

```
https://acams.vercel.app/auth/verify?token=8f19a7d9682e8475faeea411bb882b4fe4f853d411604399d5e9f629a7cc5c90&email=zhangqi362%40gmail.com
```

---

## 🔄 完整调用链（按执行顺序）

### Step 1: Next.js 路由匹配

**文件**: Next.js 内部路由系统

**作用**: 
- 解析 URL: `/auth/verify`
- 查找对应的页面文件: `app/auth/verify/page.tsx`

**检查点**:
- ✅ 文件是否存在: `app/auth/verify/page.tsx`
- ✅ 文件是否正确导出 `default` 函数

---

### Step 2: Middleware 检查

**文件**: `middleware.ts` (项目根目录)

**代码位置**: 第 14-68 行

**执行逻辑**:
```typescript
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl  // pathname = "/auth/verify"
  
  // 检查是否是保护路由
  const isProtectedRoute = protectedRoutes.some((route) => 
    pathname.startsWith(route)
  )
  // protectedRoutes = ['/questions', '/dashboard', '/wrong-book', '/api/progress', '/api/chat']
  // "/auth/verify" 不在列表中 → isProtectedRoute = false
  
  if (!isProtectedRoute) {
    return NextResponse.next()  // ✅ 允许通过，不检查认证
  }
  // ...
}
```

**结果**: 
- ✅ `/auth/verify` 不在保护路由列表中
- ✅ 直接通过，不检查 session cookie
- ✅ 继续执行到页面组件

**检查点**:
- ✅ `middleware.ts` 文件存在
- ✅ `/auth/verify` 不在 `protectedRoutes` 数组中

---

### Step 3: 页面组件执行

**文件**: `app/auth/verify/page.tsx`

**代码位置**: 第 16-77 行

**执行流程**:

#### 3.1 接收 URL 参数

```typescript
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: { token?: string; email?: string }
}) {
  const token = searchParams.token
  // token = "8f19a7d9682e8475faeea411bb882b4fe4f853d411604399d5e9f629a7cc5c90"
  
  const email = searchParams.email ? decodeURIComponent(searchParams.email) : undefined
  // email = "zhangqi362@gmail.com" (从 "zhangqi362%40gmail.com" 解码)
}
```

**检查点**:
- ✅ `searchParams` 是否正确接收参数
- ✅ Email 是否正确解码（`%40` → `@`）

#### 3.2 参数验证

```typescript
if (!token || !email) {
  redirect('/login?error=missing_parameters')
}
```

**检查点**:
- ✅ Token 和 email 都存在
- ✅ 如果缺失，会重定向到登录页

#### 3.3 调用验证函数

```typescript
const result = await verifyMagicLinkToken(token, email)
```

**调用**: `lib/auth/magic-link.ts` → `verifyMagicLinkToken()` 函数

---

### Step 4: Token 验证

**文件**: `lib/auth/magic-link.ts`

**代码位置**: 第 87-151 行

**执行流程**:

#### 4.1 规范化 Email

```typescript
const normalizedEmail = email.trim().toLowerCase()
// "zhangqi362@gmail.com" → "zhangqi362@gmail.com"
```

#### 4.2 查询 Token

```typescript
const magicLinkToken = await prisma.magicLinkToken.findUnique({
  where: { token },
})
```

**调用**: `lib/prisma.ts` → Prisma Client → 数据库查询

**数据库操作**:
- 表: `MagicLinkToken`
- 查询: `SELECT * FROM MagicLinkToken WHERE token = '...'`

**检查点**:
- ✅ Token 在数据库中是否存在
- ✅ 数据库连接是否正常

#### 4.3 验证 Token 存在

```typescript
if (!magicLinkToken) {
  return { success: false, error: 'Invalid magic link' }
}
```

**检查点**:
- ✅ Token 是否在数据库中
- ✅ 如果不存在，返回错误

#### 4.4 验证 Email 匹配

```typescript
if (magicLinkToken.email !== normalizedEmail) {
  return { success: false, error: 'Invalid magic link' }
}
```

**检查点**:
- ✅ Token 关联的 email 是否匹配
- ✅ Email 是否已规范化（小写、去空格）

#### 4.5 检查 Token 是否过期

```typescript
if (magicLinkToken.expires_at < new Date()) {
  await prisma.magicLinkToken.update({
    where: { id: magicLinkToken.id },
    data: { used: true },
  })
  return { success: false, error: 'Magic link expired' }
}
```

**检查点**:
- ✅ `expires_at` 是否大于当前时间
- ✅ 如果过期，标记为已使用

#### 4.6 检查 Token 是否已使用

```typescript
if (magicLinkToken.used) {
  return { success: false, error: 'Magic link already used' }
}
```

**检查点**:
- ✅ `used` 字段是否为 `false`
- ✅ 如果已使用，返回错误

#### 4.7 标记 Token 为已使用

```typescript
await prisma.magicLinkToken.update({
  where: { id: magicLinkToken.id },
  data: { used: true },
})
```

**数据库操作**:
- 更新: `UPDATE MagicLinkToken SET used = true WHERE id = '...'`

#### 4.8 查找或创建用户

```typescript
let user = await prisma.user.findUnique({
  where: { email: normalizedEmail },
})

if (!user) {
  // 创建新用户
  user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      last_active_at: new Date(),
    },
  })
} else {
  // 更新最后活跃时间
  await prisma.user.update({
    where: { id: user.id },
    data: { last_active_at: new Date() },
  })
}
```

**数据库操作**:
- 查询: `SELECT * FROM User WHERE email = '...'`
- 如果不存在: `INSERT INTO User (email, last_active_at) VALUES (...)`
- 如果存在: `UPDATE User SET last_active_at = ... WHERE id = ...`

**检查点**:
- ✅ 用户是否已存在
- ✅ 用户创建/更新是否成功

#### 4.9 返回验证结果

```typescript
return { success: true, userId: user.id }
```

**返回**: 回到 `app/auth/verify/page.tsx` 第 32 行

---

### Step 5: 获取用户数据

**文件**: `app/auth/verify/page.tsx`

**代码位置**: 第 40-49 行

```typescript
const user = await prisma.user.findUnique({
  where: { id: result.userId },
  select: {
    id: true,
    email: true,
    last_active_at: true,
    last_question_id: true,
    created_at: true,
  },
})
```

**数据库操作**:
- 查询: `SELECT id, email, last_active_at, last_question_id, created_at FROM User WHERE id = '...'`

**检查点**:
- ✅ 用户数据是否正确获取
- ✅ 如果用户不存在，重定向到登录页

---

### Step 6: 生成 Session Token

**文件**: `lib/auth/session.ts`

**代码位置**: 第 21-25 行

```typescript
const sessionToken = generateSessionToken({
  userId: user.id,
  email: user.email,
})
```

**执行逻辑**:
```typescript
export function generateSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '30d',  // 30 天过期
  })
}
```

**检查点**:
- ✅ `JWT_SECRET` 环境变量是否设置
- ✅ JWT token 是否成功生成

---

### Step 7: 设置 Cookie

**文件**: `app/auth/verify/page.tsx`

**代码位置**: 第 60-69 行

```typescript
const cookieStore = await cookies()
cookieStore.set('session_token', sessionToken, {
  httpOnly: true,  // 防止 JavaScript 访问
  secure: process.env.NODE_ENV === 'production',  // 生产环境使用 HTTPS
  sameSite: 'lax',  // CSRF 保护
  maxAge: 30 * 24 * 60 * 60,  // 30 天
  path: '/',  // 全站可用
})
```

**检查点**:
- ✅ Cookie 是否正确设置
- ✅ Cookie 属性是否正确（httpOnly, secure, sameSite）

---

### Step 8: 重定向到问题页面

**文件**: `app/auth/verify/page.tsx`

**代码位置**: 第 72 行

```typescript
redirect('/questions')
```

**执行**: Next.js 服务器端重定向

**结果**: 
- 浏览器收到 307/308 重定向响应
- 自动跳转到 `/questions` 页面

---

## 🗂️ 涉及的所有文件清单

### 核心文件（必须存在）

1. **`app/auth/verify/page.tsx`** ⭐ 主要入口
   - 接收 URL 参数
   - 调用验证函数
   - 设置 cookie
   - 重定向

2. **`lib/auth/magic-link.ts`** ⭐ Token 验证逻辑
   - `verifyMagicLinkToken()` 函数
   - 数据库查询和验证

3. **`lib/prisma.ts`** ⭐ 数据库连接
   - Prisma Client 单例
   - 数据库查询执行

4. **`lib/auth/session.ts`** ⭐ Session 管理
   - `generateSessionToken()` 函数
   - JWT token 生成

5. **`middleware.ts`** ⚠️ 路由保护
   - 检查路由是否需要认证
   - `/auth/verify` 应该不在保护列表中

### 数据库表（必须存在）

1. **`MagicLinkToken`** 表
   - 字段: `id`, `email`, `token`, `expires_at`, `used`, `created_at`
   - 索引: `token` (unique)

2. **`User`** 表
   - 字段: `id`, `email`, `last_active_at`, `last_question_id`, `created_at`
   - 索引: `email` (unique)

### 环境变量（必须设置）

1. **`DATABASE_URL`** - 数据库连接字符串
2. **`JWT_SECRET`** - JWT 签名密钥

---

## 🔍 调试检查清单

### 如果返回 404

1. **检查文件是否存在**
   ```bash
   ls app/auth/verify/page.tsx
   ```

2. **检查文件是否已提交到 Git**
   ```bash
   git ls-files app/auth/verify/page.tsx
   ```

3. **检查 Vercel 部署日志**
   - Vercel Dashboard → Deployments → 最新部署 → Build Logs
   - 查找错误信息

4. **检查文件路径**
   - 应该是: `app/auth/verify/page.tsx`
   - 不是: `app/api/auth/verify/route.ts` (这是 API 路由)

### 如果验证失败

1. **检查数据库连接**
   ```bash
   npx tsx scripts/test-db-connection.ts
   ```

2. **检查 Token 是否存在**
   - 在数据库中查询: `SELECT * FROM MagicLinkToken WHERE token = '...'`

3. **检查 Email 匹配**
   - 确认数据库中的 email 和 URL 中的 email 一致（都小写）

4. **检查 Token 是否过期**
   - 确认 `expires_at` 大于当前时间

5. **检查 Token 是否已使用**
   - 确认 `used` 字段为 `false`

### 如果重定向失败

1. **检查 Cookie 设置**
   - 浏览器 DevTools → Application → Cookies
   - 确认 `session_token` 存在

2. **检查重定向目标**
   - 确认 `/questions` 页面存在
   - 确认 middleware 允许访问

---

## 📊 执行流程图

```
用户点击链接
    ↓
Next.js 路由匹配
    ↓
middleware.ts (检查路由)
    ↓ (通过，不在保护列表中)
app/auth/verify/page.tsx
    ↓
接收参数 (token, email)
    ↓
lib/auth/magic-link.ts → verifyMagicLinkToken()
    ↓
lib/prisma.ts → 数据库查询
    ↓
验证 Token (存在、匹配、未过期、未使用)
    ↓
查找/创建用户
    ↓
lib/auth/session.ts → generateSessionToken()
    ↓
设置 Cookie
    ↓
重定向到 /questions
```

---

## 🎯 关键检查点总结

1. ✅ `app/auth/verify/page.tsx` 文件存在
2. ✅ 文件已提交到 Git 并推送到 GitHub
3. ✅ Vercel 已部署最新代码
4. ✅ 数据库连接正常
5. ✅ Token 在数据库中存在
6. ✅ Email 匹配（已规范化）
7. ✅ Token 未过期
8. ✅ Token 未使用
9. ✅ JWT_SECRET 环境变量已设置
10. ✅ Cookie 正确设置
11. ✅ 重定向目标页面存在

---

## 🚨 常见问题

### Q: 为什么返回 404？

**A**: 最可能的原因：
1. 文件未部署到 Vercel
2. 文件路径错误
3. 构建失败

**检查**: Vercel Dashboard → Deployments → Build Logs

### Q: 为什么验证失败？

**A**: 可能的原因：
1. Token 不存在（数据库中没有）
2. Email 不匹配（大小写、空格）
3. Token 已过期
4. Token 已使用

**检查**: 数据库中的 `MagicLinkToken` 表

### Q: 为什么重定向后没有 session？

**A**: 可能的原因：
1. Cookie 未正确设置
2. Cookie 被浏览器阻止
3. `secure` 标志在非 HTTPS 环境下阻止

**检查**: 浏览器 DevTools → Application → Cookies

