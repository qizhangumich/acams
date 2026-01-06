# 🚀 快速修复 DATABASE_URL（5 步检查）

## ✅ Step 1: 打印 DATABASE_URL（已添加）

已在 `lib/prisma.ts` 中添加临时调试代码。重启 dev server 后，会在控制台看到：

```
🔍 DATABASE_URL = SET
🔍 DATABASE_URL (masked) = postgresql://user:****@host:PORT/db
✅ Port found: 5432
```

或

```
🔍 DATABASE_URL = UNDEFINED
```

**如果看到 UNDEFINED**:
- 检查 `.env.local` 文件是否存在
- 确认 `DATABASE_URL` 已设置
- 重启 dev server

---

## ✅ Step 2: 检查是否是 undefined

**如果看到 `DATABASE_URL = undefined`**:

1. 检查 `.env.local` 文件（项目根目录）
2. 确认文件中有：
   ```env
   DATABASE_URL="postgresql://..."
   ```
3. **重要**: 重启 dev server（`.env` 更改后必须重启）

---

## ✅ Step 3: 确认端口是数字

**合法端口**:
- ✅ `:5432` (PostgreSQL 默认)
- ✅ `:6543` (备用端口)

**不合法端口**:
- ❌ `:postgres`
- ❌ `:abc`
- ❌ `:5432?` (端口后不能直接跟 `?`)

**检查方法**:
运行：
```bash
npx tsx scripts/check-env.ts
```

会显示端口是否正确。

---

## ✅ Step 4: 使用正确的 Prisma URL（Neon/Supabase）

### Neon

1. 登录: https://console.neon.tech
2. 选择项目 → "Connection Details"
3. **选择 "Connection String"**（不是 "Pooled connection"）
4. 复制完整字符串

**Neon 格式**:
```
postgresql://[user]:[password]@[hostname]/[dbname]?sslmode=require
```

### Supabase

1. 登录: https://supabase.com/dashboard
2. 选择项目 → Settings → Database
3. **选择 "Connection string" → "URI"**
4. 确保使用 **Prisma 格式**（不是 Pooler）

---

## ✅ Step 5: 重启 Dev Server（关键！）

**必须重启**:

```bash
# 1. 停止当前服务器
Ctrl + C

# 2. 重新启动
npm run dev
```

**为什么必须重启？**
- Next.js 只在启动时读取 `.env` 文件
- 修改 `.env` 后不重启，新值不会生效

---

## 🔧 标准模板（可直接使用）

### `.env.local` 模板

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech:5432/neondb?sslmode=require"

# JWT Secret
JWT_SECRET="your-secret-here"

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxx"
RESEND_FROM_EMAIL="onboarding@resend.dev"

# OpenAI
OPENAI_API_KEY="sk-xxxxxxxxxxxxx"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### `prisma/schema.prisma` 检查

确保 `datasource` 配置正确：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## 🧠 为什么在 `prisma.magicLinkToken.count()` 才报错？

**原因**:
1. Prisma Client 初始化时**不会立刻连接数据库**
2. 第一次真正发请求（如 `.count()`）才解析 URL
3. 如果 URL 格式错误，此时才会报错

**所以**:
- ❌ 不是 Auth 逻辑问题
- ❌ 不是 Prisma Bug
- ✅ 是 `DATABASE_URL` 的端口或格式错误

---

## 🎯 快速诊断

运行检查脚本：

```bash
npx tsx scripts/check-env.ts
```

会显示：
- ✅ DATABASE_URL 是否设置
- ✅ 协议是否正确
- ✅ 端口是否正确
- ✅ sslmode 是否存在
- ✅ URL 格式是否正确

---

## 📋 修复后验证

1. **修复 `.env.local`**
2. **重启 dev server** (`Ctrl+C` → `npm run dev`)
3. **查看控制台输出**（应该看到调试信息）
4. **运行检查脚本** (`npx tsx scripts/check-env.ts`)
5. **测试 API** (`POST /api/auth/send-magic-link`)

---

## ⚠️ 重要提示

**调试代码是临时的**，修复后记得删除 `lib/prisma.ts` 中的 `console.log` 语句！

---

**下一步**: 重启 dev server，查看控制台输出，然后告诉我看到了什么！

