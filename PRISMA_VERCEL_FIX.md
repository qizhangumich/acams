# Prisma Client 初始化错误修复

## 问题

错误信息：
```
Error: @prisma/client did not initialize yet. Please run
"prisma generate" and try to import it again.
```

## 原因

在 Vercel 部署时，Prisma Client 没有被正确生成。虽然 `vercel-build` 脚本中有 `prisma generate`，但可能：
1. 构建过程中 Prisma generate 失败
2. 生成的 Prisma Client 没有被正确包含在部署包中
3. 环境变量（DATABASE_URL）在构建时不可用

## 解决方案

### 1. 添加 postinstall 脚本（已修复）

在 `package.json` 中添加了 `postinstall` 脚本：

```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

这确保在 `npm install` 后自动运行 `prisma generate`。

### 2. 确保 DATABASE_URL 在构建时可用

**重要**: 在 Vercel Dashboard 中，确保 `DATABASE_URL` 环境变量已设置，并且：
- 选择所有环境（Production, Preview, Development）
- 在构建时可用（Build-time environment variables）

### 3. 验证构建日志

在 Vercel Dashboard → Deployments → 最新部署 → Build Logs 中，应该看到：

```
Running "npm install"
...
Running "prisma generate"
...
Generating Prisma Client ...
```

## 验证步骤

### 1. 检查环境变量

在 Vercel Dashboard → Settings → Environment Variables：
- ✅ `DATABASE_URL` 已设置
- ✅ 选择所有环境
- ✅ 格式正确（PostgreSQL 连接字符串）

### 2. 检查构建日志

在 Vercel Dashboard → Deployments → 最新部署：
- ✅ 查看 "Build Logs"
- ✅ 确认看到 "Generating Prisma Client"
- ✅ 确认没有 Prisma 相关错误

### 3. 测试 API

部署完成后，访问：

```
https://acams.vercel.app/api/health
```

如果仍然报 Prisma 错误，检查：
1. DATABASE_URL 是否正确
2. 数据库是否可以连接
3. Prisma schema 是否正确

## 如果仍然失败

### 方案 1: 手动触发重新部署

1. 在 Vercel Dashboard 中
2. 进入 Deployments
3. 点击 "Redeploy"

### 方案 2: 检查 Prisma 输出

确保 `node_modules/.prisma/client` 目录存在（虽然不应该提交到 Git）。

### 方案 3: 使用 Prisma 的 Edge Client（如果适用）

如果使用 Edge Runtime，可能需要使用 `@prisma/client/edge`。

---

**当前修复**: 已添加 `postinstall` 脚本，确保 Prisma Client 在安装依赖后自动生成。

