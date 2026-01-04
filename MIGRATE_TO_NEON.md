# 迁移到 Neon PostgreSQL 方案

## 概述

将当前使用 Vercel KV 的存储迁移到 Neon PostgreSQL 数据库。

## 优势

- ✅ 你已经安装了 Neon Storage
- ✅ PostgreSQL 是关系型数据库，支持 SQL 查询
- ✅ 更好的数据完整性和事务支持
- ✅ 适合未来扩展（如果需要复杂查询）

## 需要的信息

请确认以下信息：

1. **Neon 连接信息**：
   - 你是否有 Neon 数据库的连接字符串？
   - 格式通常是：`postgresql://user:password@host/database`

2. **环境变量**：
   - 是否已经在 Vercel Dashboard 中配置了 Neon？
   - 环境变量名称是什么？（可能是 `DATABASE_URL` 或 `POSTGRES_URL`）

3. **Neon 客户端包**：
   - 你使用的是哪个包？
   - `@neon/serverless` 还是 `@vercel/postgres`？

## 迁移步骤

### 步骤 1: 安装 Neon 客户端

如果使用 `@neon/serverless`：
```bash
npm install @neon/serverless
```

如果使用 `@vercel/postgres`（通过 Vercel 集成）：
```bash
npm install @vercel/postgres
```

### 步骤 2: 创建数据库表

需要创建三个表：

```sql
-- 支付上下文表
CREATE TABLE payment_contexts (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMP NOT NULL,
  paid_at TIMESTAMP
);

-- 用户订阅表
CREATE TABLE subscriptions (
  email VARCHAR(255) PRIMARY KEY,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMP
);

-- 用户进度表
CREATE TABLE user_progress (
  email VARCHAR(255) PRIMARY KEY,
  progress JSONB NOT NULL,
  last_active_at TIMESTAMP NOT NULL
);
```

### 步骤 3: 创建数据库客户端

创建 `lib/db-client.ts` 来封装数据库操作。

### 步骤 4: 迁移 Store 类

修改三个 Store 类，将 KV 操作替换为 SQL 操作：
- `lib/payment-context-store.ts`
- `lib/subscription-store.ts`
- `lib/progress-store.ts`

### 步骤 5: 更新环境变量

更新 `.env.local` 和 Vercel Dashboard 中的环境变量。

## 数据迁移

如果需要迁移现有 KV 数据到 Neon：
1. 从 KV 导出数据
2. 编写迁移脚本导入到 PostgreSQL

## 请提供以下信息以便开始迁移：

1. 你使用的 Neon 客户端包名称
2. 你的数据库连接字符串或环境变量名称
3. 是否已经创建了数据库表

