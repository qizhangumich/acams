# Vercel 部署问题修复指南

## 问题：No Next.js version detected

### 原因分析

Vercel 无法检测到 Next.js 版本，可能的原因：
1. `package.json` 中的 Next.js 版本格式问题
2. 缺少 `package-lock.json` 或 `yarn.lock`
3. Vercel 的 Root Directory 设置不正确
4. 构建脚本配置问题

### 解决方案

#### 方案 1: 更新 package.json（已修复）

已添加 `vercel-build` 脚本：

```json
{
  "scripts": {
    "vercel-build": "prisma generate && next build"
  }
}
```

#### 方案 2: 创建 vercel.json（已创建）

已创建 `vercel.json` 配置文件：

```json
{
  "buildCommand": "npm run vercel-build",
  "installCommand": "npm install",
  "framework": "nextjs",
  "rootDirectory": "."
}
```

#### 方案 3: 确保依赖正确安装

**本地测试**:
```bash
# 删除 node_modules 和 package-lock.json（如果存在）
rm -rf node_modules package-lock.json

# 重新安装
npm install

# 验证 Next.js 已安装
npm list next
```

**应该看到**:
```
acams-learning-system@0.1.0
└── next@14.0.0
```

#### 方案 4: 在 Vercel Dashboard 中检查设置

1. **Root Directory**
   - 进入 Vercel Project Settings
   - 找到 "Root Directory"
   - 确保设置为 `.` 或留空（如果项目在仓库根目录）

2. **Build Command**
   - 进入 "Build & Development Settings"
   - Build Command 应该设置为：`npm run vercel-build`
   - 或留空（使用 vercel.json 中的配置）

3. **Install Command**
   - Install Command 应该设置为：`npm install`
   - 或留空（使用默认）

#### 方案 5: 提交 package-lock.json

如果本地有 `package-lock.json`，确保提交到 Git：

```bash
# 如果存在但未提交
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

如果没有，生成并提交：

```bash
npm install
git add package-lock.json
git commit -m "Add package-lock.json for Vercel"
git push
```

---

## 完整修复步骤

### 1. 本地修复

```bash
# 1. 确保依赖已安装
npm install

# 2. 验证 Next.js 版本
npm list next

# 3. 生成 package-lock.json（如果不存在）
npm install --package-lock-only

# 4. 提交更改
git add package.json vercel.json package-lock.json
git commit -m "Fix Vercel build configuration"
git push
```

### 2. Vercel Dashboard 设置

1. 进入项目设置：https://vercel.com/dashboard
2. 选择你的项目
3. 进入 "Settings" → "General"
4. 检查以下设置：

   **Root Directory**: `.` 或留空

5. 进入 "Settings" → "Build & Development Settings"
6. 检查以下设置：

   **Framework Preset**: Next.js
   **Build Command**: 留空（使用 vercel.json）
   **Output Directory**: `.next`
   **Install Command**: 留空（使用默认 `npm install`）

### 3. 重新部署

1. 在 Vercel Dashboard 中
2. 进入 "Deployments"
3. 点击最新的部署
4. 点击 "Redeploy"
5. 或推送新的 commit 触发自动部署

---

## 验证修复

部署成功后，检查：

1. **构建日志**
   - 应该看到：`Installing dependencies...`
   - 应该看到：`Running "npm run vercel-build"`
   - 应该看到：`Generating Prisma Client...`
   - 应该看到：`Creating an optimized production build...`

2. **部署状态**
   - 应该显示：`Ready` 或 `Building`
   - 不应该有错误

---

## 如果仍然失败

### 检查清单

- [ ] `package.json` 中有 `"next": "^14.0.0"` 在 `dependencies` 中
- [ ] `vercel.json` 已创建并提交
- [ ] `package-lock.json` 已提交（如果存在）
- [ ] Vercel Root Directory 设置为 `.` 或留空
- [ ] 所有环境变量已设置
- [ ] 本地 `npm install` 成功

### 调试步骤

1. **查看构建日志**
   - 在 Vercel Dashboard → Deployments → 点击失败的部署
   - 查看完整的构建日志

2. **本地测试构建**
   ```bash
   npm run vercel-build
   ```
   如果本地失败，先修复本地问题

3. **检查 Vercel 设置**
   - 确保 Framework Preset 是 Next.js
   - 确保 Root Directory 正确

4. **联系支持**
   - 如果以上都正确但仍然失败
   - 在 Vercel Dashboard 中提交支持请求

---

## 常见错误及解决方案

### 错误 1: "Could not identify Next.js version"

**原因**: package.json 不在根目录，或 Root Directory 设置错误

**解决**: 
- 检查 Vercel Root Directory 设置
- 确保 package.json 在正确的位置

### 错误 2: "Module not found: Can't resolve 'next'"

**原因**: Next.js 未正确安装

**解决**:
- 确保 `npm install` 成功
- 检查 package-lock.json 是否存在
- 重新安装依赖

### 错误 3: "Prisma Client not generated"

**原因**: vercel-build 脚本未运行 prisma generate

**解决**: 
- 已修复：vercel-build 脚本包含 `prisma generate`
- 确保 DATABASE_URL 环境变量已设置

---

**修复完成后，重新部署应该可以成功！** ✅

