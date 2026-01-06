# 📋 数据库迁移指南

## 🎯 当前步骤

你正在运行首次数据库迁移。Prisma 需要你输入一个迁移名称。

### 推荐迁移名称

输入以下名称之一：

```
init
```

或者：

```
initial_schema
```

---

## 📝 完整迁移步骤

### Step 1: 输入迁移名称

在终端中，当看到提示：
```
? Enter a name for the new migration: »
```

输入：
```
init
```

然后按 `Enter`。

---

### Step 2: 等待迁移完成

Prisma 会：
1. 创建迁移文件
2. 应用迁移到数据库
3. 生成 Prisma Client

你应该看到类似输出：
```
✅ Migration created successfully
✅ Database migrated successfully
✅ Prisma Client generated
```

---

### Step 3: 验证迁移

运行测试脚本验证数据库连接：

```bash
npx tsx scripts/test-db-connection.ts
```

应该看到：
```
✅ Database connection successful!
✅ User count: 0
✅ MagicLinkToken table exists!
```

---

## 🔄 后续迁移

如果将来需要修改 schema：

1. **修改 `prisma/schema.prisma`**

2. **创建新迁移**：
   ```bash
   npm run db:migrate
   ```
   输入描述性的迁移名称，例如：
   - `add_user_premium_field`
   - `update_question_schema`
   - `add_indexes`

3. **Prisma 会自动**：
   - 检测 schema 变化
   - 生成迁移 SQL
   - 应用到数据库
   - 更新 Prisma Client

---

## 🚨 常见问题

### Q: 迁移失败怎么办？

A: 检查：
1. `DATABASE_URL` 是否正确
2. 数据库是否可访问
3. 是否有权限创建表

### Q: 需要重置数据库吗？

A: 如果是开发环境且没有重要数据：
```bash
npx prisma migrate reset
```

这会：
- 删除所有数据
- 重新运行所有迁移
- 重新生成 Prisma Client

### Q: 如何查看迁移历史？

A:
```bash
npx prisma migrate status
```

---

## ✅ 迁移后的下一步

1. **验证数据库连接**：
   ```bash
   npx tsx scripts/test-db-connection.ts
   ```

2. **重启 dev server**：
   ```bash
   npm run dev
   ```

3. **测试应用**：
   - 访问 `http://localhost:3001/api/auth/send-magic-link`
   - 应该返回 200（不再是 500）

---

## 📚 相关命令

- `npm run db:migrate` - 创建并应用迁移
- `npm run db:generate` - 仅生成 Prisma Client（不迁移）
- `npm run db:studio` - 打开 Prisma Studio（数据库 GUI）
- `npx prisma migrate status` - 查看迁移状态
- `npx prisma migrate reset` - 重置数据库（开发环境）

