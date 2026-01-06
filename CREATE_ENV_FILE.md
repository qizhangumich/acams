# 📝 创建 .env.local 文件

## 🎯 问题

`.env.local` 文件不存在或没有 `DATABASE_URL`。

## ✅ 解决方案

### 方法 1: 使用交互式脚本（推荐）

```bash
npx tsx scripts/fix-database-url.ts --interactive
```

会提示你输入 DATABASE_URL，然后输出完整的 `.env.local` 内容。

### 方法 2: 手动创建文件

在项目根目录创建 `.env.local` 文件，添加以下内容：

```env
# Database (从 Neon 获取)
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# JWT Secret (生成一个)
JWT_SECRET="N3fB1VL9ysUFnFCiAjz23t2BX8At3XgTDMcaTC7lOfg="

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxx"
RESEND_FROM_EMAIL="onboarding@resend.dev"

# OpenAI
OPENAI_API_KEY="sk-xxxxxxxxxxxxx"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

**重要提示**:
- 如果密码包含特殊字符（`@`, `#`, `$` 等），必须进行 URL 编码
- 例如：`abc@123` → `abc%40123`

---

## 🔧 从 Neon 获取 DATABASE_URL

1. **登录 Neon Dashboard**
   - 访问: https://console.neon.tech
   - 登录你的账号

2. **选择项目**
   - 在 Dashboard 中选择你的数据库项目

3. **获取连接字符串**
   - 点击 "Connection Details"
   - 选择 "Connection String" 标签（不是 "Pooled connection"）
   - 复制完整的连接字符串

4. **格式应该是**:
   ```
   postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech:5432/neondb?sslmode=require
   ```

---

## ⚠️ 密码特殊字符处理

如果密码包含特殊字符，必须 URL 编码：

**示例**:
- 原始密码: `p@ss#word`
- 编码后: `p%40ss%23word`
- 完整 URL: `postgresql://user:p%40ss%23word@host:5432/db?sslmode=require`

**特殊字符编码表**:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `/` → `%2F`
- `:` → `%3A`
- `;` → `%3B`
- `=` → `%3D`
- `?` → `%3F`

---

## ✅ 创建后验证

1. **检查文件是否存在**:
   ```bash
   npx tsx scripts/check-env.ts
   ```

2. **测试数据库连接**:
   ```bash
   npx tsx scripts/test-db-connection.ts
   ```

3. **重启 dev server**:
   ```bash
   npm run dev
   ```

---

## 📋 完整示例

**`.env.local` 文件内容**:

```env
# Database (Neon PostgreSQL)
# ⚠️ 如果密码包含特殊字符，必须 URL 编码
DATABASE_URL="postgresql://neondb_owner:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech:5432/neondb?sslmode=require"

# JWT Secret (至少 32 个字符)
JWT_SECRET="N3fB1VL9ysUFnFCiAjz23t2BX8At3XgTDMcaTC7lOfg="

# Email (Resend)
RESEND_API_KEY="re_1234567890abcdefghijklmnopqrstuvwxyz"
RESEND_FROM_EMAIL="onboarding@resend.dev"

# OpenAI
OPENAI_API_KEY="sk-xxxxxxxxxxxxx"

# App URL (注意端口是 3001，因为 3000 被占用)
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

---

**下一步**: 创建 `.env.local` 文件，添加 `DATABASE_URL`，然后运行 `npx tsx scripts/check-env.ts` 验证。

