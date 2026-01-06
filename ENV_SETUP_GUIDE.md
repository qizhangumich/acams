# 环境变量获取指南

## 🔑 JWT_SECRET 获取方法

### 方法 1: 使用 OpenSSL（推荐）

**Windows (PowerShell)**:
```powershell
# 生成 32 字节的随机字符串（Base64 编码）
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

**Windows (Git Bash / WSL)**:
```bash
openssl rand -base64 32
```

**Mac / Linux**:
```bash
openssl rand -base64 32
```

**在线生成器**（如果本地没有 OpenSSL）:
- 访问 https://www.random.org/strings/
- 设置：长度 32，字符集 Base64
- 或访问 https://generate-secret.vercel.app/32

### 方法 2: 使用 Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 示例输出

```
JWT_SECRET=Kx9mP2vQ7nR4tY8wZ1aB5cD6eF3gH7iJ0kL2mN4pQ6rS8tU1vW3xY5zA7bC9dE
```

**重要提示**:
- 至少 32 个字符
- 使用随机生成的字符串
- 不要使用可预测的值（如 "password123"）
- 保存好这个密钥，丢失后用户需要重新登录

---

## 📧 RESEND_API_KEY 获取方法

### 步骤 1: 注册 Resend 账号

1. 访问 https://resend.com
2. 点击 "Sign Up" 或 "Get Started"
3. 使用 GitHub、Google 或邮箱注册

### 步骤 2: 创建 API Key

1. 登录后，进入 Dashboard: https://resend.com/dashboard
2. 点击左侧菜单 "API Keys"
3. 点击 "Create API Key" 按钮
4. 输入名称（例如：`acams-production`）
5. 选择权限（选择 "Sending access"）
6. 点击 "Add" 创建
7. **重要**: 复制 API Key（只显示一次，请立即保存）

### 步骤 3: 验证域名（可选但推荐）

**如果不验证域名**:
- 可以使用 Resend 提供的测试域名
- 格式：`onboarding@resend.dev`
- 仅用于开发测试

**如果要使用自己的域名**:
1. 在 Resend Dashboard 中，进入 "Domains"
2. 点击 "Add Domain"
3. 输入你的域名（例如：`yourdomain.com`）
4. 按照提示添加 DNS 记录：
   - SPF 记录
   - DKIM 记录
   - DMARC 记录（可选）
5. 等待验证完成（通常几分钟）

### 步骤 4: 获取发件人邮箱

**使用测试域名**:
```
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**使用已验证的域名**:
```
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

### 示例 API Key 格式

```
RESEND_API_KEY=re_1234567890abcdefghijklmnopqrstuvwxyz
```

**重要提示**:
- API Key 以 `re_` 开头
- 创建后只显示一次，请立即保存
- 如果丢失，需要创建新的 API Key
- 不要将 API Key 提交到 Git 仓库

---

## 📋 完整环境变量示例

创建 `.env.local` 文件（本地开发）:

```env
# 数据库
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# JWT 密钥（自己生成）
JWT_SECRET=Kx9mP2vQ7nR4tY8wZ1aB5cD6eF3gH7iJ0kL2mN4pQ6rS8tU1vW3xY5zA7bC9dE

# Resend 邮件服务
RESEND_API_KEY=re_1234567890abcdefghijklmnopqrstuvwxyz
RESEND_FROM_EMAIL=onboarding@resend.dev

# OpenAI API
OPENAI_API_KEY=sk-xxxxxxxxxxxxx

# 应用 URL（本地开发）
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Vercel 部署时**:
- 在 Vercel Dashboard 的 "Environment Variables" 中设置
- 将 `NEXT_PUBLIC_APP_URL` 改为你的 Vercel 部署 URL
- 例如：`NEXT_PUBLIC_APP_URL=https://acams.vercel.app`

---

## 🔒 安全提示

1. **不要提交 `.env.local` 到 Git**
   - `.env.local` 已在 `.gitignore` 中
   - 确保不会意外提交敏感信息

2. **使用不同的密钥用于不同环境**
   - 开发环境：使用测试密钥
   - 生产环境：使用生产密钥

3. **定期轮换密钥**
   - 如果密钥泄露，立即更换
   - 更换 JWT_SECRET 会导致所有用户需要重新登录

4. **使用强密码**
   - JWT_SECRET 至少 32 个字符
   - 使用随机生成的字符串

---

## ✅ 验证设置

### 测试 JWT_SECRET

```bash
# 检查长度
echo $JWT_SECRET | wc -c
# 应该 >= 32
```

### 测试 Resend API

在代码中测试（或使用 Postman）:

```bash
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer re_YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "your-email@example.com",
    "subject": "Test Email",
    "html": "<p>This is a test email</p>"
  }'
```

如果返回 200 OK，说明 API Key 有效。

---

## 🆘 常见问题

### Q: JWT_SECRET 可以重复使用吗？
A: 可以，但建议每个项目使用不同的密钥。

### Q: Resend 免费额度是多少？
A: Resend 免费计划每月 3,000 封邮件，100 个 API 请求/天。

### Q: 可以使用其他邮件服务吗？
A: 可以，但需要修改代码中的邮件发送逻辑。Resend 是最简单的选择。

### Q: 忘记保存 API Key 怎么办？
A: 在 Resend Dashboard 中删除旧的 API Key，创建新的。

### Q: JWT_SECRET 丢失了怎么办？
A: 生成新的 JWT_SECRET，但所有用户需要重新登录（因为旧的 token 无法验证）。

---

**需要帮助？** 查看详细文档：
- Resend 文档: https://resend.com/docs
- JWT 文档: https://jwt.io/introduction

