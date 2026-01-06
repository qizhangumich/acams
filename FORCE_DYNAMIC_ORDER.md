# ⚠️ `export const dynamic = 'force-dynamic'` 顺序要求

## 🚨 关键细节：必须在所有 import 之前

### ❌ 错误顺序（可能不生效）

```typescript
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
// ... other imports

export const dynamic = 'force-dynamic'  // ❌ 在 import 之后，可能不生效
```

### ✅ 正确顺序（100% 生效）

```typescript
export const dynamic = 'force-dynamic'  // ✅ 必须在所有 import 之前

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
// ... other imports
```

---

## 🎯 为什么顺序很重要？

### Next.js 编译规则

Next.js 在编译时会：
1. **先处理** `export const dynamic` 等配置导出
2. **后处理** import 语句

如果 `export const dynamic` 在 import 之后：
- Next.js 可能已经完成了静态优化
- 配置可能被忽略
- 页面可能仍然被静态化 → 导致 404

---

## ✅ 当前文件状态

### `app/auth/verify/page.tsx`

```typescript
/**
 * GET /auth/verify
 * 
 * Magic link verification page
 * Verifies token and redirects to questions page
 */

export const dynamic = 'force-dynamic'  // ✅ 第一行（在所有 import 之前）

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyMagicLinkToken } from '@/lib/auth/magic-link'
import { generateSessionToken } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export default async function VerifyPage({...}) {
  // ... verification logic
}
```

**状态**: ✅ 顺序正确

---

## 📋 最佳实践

### 推荐的文件结构

```typescript
// 1. 配置导出（必须在最前面）
export const dynamic = 'force-dynamic'
export const revalidate = 0  // 如果需要
export const runtime = 'nodejs'  // 如果需要

// 2. 空行分隔

// 3. Import 语句
import { ... } from '...'

// 4. 空行分隔

// 5. 组件/函数代码
export default function Page() {
  // ...
}
```

---

## 🔍 验证方法

### 方法 1: 检查文件内容

```bash
head -n 15 app/auth/verify/page.tsx
```

**应该看到**:
```
export const dynamic = 'force-dynamic'
import ...
```

### 方法 2: 检查构建日志

```bash
npm run build
```

**应该看到**:
- 没有静态优化警告
- `/auth/verify` 被标记为动态路由

### 方法 3: 检查 Vercel 部署

在 Vercel Dashboard → Functions 中：
- `/auth/verify` 应该显示为 Serverless Function
- 不应该显示为 Static Page

---

## 🎯 关键要点

1. **`export const dynamic = 'force-dynamic'` 必须在所有 import 之前**
2. **注释可以放在前面**（不影响）
3. **空行可以放在中间**（不影响）
4. **但配置导出必须在 import 之前**

---

## ✅ 确认清单

- [x] `export const dynamic = 'force-dynamic'` 在所有 import 之前
- [x] 没有 import 语句在配置导出之前
- [x] 文件已提交到 Git
- [x] 已推送到 GitHub

---

## 🚀 下一步

1. **等待 Vercel 部署完成**
2. **测试验证链接**
3. **确认不再返回 404**

---

## 📚 相关文档

- [Next.js Dynamic Routes](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#dynamic)
- [Next.js Route Segment Config](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config)

