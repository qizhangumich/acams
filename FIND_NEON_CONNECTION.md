# 🔍 如何在 Neon 中找到连接字符串

## 📍 当前位置

你现在在 **Dashboard** 页面。需要导航到 **Connection Details** 页面。

---

## 🎯 方法 1: 通过左侧导航栏（推荐）

### Step 1: 点击 "Settings"

1. 在左侧导航栏（PROJECT 部分）
2. 找到并点击 **"Settings"**
3. 进入设置页面

### Step 2: 找到 "Connection Details"

在 Settings 页面中，你应该能看到：
- **"Connection Details"** 或 **"Connection String"** 选项
- 点击它

### Step 3: 获取连接字符串

在 Connection Details 页面：
1. 找到 **"Connection String"** 标签
2. 选择 **"psql"** 或 **"Prisma"**（如果有）
3. 确保选择的是 **非池化连接**（Direct connection）

---

## 🎯 方法 2: 通过项目页面

### Step 1: 返回项目主页

1. 点击左侧导航栏顶部的项目名称（可能是 "cams"）
2. 或者点击 "Dashboard" 返回项目主页

### Step 2: 查找 "Connect" 按钮

在项目主页，你应该能看到：
- 一个大的 **"Connect"** 或 **"Connect to database"** 按钮
- 点击它

### Step 3: 打开连接对话框

这会打开连接对话框，显示连接字符串。

---

## 🎯 方法 3: 直接访问（最快）

如果你知道项目名称，可以直接访问：

```
https://console.neon.tech/app/[你的项目名]/connection-string
```

或者：

```
https://console.neon.tech/app/[你的项目名]/settings/connection-string
```

---

## 📋 在 Connection Details 页面应该看到什么

当你找到正确的页面后，应该看到：

### 配置选项：
- **Branch**: `main`（或你的分支名）
- **Compute**: `Primary` 或 `Idle`
- **Database**: `neondb`（或你的数据库名）
- **Role**: `neondb_owner`（或你的角色名）
- **Reset password** 链接

### 连接字符串选项：
- **工具选择器**: 下拉菜单，可能包含：
  - `psql`
  - `Prisma`
  - `Node.js`
  - `Python`
  - 等等

- **标签页**:
  - `connection string`（连接字符串）
  - `passwordless auth`（无密码认证）

### 连接池化选项：
- **Connection pooling** 开关（可能需要滚动查看）
- 或者有 "Direct connection" vs "Pooled connection" 的选择

---

## 🔧 如果没有看到连接池化选项

### 选项 A: 使用默认连接字符串（通常是非池化的）

1. 复制显示的连接字符串
2. 检查 hostname：
   - ✅ 如果**没有** `-pooler` → 这是直接连接，可以直接使用
   - ❌ 如果有 `-pooler` → 需要手动移除

### 选项 B: 手动构建连接字符串

如果你能看到以下信息：
- Host: `ep-xxx-xxx.us-east-1.aws.neon.tech`
- Database: `neondb`
- User: `neondb_owner`
- Password: （需要重置获取）

格式：
```
postgresql://用户名:密码@host/数据库名?sslmode=require
```

示例：
```
postgresql://neondb_owner:YOUR_PASSWORD@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

---

## 📝 快速检查清单

- [ ] 已导航到 Settings 页面
- [ ] 已找到 Connection Details 或 Connection String
- [ ] 已点击 "Reset password" 获取可见密码
- [ ] 已复制连接字符串（或手动构建）
- [ ] 已确认 hostname 中没有 `-pooler`（或已手动移除）
- [ ] 已更新 `.env` 文件
- [ ] 已运行 `npx tsx scripts/check-env.ts` 验证

---

## 🚨 如果仍然找不到

### 尝试这些步骤：

1. **检查 URL 路径**:
   - 当前 URL 应该类似：`https://console.neon.tech/app/[项目名]/...`
   - 尝试在 URL 末尾添加 `/settings` 或 `/connection-string`

2. **使用搜索功能**:
   - 在 Neon 控制台顶部可能有搜索框
   - 搜索 "connection" 或 "connect"

3. **查看项目概览**:
   - 返回项目主页（Dashboard）
   - 查找 "Quick start" 或 "Get started" 部分
   - 通常会有连接字符串的链接

4. **检查项目设置**:
   - 点击右上角的项目设置图标
   - 查找 "Database" 或 "Connection" 相关选项

---

## 💡 备用方案：从 Vercel 集成获取

如果你是通过 Vercel 集成的 Neon：

1. 在 Vercel Dashboard 中
2. 选择你的项目
3. 进入 **Settings** → **Environment Variables**
4. 查找 `DATABASE_URL`
5. 复制这个值（可能已经是正确的格式）

---

## 🎯 最终目标

你需要获取的格式：
```
postgresql://neondb_owner:实际密码@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**关键点**:
- ✅ 没有 `-pooler`（直接连接）
- ✅ 包含实际密码（不是 `****************`）
- ✅ 端口通常是 `5432`（Neon 默认，可能不显示在 URL 中）

---

如果你找到了 Connection Details 页面，告诉我你看到了什么，我可以帮你确认是否正确。

