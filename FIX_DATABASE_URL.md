# 🔧 修复 DATABASE_URL 错误

## ❌ 当前错误

```
Error: invalid port number in database URL
```

## ✅ 解决方案

### Step 1: 检查 `.env.local` 文件

在项目根目录找到 `.env.local` 文件（如果不存在，创建一个）。

### Step 2: 修复 DATABASE_URL 格式

**❌ 错误格式示例**:
```env
DATABASE_URL="postgresql://user:password@host/database"
DATABASE_URL="postgresql://user:password@host:port/database"
DATABASE_URL="postgres://user:password@host:5432/database"
```

**✅ 正确格式**:
```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

### Step 3: 从 Neon 获取正确的连接字符串

1. **登录 Neon Dashboard**
   - 访问: https://console.neon.tech
   - 登录你的账号

2. **选择项目**
   - 在 Dashboard 中选择你的数据库项目

3. **获取连接字符串**
   - 点击 "Connection Details" 或 "Connection String"
   - 选择 "Connection String" 标签（不是 "Pooled connection"）
   - 复制完整的连接字符串

4. **Neon 连接字符串格式**:
   ```
   postgresql://[user]:[password]@[hostname]/[dbname]?sslmode=require
   ```

   **示例**:
   ```
   postgresql://neondb_owner:AbCdEf123456@ep-cool-darkness-123456.us-east-2.aws.neon.tech:5432/neondb?sslmode=require
   ```

### Step 4: 特殊字符处理

如果密码包含特殊字符，需要进行 URL 编码：

| 字符 | 编码 |
|------|------|
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |
| `/` | `%2F` |
| `:` | `%3A` |
| `?` | `%3F` |
| `=` | `%3D` |

**示例**:
- 密码: `p@ss#word`
- 编码后: `p%40ss%23word`
- 完整 URL: `postgresql://user:p%40ss%23word@host:5432/db?sslmode=require`

### Step 5: 验证修复

修复后，运行测试：

```bash
# 1. 测试数据库连接
npx tsx scripts/test-db-connection.ts

# 2. 如果连接成功，运行迁移
npm run db:migrate

# 3. 重启开发服务器
npm run dev
```

## 📋 完整的 `.env.local` 示例

```env
# Database (从 Neon 获取)
DATABASE_URL="postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech:5432/neondb?sslmode=require"

# JWT Secret (自己生成)
JWT_SECRET="N3fB1VL9ysUFnFCiAjz23t2BX8At3XgTDMcaTC7lOfg="

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxx"
RESEND_FROM_EMAIL="onboarding@resend.dev"

# OpenAI
OPENAI_API_KEY="sk-xxxxxxxxxxxxx"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 🔍 常见问题

### Q1: 如何知道端口号？

**A**: Neon PostgreSQL 默认端口是 `5432`。如果连接字符串中没有端口，添加 `:5432`。

### Q2: 为什么需要 `?sslmode=require`？

**A**: Neon 要求使用 SSL 连接。`sslmode=require` 确保连接是加密的。

### Q3: 如何测试连接字符串是否正确？

**A**: 运行测试脚本：
```bash
npx tsx scripts/test-db-connection.ts
```

如果成功，会看到：
```
✅ Database connection successful!
✅ User count: 0
✅ MagicLinkToken table exists!
```

### Q4: 连接字符串中有多个 `?` 怎么办？

**A**: 第一个 `?` 后面的所有内容都是查询参数。格式应该是：
```
postgresql://user:password@host:port/database?sslmode=require&other=param
```

## 🚀 修复后的步骤

1. ✅ 修复 `.env.local` 中的 `DATABASE_URL`
2. ✅ 运行 `npx tsx scripts/test-db-connection.ts` 验证连接
3. ✅ 运行 `npm run db:migrate` 创建数据库表
4. ✅ 重启开发服务器 `npm run dev`
5. ✅ 测试 `/api/auth/send-magic-link` API

---

**关键**: 确保 `DATABASE_URL` 包含：
- ✅ `postgresql://` 协议（不是 `postgres://`）
- ✅ 端口号（`:5432`）
- ✅ `?sslmode=require` 参数

