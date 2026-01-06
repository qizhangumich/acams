# 🔧 修复密码特殊字符问题

## 🎯 问题原因

**99% 的情况下，问题出在这里**：

如果你的密码包含特殊字符（如 `@`, `#`, `$`, `%`, `&`, `+`, `/`, `:`, `;`, `=`, `?`），Prisma 会误解析 URL。

### 典型错误示例

**❌ 错误的 URL**:
```
DATABASE_URL="postgresql://user:abc@123@localhost:5432/db"
```

**Prisma 解析为**:
- user = `user`
- password = `abc`
- host = `123@localhost` ❌（错误！）
- port = `5432` ❌（解析失败）

**✅ 正确的 URL**（密码 URL 编码后）:
```
DATABASE_URL="postgresql://user:abc%40123@localhost:5432/db"
```

**Prisma 解析为**:
- user = `user`
- password = `abc@123` ✅（正确！）
- host = `localhost` ✅
- port = `5432` ✅

---

## 🚀 快速修复（3 种方法）

### 方法 1: 使用自动修复脚本（推荐）

```bash
# 自动检测并修复 .env.local 中的 DATABASE_URL
npx tsx scripts/fix-database-url.ts
```

脚本会：
1. 读取 `.env.local` 文件
2. 检测密码中的特殊字符
3. 自动 URL 编码密码
4. 更新 `.env.local` 文件

### 方法 2: 交互式修复

```bash
# 交互式输入 DATABASE_URL
npx tsx scripts/fix-database-url.ts --interactive
```

会提示你输入 DATABASE_URL，然后输出编码后的版本。

### 方法 3: 手动编码

**特殊字符编码表**:

| 字符 | 编码 |
|------|------|
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |
| `/` | `%2F` |
| `:` | `%3A` |
| `;` | `%3B` |
| `=` | `%3D` |
| `?` | `%3F` |

**示例**:
- 密码: `p@ss#word`
- 编码后: `p%40ss%23word`
- 完整 URL: `postgresql://user:p%40ss%23word@host:5432/db?sslmode=require`

---

## 🔍 如何检查密码是否有特殊字符

运行检查脚本：

```bash
npx tsx scripts/check-env.ts
```

如果看到：
```
⚠️  Password may contain special characters
```

说明密码可能需要编码。

---

## 📋 完整修复步骤

### Step 1: 运行自动修复

```bash
npx tsx scripts/fix-database-url.ts
```

### Step 2: 验证修复

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

### Step 3: 测试数据库连接

```bash
npx tsx scripts/test-db-connection.ts
```

应该看到：
```
✅ Database connection successful!
```

### Step 4: 重启 Dev Server

```bash
# 停止当前服务器
Ctrl + C

# 重新启动
npm run dev
```

---

## 🧪 测试示例

**原始 URL**（有特殊字符）:
```
postgresql://user:pass@word@localhost:5432/db
```

**修复后**:
```
postgresql://user:pass%40word@localhost:5432/db
```

**验证**:
```bash
# 使用 Node.js 验证
node -e "console.log(require('url').parse('postgresql://user:pass%40word@localhost:5432/db'))"
```

---

## 💡 为什么会出现这个问题？

PostgreSQL 连接字符串格式：
```
postgresql://user:password@host:port/database
```

如果密码中包含 `@`，Prisma 会认为 `@` 是分隔符，导致：
- 密码被截断
- `@` 后面的内容被误认为是 host
- port 解析失败

**解决方案**: URL 编码密码，将特殊字符转换为 `%XX` 格式。

---

## ✅ 修复后验证清单

- [ ] 运行 `npx tsx scripts/fix-database-url.ts`
- [ ] 运行 `npx tsx scripts/check-env.ts` 验证格式
- [ ] 运行 `npx tsx scripts/test-db-connection.ts` 测试连接
- [ ] 重启 dev server
- [ ] 测试 `/api/auth/send-magic-link` API

---

**关键**: 如果密码包含 `@`、`#`、`$` 等特殊字符，必须进行 URL 编码！

