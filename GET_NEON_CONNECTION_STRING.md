# 🔍 如何从 Neon 获取 Prisma 连接字符串

## ⚠️ 重要：Prisma 需要非池化连接

你当前看到的连接字符串包含 `-pooler`：
```
ep-little-sun-a4bvenrx-pooler.us-east-1.aws.neon.tech
```

**Prisma 不支持连接池化**，需要直接连接（没有 `-pooler`）。

---

## 📋 步骤 1: 重置密码（获取可见密码）

1. 在 "Connect to your database" 对话框中
2. 找到 **"Role"** 部分
3. 点击右侧的蓝色链接 **"Reset password"**
4. **复制新密码**（这是唯一能看到完整密码的机会）
5. 保存密码到安全的地方（临时记事本）

---

## 📋 步骤 2: 关闭连接池化（获取直接连接）

### 方法 A: 切换连接池化开关

1. 在对话框中找到 **"Connection pooling"** 开关
2. **关闭**它（切换为 off）
3. 连接字符串会自动更新，`-pooler` 会消失

### 方法 B: 查找 "Direct connection" 选项

1. 查看连接字符串上方的工具选择器（显示 "psql" 的地方）
2. 可能有一个下拉菜单，选择 **"Direct connection"** 或 **"Prisma"**
3. 如果没有，继续使用方法 A

---

## 📋 步骤 3: 获取完整连接字符串

关闭连接池化后，你应该看到类似这样的连接字符串：

```
postgresql://neondb_owner:YOUR_PASSWORD@ep-little-sun-a4bvenrx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

**注意**:
- ✅ 没有 `-pooler`（直接连接）
- ✅ 密码部分显示为 `****************`（需要替换为你刚才重置的密码）

---

## 📋 步骤 4: 构建完整连接字符串

### 如果密码已重置

1. 复制连接字符串（密码部分用 `YOUR_PASSWORD` 占位）
2. 将 `YOUR_PASSWORD` 替换为你在步骤 1 中重置的实际密码
3. 如果密码包含特殊字符（`@`, `#`, `$`, `%`, `&`, `+`, `/`, `:`, `;`, `=`, `?`），进行 URL 编码

### 如果密码包含特殊字符

运行自动编码脚本：
```bash
npx tsx scripts/fix-database-url.ts
```

或手动编码：
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `/` → `%2F`
- `:` → `%3A`
- `;` → `%3B`
- `=` → `%3D`
- `?` → `%3F`

---

## 📋 步骤 5: 更新 .env 文件

打开 `.env` 文件，找到：
```env
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

替换为：
```env
DATABASE_URL="postgresql://neondb_owner:YOUR_ACTUAL_PASSWORD@ep-little-sun-a4bvenrx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

**重要**:
- ✅ 使用引号包裹
- ✅ 使用**实际密码**（不是 `YOUR_ACTUAL_PASSWORD`）
- ✅ 确保没有 `-pooler`（直接连接）
- ✅ 如果密码有特殊字符，先 URL 编码

---

## 🎯 完整示例

假设：
- 用户名: `neondb_owner`
- 密码: `AbC123@xyz`（包含 `@`，需要编码为 `AbC123%40xyz`）
- Host: `ep-little-sun-a4bvenrx.us-east-1.aws.neon.tech`（没有 `-pooler`）
- 数据库: `neondb`

最终 `.env` 文件中的 `DATABASE_URL`：
```env
DATABASE_URL="postgresql://neondb_owner:AbC123%40xyz@ep-little-sun-a4bvenrx.us-east-1.aws.neon.tech/neondb?sslmode=require"
```

---

## ✅ 验证

更新后，运行：
```bash
npx tsx scripts/check-env.ts
```

应该看到：
```
✅ DATABASE_URL is SET
✅ Protocol: postgresql://
✅ Port found: 5432
✅ Port is numeric: 5432
✅ sslmode=require found
✅ URL format looks correct
```

然后重启 dev server：
```bash
npm run dev
```

---

## 🚨 常见问题

### Q: 连接字符串中密码显示为 `****************`，怎么办？

A: 点击 "Reset password" 获取新密码，然后手动替换连接字符串中的密码部分。

### Q: 找不到关闭连接池化的选项？

A: 尝试：
1. 查看连接字符串上方的工具选择器（"psql" 下拉菜单）
2. 查找 "Direct connection" 或 "Prisma" 选项
3. 或者直接手动移除连接字符串中的 `-pooler` 部分

### Q: 如何确认是直接连接还是池化连接？

A: 检查 hostname：
- ❌ 池化: `ep-xxx-xxx-pooler.xxx.neon.tech`（包含 `-pooler`）
- ✅ 直接: `ep-xxx-xxx.xxx.neon.tech`（没有 `-pooler`）

---

## 📝 快速检查清单

- [ ] 已重置密码并复制
- [ ] 已关闭连接池化（或选择直接连接）
- [ ] 连接字符串中没有 `-pooler`
- [ ] 已构建完整连接字符串（包含实际密码）
- [ ] 已更新 `.env` 文件
- [ ] 已运行 `npx tsx scripts/check-env.ts` 验证
- [ ] 已重启 dev server

