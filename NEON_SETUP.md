# Neon PostgreSQL 设置指南

## 概述

本应用使用 Neon PostgreSQL 来持久化存储数据：
- 用户学习进度
- 用户支付/订阅状态
- 支付上下文

## 步骤 1: 创建或使用现有的 Neon 数据库

### 如果你已经有 Neon 数据库

1. **登录 Neon Dashboard**
   - 访问 [https://console.neon.tech](https://console.neon.tech)
   - 使用你的账户登录

2. **获取连接字符串**
   - 选择你的项目
   - 进入项目详情
   - 找到 **"Connection string"** 或 **"Connection Details"**
   - 复制 PostgreSQL 连接字符串
   - 格式：`postgresql://user:password@host/database`

### 如果你需要创建新的 Neon 数据库

1. **登录 Neon Dashboard**
   - 访问 [https://console.neon.tech](https://console.neon.tech)
   - 注册或登录账户

2. **创建新项目**
   - 点击 **"Create Project"**
   - 输入项目名称（例如：`acams-question-bank`）
   - 选择区域（建议选择离用户最近的区域）
   - 选择 PostgreSQL 版本（推荐最新版本）
   - 点击 **"Create Project"**

3. **获取连接字符串**
   - 项目创建后，你会看到连接详情
   - 复制 **"Connection string"**
   - 格式：`postgresql://user:password@host/database`

## 步骤 2: 初始化数据库表

### 方法 1: 使用 SQL 脚本（推荐）

1. **在 Neon Dashboard 中运行 SQL**
   - 进入项目 → **"SQL Editor"**
   - 复制 `scripts/init-db.sql` 文件的内容
   - 粘贴到 SQL Editor
   - 点击 **"Run"** 执行

### 方法 2: 使用代码初始化

创建一个临时脚本 `scripts/init-db.ts`：

```typescript
import { initDatabase } from '@/lib/db-client';

async function main() {
  try {
    await initDatabase();
    console.log('Database initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

main();
```

运行：
```bash
npx tsx scripts/init-db.ts
```

## 步骤 3: 配置环境变量

### 在 Vercel Dashboard 中配置

1. **进入项目设置**
   - 在 Vercel 项目页面，点击 **"Settings"**
   - 选择 **"Environment Variables"**

2. **添加环境变量**
   - 点击 **"Add New"**
   - **Name**: `DATABASE_URL`
   - **Value**: 粘贴你的 Neon PostgreSQL 连接字符串
   - **Environment**: 选择所有环境（Production, Preview, Development）
   - 点击 **"Save"**

### 在本地开发环境中配置

1. **创建 `.env.local` 文件**
   - 在项目根目录创建 `.env.local` 文件（如果不存在）

2. **添加环境变量**
   ```env
   OPENAI_API_KEY=your_openai_api_key
   DATABASE_URL=postgresql://user:password@host/database
   ```

3. **重启开发服务器**
   ```bash
   npm run dev
   ```

## 步骤 4: 验证配置

### 检查环境变量

在 Vercel Dashboard 中：
1. 进入项目 → Settings → Environment Variables
2. 确认 `DATABASE_URL` 已添加
3. 确认它适用于所有环境

### 测试连接

部署到 Vercel 后：
1. 访问你的应用
2. 尝试创建一个账户（输入邮箱）
3. 尝试保存一些学习进度
4. 在 Neon Dashboard → SQL Editor 中查询：
   ```sql
   SELECT * FROM user_progress;
   SELECT * FROM subscriptions;
   SELECT * FROM payment_contexts;
   ```
5. 应该能看到数据被存储

## 数据库表结构

### payment_contexts 表

存储支付上下文信息：

| 列名 | 类型 | 说明 |
|------|------|------|
| id | VARCHAR(255) | 主键，UUID |
| email | VARCHAR(255) | 订阅邮箱 |
| status | VARCHAR(20) | 'pending' 或 'paid' |
| created_at | TIMESTAMP | 创建时间 |
| paid_at | TIMESTAMP | 支付时间（可选） |

### subscriptions 表

存储用户订阅状态：

| 列名 | 类型 | 说明 |
|------|------|------|
| email | VARCHAR(255) | 主键，用户邮箱 |
| is_paid | BOOLEAN | 是否已付费 |
| paid_at | TIMESTAMP | 付费时间（可选） |

### user_progress 表

存储用户学习进度：

| 列名 | 类型 | 说明 |
|------|------|------|
| email | VARCHAR(255) | 主键，用户邮箱 |
| progress | JSONB | 学习进度（JSON 格式） |
| last_active_at | TIMESTAMP | 最后活跃时间 |

## 故障排查

### 问题 1: 环境变量未设置

**错误信息：**
```
Database client is not available. Please set DATABASE_URL environment variable.
```

**解决方案：**
1. 检查 `.env.local` 文件是否存在
2. 确认环境变量名称正确（`DATABASE_URL`）
3. 确认连接字符串格式正确
4. 重启开发服务器

### 问题 2: 连接失败

**错误信息：**
```
Database query error: connection refused
```

**解决方案：**
1. 检查连接字符串是否正确
2. 确认 Neon 数据库状态为 "Active"
3. 检查网络连接
4. 确认数据库允许来自你的 IP 的连接（Neon 默认允许所有 IP）

### 问题 3: 表不存在

**错误信息：**
```
relation "payment_contexts" does not exist
```

**解决方案：**
1. 运行数据库初始化脚本（`scripts/init-db.sql`）
2. 或在 Neon Dashboard → SQL Editor 中手动创建表

### 问题 4: 数据未持久化

**可能原因：**
1. 环境变量未正确配置
2. 使用了错误的数据库
3. 事务未提交

**解决方案：**
1. 在 Neon Dashboard → SQL Editor 中查询数据
2. 检查应用日志中的错误信息
3. 确认环境变量在正确的环境中设置

## 成本说明

### Neon 免费额度

- **免费层**：0.5 GB 存储，每月 192 小时计算时间
- **超出后**：按使用量计费

### 估算使用量

对于本应用：
- 每个用户记录：约 1-10 KB
- 1000 个用户：约 1-10 MB
- 免费额度可支持：约 50,000 - 500,000 个用户

## 迁移现有数据（可选）

如果你有现有的 KV 或 JSON 文件数据需要迁移：

### 从 KV 迁移

1. 导出 KV 数据（通过 Vercel Dashboard）
2. 编写迁移脚本将数据导入 PostgreSQL

### 从 JSON 文件迁移

创建迁移脚本 `scripts/migrate-from-json.ts`：

```typescript
import { dbQuery } from '@/lib/db-client';
import fs from 'fs';

// 读取 JSON 文件
const progressData = JSON.parse(fs.readFileSync('progress-data.json', 'utf-8'));
const subscriptionData = JSON.parse(fs.readFileSync('subscription-data.json', 'utf-8'));

// 迁移进度数据
for (const userProgress of progressData) {
  await dbQuery(
    `INSERT INTO user_progress (email, progress, last_active_at)
     VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (email) DO NOTHING`,
    [userProgress.email, JSON.stringify(userProgress.progress), userProgress.lastActiveAt]
  );
}

// 迁移订阅数据
for (const subscription of subscriptionData) {
  await dbQuery(
    `INSERT INTO subscriptions (email, is_paid, paid_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    [subscription.email, subscription.is_paid, subscription.paid_at]
  );
}
```

## 安全注意事项

1. **不要提交连接字符串到 Git**
   - `.env.local` 已在 `.gitignore` 中
   - 永远不要在代码中硬编码连接字符串

2. **使用只读用户（可选）**
   - 为只读操作创建单独的数据库用户
   - 限制权限以提高安全性

3. **定期备份**
   - Neon 提供自动备份
   - 可以手动导出数据

## 下一步

配置完成后：
1. 部署到 Vercel
2. 测试支付流程
3. 验证数据持久化
4. 监控数据库使用量

如有问题，请查看 Neon 文档：
- [Neon Documentation](https://neon.tech/docs)
- [@neondatabase/serverless](https://github.com/neondatabase/serverless)

