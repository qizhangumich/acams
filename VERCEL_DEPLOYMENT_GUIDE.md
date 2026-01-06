# Vercel 部署指南

## 📋 部署前准备

### 1. 环境变量设置

在 Vercel 项目设置中添加以下环境变量：

#### 必需的环境变量

```env
# 数据库连接
DATABASE_URL=postgresql://user:password@host:port/database?schema=public

# JWT 密钥（至少 32 个字符）
JWT_SECRET=your-strong-random-secret-min-32-characters-long

# 邮件服务（Resend）
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@yourdomain.com

# OpenAI API（用于 AI 解释和聊天）
OPENAI_API_KEY=sk-xxxxxxxxxxxxx

# 应用 URL
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

#### 环境变量说明

- **DATABASE_URL**: Neon PostgreSQL 连接字符串
  - 获取方式：Neon Dashboard → Connection String → Copy
  - 格式：`postgresql://user:password@host/database?sslmode=require`

- **JWT_SECRET**: 用于签名和验证 JWT token
  - 生成方式：`openssl rand -base64 32`
  - 或使用在线工具生成至少 32 个字符的随机字符串

- **RESEND_API_KEY**: Resend API 密钥
  - 获取方式：https://resend.com/api-keys
  - 用于发送魔法链接邮件

- **RESEND_FROM_EMAIL**: 发件人邮箱
  - 必须在 Resend 中验证的域名邮箱
  - 格式：`noreply@yourdomain.com`

- **OPENAI_API_KEY**: OpenAI API 密钥
  - 获取方式：https://platform.openai.com/api-keys
  - 用于 AI 解释和聊天功能

- **NEXT_PUBLIC_APP_URL**: 应用部署 URL
  - 格式：`https://your-app.vercel.app`
  - 用于生成魔法链接

---

## 🚀 部署步骤

### 方法 1: 通过 Vercel Dashboard（推荐）

1. **登录 Vercel**
   - 访问 https://vercel.com
   - 使用 GitHub 账号登录

2. **导入项目**
   - 点击 "Add New..." → "Project"
   - 选择 GitHub 仓库 `qizhangumich/acams`
   - 点击 "Import"

3. **配置项目**
   - **Framework Preset**: Next.js（自动检测）
   - **Root Directory**: `./`（默认）
   - **Build Command**: `npm run build`（自动检测）
   - **Output Directory**: `.next`（自动检测）
   - **Install Command**: `npm install`（自动检测）

4. **设置环境变量**
   - 在 "Environment Variables" 部分
   - 添加所有必需的环境变量（见上方列表）
   - 确保选择所有环境（Production, Preview, Development）

5. **部署**
   - 点击 "Deploy"
   - 等待构建完成（约 2-5 分钟）

---

### 方法 2: 通过 Vercel CLI

1. **安装 Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **登录 Vercel**
   ```bash
   vercel login
   ```

3. **部署**
   ```bash
   vercel
   ```
   
   首次部署会提示：
   - Link to existing project? → No
   - Project name? → acams（或自定义）
   - Directory? → ./
   - Override settings? → No

4. **设置环境变量**
   ```bash
   vercel env add DATABASE_URL
   vercel env add JWT_SECRET
   vercel env add RESEND_API_KEY
   vercel env add RESEND_FROM_EMAIL
   vercel env add OPENAI_API_KEY
   vercel env add NEXT_PUBLIC_APP_URL
   ```

5. **生产环境部署**
   ```bash
   vercel --prod
   ```

---

## 🗄️ 数据库设置

### 1. 创建 Neon 数据库

1. 访问 https://neon.tech
2. 创建新项目
3. 复制连接字符串（Connection String）

### 2. 运行数据库迁移

**本地运行**（推荐）:
```bash
# 1. 设置 DATABASE_URL
export DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# 2. 生成 Prisma Client
npm run db:generate

# 3. 运行迁移
npm run db:migrate

# 4. 种子数据（加载问题）
npm run db:seed
```

**或使用 Vercel 部署后运行**:
```bash
# 在 Vercel 部署后，通过 Vercel CLI 运行
vercel env pull .env.local
npm run db:migrate
npm run db:seed
```

---

## ✅ 部署后验证

### 1. 检查部署状态

- 访问 Vercel Dashboard
- 查看部署日志
- 确认构建成功（Build: Success）

### 2. 测试功能

1. **访问应用**
   - 打开 `https://your-app.vercel.app`
   - 应该看到登录页面

2. **测试认证**
   - 输入邮箱
   - 发送魔法链接
   - 验证登录

3. **测试问题页面**
   - 访问 `/questions`
   - 答题并提交
   - 验证进度保存

4. **测试 AI 功能**
   - 答错一道题
   - 点击 "🤖 Explain this question (AI)"
   - 验证 AI 解释显示

5. **测试 Dashboard**
   - 访问 `/dashboard`
   - 验证统计数据

6. **测试 Wrong Book**
   - 访问 `/wrong-book`
   - 验证错题列表

7. **测试 Review Mode**
   - 访问 `/review/sprint`
   - 验证高风险问题识别
   - 测试 Review Mode

---

## 🔧 故障排除

### 构建失败

**问题**: Build failed

**解决方案**:
1. 检查环境变量是否全部设置
2. 查看构建日志中的错误信息
3. 确保 `DATABASE_URL` 格式正确
4. 确保 `JWT_SECRET` 至少 32 个字符

### 数据库连接错误

**问题**: Database connection error

**解决方案**:
1. 检查 `DATABASE_URL` 是否正确
2. 确保 Neon 数据库已创建
3. 检查网络连接（Neon 需要 SSL）
4. 确保数据库迁移已运行

### 邮件发送失败

**问题**: Magic link email not sent

**解决方案**:
1. 检查 `RESEND_API_KEY` 是否正确
2. 检查 `RESEND_FROM_EMAIL` 是否已验证
3. 查看 Vercel 函数日志

### AI 功能不工作

**问题**: AI explanation not working

**解决方案**:
1. 检查 `OPENAI_API_KEY` 是否正确
2. 检查 OpenAI 账户余额
3. 查看 API 调用日志

---

## 📝 下一步

### 1. 域名配置（可选）

1. 在 Vercel Dashboard 中
2. 进入项目设置 → Domains
3. 添加自定义域名
4. 更新 `NEXT_PUBLIC_APP_URL` 环境变量

### 2. 监控设置

1. 设置 Vercel Analytics（可选）
2. 设置错误监控（Sentry 等，可选）
3. 设置日志聚合（可选）

### 3. 性能优化

1. 启用 Vercel Edge Functions（如需要）
2. 配置 CDN 缓存
3. 优化数据库查询

### 4. 安全加固

1. 确保所有环境变量已设置
2. 检查 API 路由的安全性
3. 设置 CORS（如需要）
4. 启用 HTTPS（Vercel 默认启用）

---

## 🔗 相关链接

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Neon Dashboard**: https://console.neon.tech
- **Resend Dashboard**: https://resend.com/dashboard
- **OpenAI Platform**: https://platform.openai.com

---

## 📋 部署检查清单

- [ ] 所有环境变量已设置
- [ ] 数据库已创建并迁移
- [ ] 问题数据已种子化
- [ ] 构建成功
- [ ] 应用可以访问
- [ ] 认证功能正常
- [ ] 问题页面正常
- [ ] AI 功能正常
- [ ] Dashboard 正常
- [ ] Wrong Book 正常
- [ ] Review Mode 正常

---

**部署完成！** 🎉

