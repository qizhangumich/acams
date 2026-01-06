# 🚨 立即修复 DATABASE_URL

## ❌ 当前问题

你的 `.env` 文件中的 `DATABASE_URL` 是**占位符模板**，不是真实的连接字符串：

```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

**问题**: `host:port` 是字面量字符串，Prisma 无法解析。

---

## ✅ 立即修复（3 步）

### Step 1: 从你的数据库平台获取真实连接字符串

#### 🅰️ 如果使用 Neon

1. 访问: https://console.neon.tech
2. 选择你的项目
3. 点击 "Connection Details"
4. **选择 "Connection String" 标签**（不是 "Pooled connection"）
5. 复制完整的连接字符串

**Neon 格式**（示例）:
```
postgresql://neondb_owner:password@ep-cool-darkness-123456.us-east-2.aws.neon.tech:5432/neondb?sslmode=require
```

**注意**:
- ✅ 包含真实的 host（如 `ep-xxx-xxx.us-east-2.aws.neon.tech`）
- ✅ 包含端口号 `:5432`（数字）
- ✅ 包含真实的数据库名
- ❌ **不要**使用包含 `host`、`port` 字面量的模板

#### 🅱️ 如果使用 Supabase

1. 访问: https://supabase.com/dashboard
2. 选择你的项目
3. Settings → Database → Connection string
4. **选择 "Prisma connection string"**（不是 "URI" 或 "Pooled"）

**Supabase 格式**（示例）:
```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?schema=public
```

#### 🅾️ 如果使用本地 PostgreSQL

使用这个模板（替换为你的实际值）:
```
postgresql://postgres:postgres@localhost:5432/acams?schema=public
```

---

### Step 2: 更新 .env 文件

打开 `.env` 文件，找到：
```env
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

**完全替换**为从数据库平台复制的真实连接字符串：
```env
DATABASE_URL="postgresql://neondb_owner:password@ep-xxx-xxx.us-east-2.aws.neon.tech:5432/neondb?sslmode=require"
```

**重要**:
- ✅ 使用引号包裹（`"..."`）
- ✅ 确保是**真实值**，不是模板
- ✅ 如果密码包含特殊字符，进行 URL 编码

---

### Step 3: 检查密码特殊字符（如果适用）

如果密码包含 `@`, `#`, `$`, `%`, `&`, `+`, `/`, `:`, `;`, `=`, `?`，必须 URL 编码。

**运行自动修复**:
```bash
npx tsx scripts/fix-database-url.ts
```

或手动编码：
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- 等等

---

## ✅ 验证修复

### 1. 检查格式

```bash
npx tsx scripts/check-env.ts
```

应该看到：
```
✅ DATABASE_URL is SET
✅ Protocol: postgresql://
✅ Port found: 5432          ← 必须是数字，不是 "port" 字符串
✅ Port is numeric: 5432
✅ sslmode=require found
✅ URL format looks correct
```

### 2. 测试连接

```bash
npx tsx scripts/test-db-connection.ts
```

应该看到：
```
✅ Database connection successful!
✅ User count: 0
✅ MagicLinkToken table exists!
```

### 3. 重启 Dev Server

```bash
# 停止当前服务器
Ctrl + C

# 重新启动
npm run dev
```

重启后，控制台应该显示：
```
🔍 DATABASE_URL = SET
🔍 DATABASE_URL (masked) = postgresql://user:****@ep-xxx-xxx.us-east-2.aws.neon.tech:5432/neondb
✅ Port found: 5432          ← 不再是 "port" 字符串
```

### 4. 测试 API

访问 `http://localhost:3001/api/auth/send-magic-link`，应该返回 200，而不是 500。

---

## 🚨 永远不要使用这些词

在 `DATABASE_URL` 中，**永远不要**看到这些字面量：

- ❌ `host`
- ❌ `port`
- ❌ `database`
- ❌ `user`
- ❌ `password`

这些必须是**真实值**：
- ✅ `ep-xxx-xxx.us-east-2.aws.neon.tech`（真实 host）
- ✅ `5432`（数字端口）
- ✅ `neondb`（真实数据库名）
- ✅ `neondb_owner`（真实用户名）
- ✅ `AbCdEf123456`（真实密码）

---

## 📋 修复后验证清单

- [ ] `.env` 文件中的 `DATABASE_URL` 已替换为真实连接字符串
- [ ] 连接字符串中**没有** `host`、`port` 等字面量
- [ ] 端口是数字（如 `5432`），不是字符串 `port`
- [ ] 运行 `npx tsx scripts/check-env.ts` 验证格式
- [ ] 运行 `npx tsx scripts/test-db-connection.ts` 测试连接
- [ ] 重启 dev server
- [ ] 测试 `/api/auth/send-magic-link` API（应该返回 200）

---

## 🎯 成功标志

修复后，你应该看到：

**✅ 控制台输出**:
```
🔍 DATABASE_URL = SET
🔍 DATABASE_URL (masked) = postgresql://user:****@ep-xxx-xxx.us-east-2.aws.neon.tech:5432/neondb
✅ Port found: 5432          ← 数字，不是 "port" 字符串
```

**✅ API 响应**:
```
POST /api/auth/send-magic-link 200 in XXXms    ← 不再是 500
```

**✅ 数据库连接**:
```
✅ Database connection successful!
```

---

**下一步**: 从你的数据库平台（Neon/Supabase）获取**真实的连接字符串**，替换 `.env` 文件中的占位符。

