# 数据存储说明 (Data Storage Guide)

## 📍 当前数据存储位置

### 本地开发环境

所有数据文件保存在**项目根目录**：

```
项目根目录/
├── progress-data.json          # 用户学习进度数据
├── subscription-data.json      # 用户订阅/支付状态
├── payment-context-data.json   # 支付上下文数据
└── questions.json              # 问题内容（只读）
```

### 数据文件说明

#### 1. `progress-data.json`
- **内容**：用户的学习进度
- **格式**：
```json
[
  {
    "email": "user@example.com",
    "progress": {
      "1": {
        "answered": true,
        "correct": true,
        "userAnswers": ["A"]
      }
    }
  }
]
```

#### 2. `subscription-data.json`
- **内容**：用户的支付状态
- **格式**：
```json
[
  {
    "email": "user@example.com",
    "is_paid": true,
    "paid_at": "2024-01-15T10:30:00.000Z"
  }
]
```

#### 3. `payment-context-data.json`
- **内容**：支付上下文（临时状态）
- **格式**：
```json
[
  {
    "id": "uuid-here",
    "email": "user@example.com",
    "status": "paid",
    "created_at": "2024-01-15T10:00:00.000Z",
    "paid_at": "2024-01-15T10:30:00.000Z"
  }
]
```

#### 4. `questions.json`
- **内容**：所有问题内容（只读）
- **来源**：项目数据源，不修改

## ⚠️ 重要限制

### Vercel Serverless 环境

在 **Vercel** 等 serverless 环境中：

- ❌ **文件写入是临时的**：每次函数调用后，文件系统会被重置
- ❌ **数据不会持久化**：重启后数据会丢失
- ❌ **不适合生产环境**：仅用于开发测试

### 当前实现的问题

1. **本地开发**：✅ 数据会保存到文件
2. **Vercel 部署**：❌ 数据不会持久化

## 🔧 生产环境解决方案

### 方案 1：Vercel KV (推荐)

使用 Vercel 的 Redis 服务：

```typescript
// 示例：使用 Vercel KV
import { kv } from '@vercel/kv';

// 保存数据
await kv.set(`user:${email}`, userData);

// 读取数据
const userData = await kv.get(`user:${email}`);
```

**优点**：
- ✅ 官方支持
- ✅ 自动持久化
- ✅ 快速访问
- ✅ 免费额度充足

**安装**：
```bash
npm install @vercel/kv
```

### 方案 2：Vercel Postgres

使用 Vercel 的 PostgreSQL 数据库：

```typescript
// 示例：使用 Vercel Postgres
import { sql } from '@vercel/postgres';

// 保存数据
await sql`
  INSERT INTO users (email, is_paid, paid_at)
  VALUES (${email}, ${isPaid}, ${paidAt})
`;
```

**优点**：
- ✅ 关系型数据库
- ✅ SQL 查询
- ✅ 数据完整性
- ✅ 官方支持

**安装**：
```bash
npm install @vercel/postgres
```

### 方案 3：Supabase (第三方)

使用 Supabase 作为数据库：

```typescript
// 示例：使用 Supabase
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);
await supabase.from('users').insert({ email, is_paid: true });
```

**优点**：
- ✅ 免费额度
- ✅ 功能丰富
- ✅ 易于使用

### 方案 4：其他数据库

- **PlanetScale**：MySQL 兼容
- **Neon**：PostgreSQL
- **Upstash**：Redis
- **MongoDB Atlas**：NoSQL

## 📝 迁移步骤

### 从文件存储迁移到数据库

1. **安装数据库客户端**
   ```bash
   npm install @vercel/kv  # 或 @vercel/postgres
   ```

2. **创建数据库表**（如果使用 SQL）
   ```sql
   CREATE TABLE users (
     email VARCHAR(255) PRIMARY KEY,
     is_paid BOOLEAN DEFAULT FALSE,
     paid_at TIMESTAMP
   );
   ```

3. **更新 Store 类**
   - 替换文件操作为数据库操作
   - 保持相同的接口（方法签名不变）

4. **数据迁移**
   - 将现有 JSON 文件数据导入数据库
   - 编写迁移脚本

## 🛠️ 当前代码结构

所有 Store 类都遵循相同的模式：

```typescript
class XxxStore {
  private cache: Map<...> = new Map();
  
  async loadCache(): Promise<void> {
    // 从文件加载
  }
  
  async saveCache(): Promise<void> {
    // 保存到文件
  }
  
  // 业务方法
  async getXxx(): Promise<...> { }
  async setXxx(): Promise<void> { }
}
```

**迁移时只需要替换**：
- `loadCache()` 和 `saveCache()` 方法
- 保持其他方法不变

## 📊 数据存储对比

| 方案 | 本地开发 | Vercel 生产 | 成本 | 复杂度 |
|------|---------|------------|------|--------|
| 文件存储 | ✅ | ❌ | 免费 | 低 |
| Vercel KV | ✅ | ✅ | 免费/付费 | 中 |
| Vercel Postgres | ✅ | ✅ | 免费/付费 | 中 |
| Supabase | ✅ | ✅ | 免费/付费 | 中 |
| 自建数据库 | ✅ | ✅ | 付费 | 高 |

## 🎯 推荐方案

### 开发阶段
- ✅ 继续使用文件存储
- ✅ 数据保存在项目根目录
- ✅ 已添加到 `.gitignore`

### 生产部署
- ✅ 使用 **Vercel KV**（最简单）
- ✅ 或使用 **Vercel Postgres**（如果需要关系型查询）

## 📁 文件位置总结

### 当前（本地开发）
```
D:\personal\ai_projects\41_acams_20260103\
├── progress-data.json          ← 用户进度
├── subscription-data.json      ← 支付状态
├── payment-context-data.json   ← 支付上下文
└── questions.json              ← 问题内容
```

### 生产环境（Vercel）
```
Vercel KV / Postgres
├── users:email → progress      ← 用户进度
├── users:email → subscription  ← 支付状态
└── contexts:id → context       ← 支付上下文
```

## ⚙️ 环境变量配置

生产环境需要配置：

```env
# Vercel KV
KV_REST_API_URL=...
KV_REST_API_TOKEN=...

# 或 Vercel Postgres
POSTGRES_URL=...
POSTGRES_PRISMA_URL=...
```

## 🔒 数据安全

- ✅ 所有数据文件已添加到 `.gitignore`
- ✅ 不会提交到 Git
- ✅ 生产环境使用环境变量保护密钥

