# 🔍 Vercel 404 NOT_FOUND 错误修复指南

根据 [Vercel 官方文档](https://vercel.com/docs/errors/NOT_FOUND)，404 错误通常发生在：
1. 资源被移动或删除
2. URL 中有拼写错误
3. 路由文件不存在或未正确部署

---

## 🎯 问题分析

### 根本原因

**问题**: 访问 `/auth/verify?token=xxx&email=xxx` 返回 404

**原因**:
- 邮件中的链接指向 `/auth/verify`
- 但只有 API 路由 `/api/auth/verify` 存在
- Next.js App Router 需要页面路由 `app/auth/verify/page.tsx` 来处理页面请求

### 代码 vs 需求

**实际代码**:
- ✅ `app/api/auth/verify/route.ts` - API 路由（返回 JSON）
- ❌ `app/auth/verify/page.tsx` - 页面路由（不存在）

**需求**:
- 用户点击邮件链接 → 访问 `/auth/verify`
- 需要页面路由来处理这个请求
- 验证 token → 设置 cookie → 重定向到 `/questions`

---

## ✅ 修复方案

已创建页面路由 `app/auth/verify/page.tsx`，它会：

1. **接收 URL 参数** (`token` 和 `email`)
2. **验证 magic link token**
3. **创建或查找用户**
4. **生成 session token**
5. **设置 HTTP-only cookie**
6. **重定向到 `/questions` 页面**

如果验证失败，重定向到 `/login` 并显示错误信息。

---

## 🔍 验证步骤

根据 Vercel 文档，按以下步骤验证：

### Step 1: 检查部署状态

1. **进入 Vercel Dashboard**
   - 访问: https://vercel.com/dashboard
   - 选择项目 `acams`

2. **检查最新部署**
   - 进入 "Deployments" 页面
   - 确认最新部署包含 commit `b315a68` ("Add /auth/verify page route")
   - 确认部署状态为 "Ready"（绿色）

3. **检查构建日志**
   - 点击最新部署
   - 查看 "Build Logs"
   - 确认没有错误
   - 确认 `app/auth/verify/page.tsx` 被正确构建

### Step 2: 验证文件存在

在 GitHub 上确认文件已提交：
- 访问: https://github.com/qizhangumich/acams/tree/main/app/auth/verify
- 应该看到：
  - ✅ `page.tsx`
  - ✅ `page.module.css`

### Step 3: 测试路由

部署完成后，测试以下 URL：

#### 3.1 测试健康检查 API
```
https://acams.vercel.app/api/health
```
**预期**: 返回 `{ status: "ok", ... }`
- ✅ 成功 → 路由系统正常
- ❌ 404 → 检查 Root Directory 设置

#### 3.2 测试验证页面（带有效 token）
```
https://acams.vercel.app/auth/verify?token=VALID_TOKEN&email=user@example.com
```
**预期**:
- ✅ 验证成功 → 重定向到 `/questions`
- ❌ 404 → 文件未正确部署

#### 3.3 测试验证页面（缺少参数）
```
https://acams.vercel.app/auth/verify
```
**预期**: 重定向到 `/login?error=missing_parameters`

---

## 🧠 概念解释

### Next.js App Router 路由系统

**页面路由** (`app/*/page.tsx`):
- 处理页面请求（返回 HTML）
- 用于用户直接访问的 URL
- 例如: `/auth/verify` → `app/auth/verify/page.tsx`

**API 路由** (`app/*/route.ts`):
- 处理 API 请求（返回 JSON）
- 用于前端 fetch 调用
- 例如: `/api/auth/verify` → `app/api/auth/verify/route.ts`

**区别**:
- 页面路由 → 浏览器直接访问 → 返回 HTML 页面
- API 路由 → fetch/axios 调用 → 返回 JSON 数据

### 为什么需要页面路由？

Magic link 验证流程：
1. 用户点击邮件中的链接
2. 浏览器导航到 `/auth/verify?token=xxx&email=xxx`
3. 需要**页面路由**来处理这个请求
4. 验证 token → 设置 cookie → 重定向

如果只有 API 路由：
- 浏览器访问 `/auth/verify` → 404（找不到页面）
- API 路由 `/api/auth/verify` 只能通过 fetch 调用

---

## ⚠️ 警告信号

### 可能导致 404 的情况

1. **文件未提交到 Git**
   - 症状: 本地正常，线上 404
   - 检查: `git status` 查看未提交文件

2. **文件路径错误**
   - 症状: 文件存在但路由不工作
   - 检查: Next.js App Router 要求 `app/[route]/page.tsx`

3. **Root Directory 设置错误**
   - 症状: 所有路由都 404
   - 检查: Vercel Dashboard → Settings → Root Directory

4. **构建失败**
   - 症状: 部署成功但路由不工作
   - 检查: Vercel 构建日志中的错误

5. **缓存问题**
   - 症状: 修复后仍然 404
   - 解决: 清除 CDN 缓存或等待缓存过期

---

## 🔄 替代方案

### 方案 A: 使用 API 路由 + 客户端重定向（当前方案）

**优点**:
- ✅ 服务器端验证（安全）
- ✅ HTTP-only cookie（防止 XSS）
- ✅ SEO 友好（服务器端重定向）

**缺点**:
- 需要页面路由和 API 路由

### 方案 B: 纯客户端验证（不推荐）

**实现**:
- 页面路由调用 API
- 客户端设置 cookie
- 客户端重定向

**缺点**:
- ❌ 安全性较低（token 暴露在客户端）
- ❌ 需要额外的客户端代码

### 方案 C: 使用中间件重定向（不推荐）

**实现**:
- API 路由验证
- 中间件检测并重定向

**缺点**:
- ❌ 复杂
- ❌ 难以处理错误情况

**推荐**: 方案 A（当前实现）

---

## 📋 检查清单

部署前检查：

- [ ] `app/auth/verify/page.tsx` 文件存在
- [ ] 文件已提交到 Git (`git status`)
- [ ] 已推送到 GitHub (`git push`)
- [ ] Vercel 检测到新部署
- [ ] 构建日志无错误
- [ ] 部署状态为 "Ready"

部署后验证：

- [ ] `/api/health` 返回正常
- [ ] `/auth/verify` 不再 404
- [ ] 有效 token 能正确验证
- [ ] 无效 token 重定向到登录页
- [ ] Cookie 正确设置

---

## 🚀 下一步

1. **等待 Vercel 部署完成**（1-2 分钟）
2. **测试 `/auth/verify` 路由**
3. **发送新的 magic link 测试完整流程**

如果仍然 404，检查：
- Vercel 部署日志
- GitHub 文件是否存在
- Root Directory 设置

---

## 📚 参考文档

- [Vercel NOT_FOUND 错误文档](https://vercel.com/docs/errors/NOT_FOUND)
- [Next.js App Router 路由](https://nextjs.org/docs/app/building-your-application/routing)
- [Next.js 重定向](https://nextjs.org/docs/app/api-reference/functions/redirect)

