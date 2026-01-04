# Vercel KV 设置指南

## 概述

本应用使用 Vercel KV (Redis) 来持久化存储数据：
- 用户学习进度
- 用户支付/订阅状态
- 支付上下文

## 步骤 1: 在 Vercel Dashboard 创建 KV 数据库

1. **登录 Vercel Dashboard**
   - 访问 [https://vercel.com/dashboard](https://vercel.com/dashboard)
   - 使用你的账户登录

2. **进入项目**
   - 选择你的项目（或创建新项目）

3. **创建 KV 数据库**
   - 点击项目设置（Settings）
   - 在左侧菜单选择 **"Storage"**
   - 点击 **"Create Database"**
   - 选择 **"KV"** (Redis)
   - 输入数据库名称（例如：`acams-kv`）
   - 选择区域（建议选择离用户最近的区域）
   - 点击 **"Create"**

4. **获取连接信息**
   - 创建成功后，你会看到数据库详情页面
   - 找到 **"REST API"** 部分
   - 复制以下信息：
     - **REST API URL** (例如：`https://xxx.upstash.io`)
     - **REST API Token** (长字符串)

## 步骤 2: 配置环境变量

### 在 Vercel Dashboard 中配置

1. **进入项目设置**
   - 在项目页面，点击 **"Settings"**
   - 选择 **"Environment Variables"**

2. **添加环境变量**
   - 点击 **"Add New"**
   - 添加以下变量：

   **变量 1:**
   - **Name**: `KV_REST_API_URL`
   - **Value**: 粘贴你的 REST API URL
   - **Environment**: 选择所有环境（Production, Preview, Development）

   **变量 2:**
   - **Name**: `KV_REST_API_TOKEN`
   - **Value**: 粘贴你的 REST API Token
   - **Environment**: 选择所有环境（Production, Preview, Development）

3. **保存**
   - 点击 **"Save"** 保存每个变量

### 在本地开发环境中配置

1. **创建 `.env.local` 文件**
   - 在项目根目录创建 `.env.local` 文件（如果不存在）

2. **添加环境变量**
   ```env
   OPENAI_API_KEY=your_openai_api_key
   KV_REST_API_URL=https://xxx.upstash.io
   KV_REST_API_TOKEN=your_vercel_kv_token
   ```

3. **重启开发服务器**
   ```bash
   npm run dev
   ```

## 步骤 3: 验证配置

### 检查环境变量

在 Vercel Dashboard 中：
1. 进入项目 → Settings → Environment Variables
2. 确认两个 KV 变量都已添加
3. 确认它们适用于所有环境

### 测试连接

部署到 Vercel 后：
1. 访问你的应用
2. 尝试创建一个账户（输入邮箱）
3. 尝试保存一些学习进度
4. 检查 Vercel Dashboard → Storage → KV → 你的数据库
5. 应该能看到数据被存储

## 数据存储结构

### KV Key 命名规范

- `context:{uuid}` - 支付上下文
  - 例如：`context:550e8400-e29b-41d4-a716-446655440000`
  
- `user:{email}` - 用户订阅状态
  - 例如：`user:user@example.com`
  
- `progress:{email}` - 用户学习进度
  - 例如：`progress:user@example.com`

### 查看数据

在 Vercel Dashboard 中：
1. 进入 Storage → KV → 你的数据库
2. 点击 "Data Browser"
3. 可以看到所有存储的键值对

## 故障排查

### 问题 1: 环境变量未设置

**错误信息：**
```
KV client is not available. Please set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.
```

**解决方案：**
1. 检查 `.env.local` 文件是否存在
2. 确认环境变量名称正确（区分大小写）
3. 重启开发服务器

### 问题 2: 连接失败

**错误信息：**
```
KV GET error for key xxx: ...
```

**解决方案：**
1. 检查 REST API URL 是否正确
2. 检查 REST API Token 是否正确
3. 确认 KV 数据库状态为 "Active"
4. 检查网络连接

### 问题 3: 数据未持久化

**可能原因：**
1. 环境变量未正确配置
2. 使用了错误的 KV 数据库
3. 数据被其他操作删除

**解决方案：**
1. 在 Vercel Dashboard 中检查 KV 数据库中的数据
2. 检查应用日志中的错误信息
3. 确认环境变量在正确的环境中设置

## 成本说明

### Vercel KV 免费额度

- **免费层**：每天 10,000 次读取，每天 10,000 次写入
- **超出后**：按使用量计费

### 估算使用量

对于本应用：
- 每次用户登录：1 次读取（检查支付状态）
- 每次保存进度：1 次写入
- 每次支付确认：2 次写入（上下文 + 用户状态）

**典型用户每天使用量：**
- 登录：1 次读取
- 答题 50 题：50 次写入
- 支付确认：2 次写入

**总计：** 约 1 次读取 + 52 次写入/用户/天

**免费额度可支持：** 约 190 个活跃用户/天

## 迁移现有数据（可选）

如果你有现有的 JSON 文件数据需要迁移：

### 1. 导出 JSON 数据

```bash
# 查看现有数据文件
cat progress-data.json
cat subscription-data.json
cat payment-context-data.json
```

### 2. 创建迁移脚本

创建一个临时脚本 `scripts/migrate-to-kv.ts`：

```typescript
import { kvSet } from '@/lib/kv-client';
import fs from 'fs';

// 读取 JSON 文件
const progressData = JSON.parse(fs.readFileSync('progress-data.json', 'utf-8'));
const subscriptionData = JSON.parse(fs.readFileSync('subscription-data.json', 'utf-8'));

// 迁移进度数据
for (const userProgress of progressData) {
  await kvSet(`progress:${userProgress.email}`, userProgress);
}

// 迁移订阅数据
for (const subscription of subscriptionData) {
  await kvSet(`user:${subscription.email}`, subscription);
}
```

### 3. 运行迁移

```bash
npx tsx scripts/migrate-to-kv.ts
```

## 安全注意事项

1. **不要提交环境变量到 Git**
   - `.env.local` 已在 `.gitignore` 中
   - 永远不要在代码中硬编码密钥

2. **定期轮换 Token**
   - 在 Vercel Dashboard 中可以重新生成 Token
   - 如果 Token 泄露，立即重新生成

3. **限制访问**
   - KV 数据库默认只能通过 Vercel 项目访问
   - 不要将 Token 分享给未授权人员

## 下一步

配置完成后：
1. 部署到 Vercel
2. 测试支付流程
3. 验证数据持久化
4. 监控 KV 使用量

如有问题，请查看 Vercel 文档：
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)

