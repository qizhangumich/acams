# 数据库连接问题修复

## 错误信息

```
Error: P1013: The provided database string is invalid. invalid port number in database URL.
```

## 问题原因

`.env` 文件中的 `DATABASE_URL` 格式不正确。

## 解决方案

### 1. 检查 DATABASE_URL 格式

**正确的 PostgreSQL 连接字符串格式**:

```
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```

**示例（Neon PostgreSQL）**:
```
DATABASE_URL="postgresql://user:password@ep-xxx-xxx.us-east-2.aws.neon.tech:5432/neondb?sslmode=require"
```

### 2. 常见错误

❌ **错误格式**:
```
DATABASE_URL="postgresql://user:password@host/database"  # 缺少端口
DATABASE_URL="postgresql://user:password@host:port/database"  # 缺少 sslmode
DATABASE_URL="postgres://..."  # 应该是 postgresql://
```

✅ **正确格式**:
```
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

### 3. 特殊字符处理

如果密码包含特殊字符，需要进行 URL 编码：

**特殊字符编码**:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `/` → `%2F`
- `:` → `%3A`
- `?` → `%3F`
- `=` → `%3D`

**示例**:
如果密码是 `p@ss#word`，应该编码为 `p%40ss%23word`

### 4. 从 Neon 获取连接字符串

1. 登录 Neon Dashboard: https://console.neon.tech
2. 选择你的项目
3. 点击 "Connection Details"
4. 选择 "Connection String" 标签
5. 复制完整的连接字符串

**Neon 连接字符串格式**:
```
postgresql://[user]:[password]@[hostname]/[dbname]?sslmode=require
```

### 5. 验证连接字符串

在 `.env` 文件中设置后，运行：

```bash
npm run db:generate
```

如果成功，应该看到：
```
✔ Generated Prisma Client
```

然后运行：

```bash
npm run db:migrate
```

如果成功，应该看到：
```
✔ Migration applied
```

## 本地开发设置

### 1. 创建 `.env.local` 文件

在项目根目录创建 `.env.local`:

```env
# Database (从 Neon 获取)
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# JWT Secret (自己生成)
JWT_SECRET="your-strong-random-secret-min-32-characters"

# Email (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxx"
RESEND_FROM_EMAIL="onboarding@resend.dev"

# OpenAI
OPENAI_API_KEY="sk-xxxxxxxxxxxxx"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 2. 运行数据库迁移

```bash
# 1. 生成 Prisma Client
npm run db:generate

# 2. 运行迁移
npm run db:migrate

# 3. 种子数据（可选）
npm run db:seed
```

## Vercel 部署设置

在 Vercel Dashboard → Settings → Environment Variables 中：

1. 添加 `DATABASE_URL`
2. 确保选择所有环境（Production, Preview, Development）
3. 使用完整的连接字符串（包括 `?sslmode=require`）

## 测试连接

### 方法 1: 使用 Prisma Studio

```bash
npm run db:studio
```

如果能够打开 Prisma Studio，说明连接成功。

### 方法 2: 使用 psql（如果已安装）

```bash
psql "postgresql://user:password@host:5432/database?sslmode=require"
```

### 方法 3: 运行迁移

```bash
npm run db:migrate
```

如果成功，说明连接正常。

## 如果仍然失败

1. **检查数据库服务是否运行**
   - Neon: 检查 Dashboard 中的数据库状态
   - 本地 PostgreSQL: 检查服务是否启动

2. **检查网络连接**
   - 确保可以访问数据库服务器
   - 检查防火墙设置

3. **检查凭据**
   - 用户名和密码是否正确
   - 数据库名称是否正确

4. **查看详细错误**
   - 运行 `npm run db:migrate` 查看完整错误信息
   - 检查 Prisma 日志

---

**关键**: 确保 `DATABASE_URL` 格式正确，包含端口号和 `sslmode=require`。

