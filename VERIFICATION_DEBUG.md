# 🔍 Magic Link Verification Debugging Guide

## 问题诊断

当访问 `https://acams.vercel.app/auth/verify?token=xxx&email=xxx` 时，如果被重定向到 `/login?error=verification_failed`，可能的原因有：

### 常见原因

1. **Token 不存在**
   - Token 未在数据库中创建
   - Token 已被删除

2. **Token 已过期**
   - Magic link 有效期：15 分钟
   - 如果超过 15 分钟未使用，token 会过期

3. **Token 已被使用**
   - Magic link 只能使用一次
   - 如果已经验证过，再次使用会失败

4. **Email 不匹配**
   - URL 中的 email 与数据库中存储的 email 不一致
   - Email 大小写或空格问题

5. **数据库连接问题**
   - Vercel 环境变量 `DATABASE_URL` 未设置或错误
   - Neon 数据库连接失败

---

## 🔧 调试步骤

### Step 1: 检查 Vercel 日志

1. 访问 Vercel Dashboard
2. 进入项目 → Functions → Logs
3. 查找包含 "Magic link verification failed" 或 "Error verifying magic link" 的日志
4. 查看具体错误信息

### Step 2: 检查数据库中的 Token

使用 Prisma Studio 或直接查询数据库：

```sql
SELECT * FROM "MagicLinkToken" 
WHERE token = '17759346eafdc6cf8f4da9cdbfffd1dfe9da29a6c78f8ba10cf5e469940b7682';
```

检查：
- Token 是否存在
- `email` 是否匹配（应该是 `zhangqi362@gmail.com`）
- `expires_at` 是否已过期
- `used` 是否为 `true`（已使用）

### Step 3: 验证 Email 格式

URL 中的 email: `zhangqi362%40gmail.com`
解码后: `zhangqi362@gmail.com`

数据库中存储的 email 应该是小写：`zhangqi362@gmail.com`

### Step 4: 检查环境变量

确保 Vercel 中设置了：
- `DATABASE_URL` - Neon PostgreSQL 连接字符串
- `JWT_SECRET` - JWT 密钥
- `RESEND_API_KEY` - Resend API 密钥
- `NEXT_PUBLIC_APP_URL` - 应用 URL（应该是 `https://acams.vercel.app`）

---

## 🛠️ 临时调试方案

### 方案 1: 在验证页面显示错误信息

修改 `app/auth/verify/page.tsx`，在重定向前显示错误信息（仅用于调试）：

```typescript
// 临时调试：显示错误而不是重定向
if (!result.success || !result.userId) {
  return (
    <div>
      <h1>Verification Failed</h1>
      <p>Error: {result.error}</p>
      <p>Token: {token.substring(0, 20)}...</p>
      <p>Email: {email}</p>
    </div>
  )
}
```

### 方案 2: 检查数据库连接

创建一个测试 API 端点 `/api/debug/token`：

```typescript
// app/api/debug/token/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  
  if (!token) {
    return Response.json({ error: 'Token required' })
  }
  
  const magicLinkToken = await prisma.magicLinkToken.findUnique({
    where: { token },
  })
  
  return Response.json({
    exists: !!magicLinkToken,
    token: magicLinkToken,
  })
}
```

---

## ✅ 预期行为

### 成功流程

1. 用户点击 magic link: `https://acams.vercel.app/auth/verify?token=xxx&email=xxx`
2. 验证页面加载
3. 验证 token 和 email
4. 创建或更新用户
5. 设置 session cookie
6. 重定向到 `/questions`

### 失败流程

1. 用户点击 magic link
2. 验证页面加载
3. 验证失败（token 无效/过期/已使用）
4. 重定向到 `/login?error=具体错误信息`

---

## 📋 检查清单

- [ ] Vercel 日志中是否有错误信息？
- [ ] `DATABASE_URL` 环境变量是否正确？
- [ ] Token 是否存在于数据库中？
- [ ] Token 是否已过期（超过 15 分钟）？
- [ ] Token 是否已被使用？
- [ ] Email 是否匹配（大小写、空格）？
- [ ] 数据库连接是否正常？

---

## 🚀 下一步

1. **检查 Vercel 日志** - 查看实际错误信息
2. **验证数据库连接** - 确保 `DATABASE_URL` 正确
3. **检查 Token 状态** - 确认 token 存在且未过期
4. **重新发送 Magic Link** - 如果 token 过期，请求新的 magic link

---

## 📝 注意事项

- Magic link 有效期：**15 分钟**
- Magic link 只能使用：**1 次**
- Email 匹配：**大小写不敏感**（会自动转换为小写）
- 错误日志：已添加到代码中，可在 Vercel 日志中查看

