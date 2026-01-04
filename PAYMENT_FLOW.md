# 支付流程说明 (Payment Flow Guide)

## 📋 完整流程步骤

### 第一步：用户首次进入网站

1. **访问首页** (`/`)
2. **输入邮箱**（可选，可以是任何邮箱或留空）
   - 例如：`your.email@example.com`
   - 或者：留空（系统会创建临时标识）
3. **点击 "Enter Question Bank"**
4. **进入问题页面** (`/questions`)
   - 可以免费使用基础功能
   - 进度保存在本地

### 第二步：用户决定订阅

1. **点击 "Subscribe" 按钮**
2. **跳转到订阅页面** (`/subscribe`)
3. **输入订阅邮箱**（必填）
   - ⚠️ **重要**：这个邮箱将成为你的付费账户身份
   - 可以使用与之前不同的邮箱
   - 例如：`your.email@example.com`
4. **点击 "Continue to Payment"**
5. **跳转到 Stripe 支付页面**
   - 邮箱已预填
   - 完成支付

### 第三步：支付成功后激活

1. **Stripe 重定向到** `/paid` 页面
2. **系统自动识别邮箱**：
   - 优先使用：你之前输入的邮箱（如果存在）
   - 其次使用：订阅页面输入的邮箱
   - 最后使用：URL 参数中的邮箱
3. **自动激活**（如果邮箱已存在）：
   - 显示 "🔄 Auto-activating... Using your email: xxx"
   - 自动调用激活 API
   - 将邮箱标记为 `is_paid = true`
4. **手动激活**（如果邮箱不存在）：
   - 显示邮箱输入框
   - 输入邮箱后点击 "Activate Access"
   - 系统激活账户

### 第四步：激活成功

1. **显示成功消息**："Access activated successfully!"
2. **自动重定向到** `/questions?activated=true`
3. **系统检查支付状态**：
   - 调用 `/api/subscription/check?email=xxx`
   - 如果 `is_paid = true`，显示 Premium 徽章
4. **显示 Premium 状态**：
   - Header 中显示 "✨ Premium" 徽章
   - AI 解释区域显示 "✨ Premium: Unlimited AI explanations"
   - Subscribe 按钮隐藏

### 第五步：重新登录

1. **关闭浏览器窗口**
2. **重新打开网站**
3. **输入相同的邮箱**（例如：`your.email@example.com`）
4. **系统自动检查**：
   - 调用 `/api/subscription/check?email=xxx`
   - 如果 `is_paid = true`，立即显示 Premium 状态
5. **享受 Premium 功能**：
   - 无限 AI 解释
   - 完整访问权限

## 🔍 关键点说明

### 邮箱识别优先级

在 `/paid` 页面，系统按以下优先级识别邮箱：

1. **用户之前输入的邮箱** (`localStorage.getItem('userEmail')`)
   - 如果存在且不是临时邮箱，**自动激活**
2. **URL 参数中的邮箱** (`?email=xxx`)
3. **订阅页面保存的邮箱** (`localStorage.getItem('subscriptionEmail')`)

### 自动激活条件

- ✅ 用户之前输入了邮箱（不是临时邮箱）
- ✅ 邮箱格式正确
- ✅ 支付成功并跳转到 `/paid` 页面

### 手动激活场景

- ❌ 用户之前没有输入邮箱
- ❌ 用户使用了临时邮箱（`temp_xxx`）
- ❌ 自动激活失败

### Premium 状态检查

系统在以下时机检查 Premium 状态：

1. **页面加载时**：检查当前邮箱的支付状态
2. **URL 参数变化时**：如果 `?activated=true`，重新检查
3. **每 2 秒轮询**：确保状态同步（激活后）

### 数据存储

- **本地存储** (`localStorage`):
  - `userEmail`: 用户当前使用的邮箱
  - `subscriptionEmail`: 订阅时输入的邮箱（临时）
  
- **服务器存储** (`subscription-data.json`):
  - `email`: 标准化后的邮箱（小写）
  - `is_paid`: 是否已付费（true/false）
  - `paid_at`: 付费时间戳

## 🐛 故障排查

### 问题：支付后没有显示 Premium

**检查步骤：**

1. **检查邮箱是否正确激活**
   - 打开浏览器控制台（F12）
   - 查看 Network 标签
   - 找到 `/api/payment/activate` 请求
   - 确认返回 `success: true`

2. **检查数据文件**
   - 查看 `subscription-data.json` 文件
   - 确认邮箱存在且 `is_paid: true`

3. **检查邮箱格式**
   - 确保邮箱已标准化（小写）
   - 例如：`Your.Email@Example.com` → `your.email@example.com`

4. **清除缓存重试**
   - 清除浏览器 localStorage
   - 重新输入邮箱并检查

### 问题：自动激活没有触发

**可能原因：**

1. 用户之前没有输入邮箱
2. 邮箱是临时邮箱（`temp_xxx`）
3. 页面加载时机问题

**解决方案：**

- 手动在 `/paid` 页面输入邮箱并点击 "Activate Access"

### 问题：重新登录后不是 Premium

**检查步骤：**

1. **确认邮箱一致**
   - 确保重新登录时使用相同的邮箱
   - 邮箱会自动标准化（小写）

2. **检查 API 响应**
   - 打开浏览器控制台
   - 查看 `/api/subscription/check` 请求
   - 确认返回 `is_paid: true`

3. **手动刷新**
   - 刷新页面
   - 系统会重新检查支付状态

## 📝 示例流程

### 场景 1：用户输入邮箱后支付

```
1. 用户输入：your.email@example.com
2. 进入问题页面
3. 点击 Subscribe
4. 在 /subscribe 输入：your.email@example.com（相同邮箱）
5. 完成支付
6. /paid 页面自动识别邮箱
7. 自动激活（因为邮箱已存在）
8. 显示 Premium 状态 ✅
```

### 场景 2：用户使用不同邮箱支付

```
1. 用户输入：old.email@example.com
2. 进入问题页面
3. 点击 Subscribe
4. 在 /subscribe 输入：new.email@example.com（不同邮箱）
5. 完成支付
6. /paid 页面使用 new.email@example.com
7. 自动激活（使用新邮箱）
8. 显示 Premium 状态 ✅
9. 注意：old.email@example.com 不是 Premium
```

### 场景 3：用户没有输入邮箱就支付

```
1. 用户留空邮箱（或使用临时邮箱）
2. 进入问题页面
3. 点击 Subscribe
4. 在 /subscribe 输入：your.email@example.com
5. 完成支付
6. /paid 页面显示邮箱输入框
7. 手动输入邮箱并激活
8. 显示 Premium 状态 ✅
```

## ✅ 验证清单

支付完成后，确认以下事项：

- [ ] `/paid` 页面显示成功消息
- [ ] 邮箱已正确保存到 `subscription-data.json`
- [ ] `is_paid: true` 已设置
- [ ] 重定向到 `/questions?activated=true`
- [ ] Header 显示 "✨ Premium" 徽章
- [ ] AI 解释区域显示 Premium 提示
- [ ] Subscribe 按钮已隐藏
- [ ] 重新登录后仍然显示 Premium

