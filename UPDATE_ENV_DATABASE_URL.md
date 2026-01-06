# 🔧 更新 .env 文件中的 DATABASE_URL

## 🎯 当前问题

`.env` 文件中的 `DATABASE_URL` 是占位符：
```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

需要替换为真实的 Neon 数据库连接字符串。

---

## ✅ 解决步骤

### Step 1: 从 Neon 获取连接字符串

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

### Step 2: 检查密码特殊字符

如果密码包含特殊字符（`@`, `#`, `$`, `%`, `&`, `+`, `/`, `:`, `;`, `=`, `?`），必须进行 URL 编码。

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

**示例**:
- 密码: `abc@123`
- 编码后: `abc%40123`
- 完整 URL: `postgresql://user:abc%40123@host:5432/db?sslmode=require`

### Step 3: 更新 .env 文件

打开 `.env` 文件，找到这一行：
```env
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

替换为你的真实连接字符串：
```env
DATABASE_URL="postgresql://neondb_owner:password@ep-xxx-xxx.us-east-2.aws.neon.tech:5432/neondb?sslmode=require"
```

**重要**:
- 如果密码包含特殊字符，先进行 URL 编码
- 确保包含端口号（通常是 `:5432`）
- 确保包含 `?sslmode=require`

### Step 4: 使用自动修复脚本（如果密码有特殊字符）

如果密码包含特殊字符，运行：

```bash
npx tsx scripts/fix-database-url.ts
```

脚本会自动检测并编码密码。

### Step 5: 验证修复

运行检查脚本：

```bash
npx tsx scripts/check-env.ts
```

应该看到：
```
✅ DATABASE_URL is SET
✅ Protocol: postgresql://
✅ Port found: 5432
✅ Port is numeric: 5432
✅ sslmode=require found
✅ URL format looks correct
```

### Step 6: 测试数据库连接

```bash
npx tsx scripts/test-db-connection.ts
```

应该看到：
```
✅ Database connection successful!
✅ User count: 0
✅ MagicLinkToken table exists!
```

### Step 7: 运行数据库迁移

```bash
npm run db:migrate
```

### Step 8: 重启 Dev Server

```bash
# 停止当前服务器
Ctrl + C

# 重新启动
npm run dev
```

---

## 📋 完整的 .env 文件示例

```env
# Database (从 Neon 获取，替换占位符)
DATABASE_URL="postgresql://neondb_owner:password@ep-xxx-xxx.us-east-2.aws.neon.tech:5432/neondb?sslmode=require"

# JWT Secret
JWT_SECRET="p+lcafKNwQk6Zan9ZpnVdWda33Ta8KzPwtzQhtCutBM="

# Email (Resend)
RESEND_API_KEY="re_PMMtE5Ma_Hpk8nGCmgHr24kxFgueNA4m6"
RESEND_FROM_EMAIL="onboarding@resend.dev"

# OpenAI
OPENAI_API_KEY="sk-xxxxxxxxxxxxx"

# App URL
NEXT_PUBLIC_APP_URL="https://acams.vercel.app"
```

---

## 🚨 常见错误

### 错误 1: 密码包含 `@` 符号

**❌ 错误**:
```
DATABASE_URL="postgresql://user:abc@123@host:5432/db"
```

**✅ 正确**:
```
DATABASE_URL="postgresql://user:abc%40123@host:5432/db"
```

### 错误 2: 缺少端口号

**❌ 错误**:
```
DATABASE_URL="postgresql://user:password@host/db"
```

**✅ 正确**:
```
DATABASE_URL="postgresql://user:password@host:5432/db"
```

### 错误 3: 缺少 sslmode

**❌ 错误**:
```
DATABASE_URL="postgresql://user:password@host:5432/db"
```

**✅ 正确**:
```
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"
```

---

## ✅ 修复后验证清单

- [ ] `.env` 文件中的 `DATABASE_URL` 已更新为真实连接字符串
- [ ] 密码中的特殊字符已 URL 编码（如果有）
- [ ] 运行 `npx tsx scripts/check-env.ts` 验证格式
- [ ] 运行 `npx tsx scripts/test-db-connection.ts` 测试连接
- [ ] 运行 `npm run db:migrate` 创建数据库表
- [ ] 重启 dev server
- [ ] 测试 `/api/auth/send-magic-link` API

---

**下一步**: 从 Neon 获取真实的连接字符串，更新 `.env` 文件中的 `DATABASE_URL`。

