# API 文档

NodeSeek RSS 监控系统 API 接口文档。

## 基础信息

- **Base URL**: `https://your-worker.workers.dev`
- **认证方式**: Bearer Token (JWT)
- **内容类型**: `application/json`

## 认证接口

### 检查初始化状态

```http
GET /auth/check-init
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "initialized": true,
    "message": "系统已初始化"
  }
}
```

### 用户注册（初始化）

```http
POST /auth/register
```

**请求体**:
```json
{
  "username": "admin",
  "password": "password123",
  "confirmPassword": "password123"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "注册成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "isInitialized": true
  }
}
```

### 用户登录

```http
POST /auth/login
```

**请求体**:
```json
{
  "username": "admin",
  "password": "password123"
}
```

**响应示例**:
```json
{
  "success": true,
  "message": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "username": "admin",
    "isInitialized": true
  }
}
```

### 验证 Token

```http
POST /auth/verify
```

**请求体**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## API 接口（需要认证）

所有 API 接口都需要在请求头中包含认证 Token：

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 配置管理

#### 获取配置

```http
GET /api/config
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "bot_token": "123456:ABC-DEF...",
    "chat_id": "123456789",
    "stop_push": 0,
    "only_title": 0,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

#### 更新配置

```http
PUT /api/config
```

**请求体**:
```json
{
  "bot_token": "123456:ABC-DEF...",
  "chat_id": "123456789",
  "stop_push": false,
  "only_title": false
}
```

### 订阅管理

#### 获取订阅列表

```http
GET /api/subscriptions
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "keyword1": "VPS",
      "keyword2": "优惠",
      "keyword3": null,
      "creator": null,
      "category": null,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 添加订阅

```http
POST /api/subscriptions
```

**请求体**:
```json
{
  "keyword1": "VPS",
  "keyword2": "优惠",
  "keyword3": "活动",
  "creator": "admin",
  "category": "优惠"
}
```

#### 更新订阅

```http
PUT /api/subscriptions/{id}
```

**请求体**:
```json
{
  "keyword1": "服务器",
  "keyword2": "折扣",
  "keyword3": null,
  "creator": null,
  "category": "优惠"
}
```

#### 删除订阅

```http
DELETE /api/subscriptions/{id}
```

### 文章管理

#### 获取文章列表

```http
GET /api/posts?limit=20
```

**查询参数**:
- `limit`: 返回文章数量，默认 20

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "post_id": 12345,
      "title": "VPS 优惠活动",
      "memo": "这是一个关于 VPS 的优惠活动...",
      "category": "优惠",
      "creator": "admin",
      "push_status": 1,
      "sub_id": 1,
      "pub_date": "2024-01-01T00:00:00.000Z",
      "push_date": "2024-01-01T00:01:00.000Z",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### RSS 管理

#### 手动更新 RSS

```http
POST /api/rss/update
```

**响应示例**:
```json
{
  "success": true,
  "message": "RSS 更新成功",
  "data": {
    "processed": 10,
    "new": 3,
    "errors": 0
  }
}
```

### 统计信息

#### 获取统计数据

```http
GET /api/stats
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalPosts": 100,
    "unpushedPosts": 5,
    "pushedPosts": 80,
    "skippedPosts": 15,
    "totalSubscriptions": 3
  }
}
```

### Telegram 管理

#### 获取 Bot 信息

```http
GET /api/telegram/bot-info
```

#### 设置 Webhook

```http
POST /api/telegram/webhook
```

**请求体**:
```json
{
  "bot_token": "123456:ABC-DEF...",
  "webhook_url": "https://your-worker.workers.dev/telegram/webhook"
}
```

## Telegram Bot 设置

### 设置 Bot Token（自动配置 Webhook）

```http
POST /api/telegram/setup-bot
```

**描述**: 设置 Bot Token，自动验证有效性并配置 Webhook

**请求体**:
```json
{
  "bot_token": "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
}
```

**响应**:
```json
{
  "success": true,
  "message": "Bot Token 设置成功，Webhook 已自动配置",
  "data": {
    "bot_info": {
      "id": 123456789,
      "username": "your_bot",
      "first_name": "Your Bot",
      "is_bot": true
    },
    "webhook_url": "https://your-worker.workers.dev/telegram/webhook",
    "binding_instructions": {
      "step1": "在 Telegram 中搜索并打开你的 Bot",
      "step2": "发送 /start 命令给 Bot",
      "step3": "Bot 将自动保存你的 Chat ID 完成绑定",
      "bot_username": "@your_bot"
    }
  }
}
```

### 更新推送设置

```http
PUT /api/telegram/push-settings
```

**描述**: 单独更新推送相关设置

**请求体**:
```json
{
  "stop_push": false,
  "only_title": true
}
```

**响应**:
```json
{
  "success": true,
  "message": "推送设置更新成功",
  "data": {
    "stop_push": false,
    "only_title": true
  }
}
```

### 获取 Bot 信息和绑定状态

```http
GET /api/telegram/info
```

**响应**:
```json
{
  "success": true,
  "message": "获取Bot信息成功",
  "data": {
    "bot": {
      "id": 123456789,
      "username": "your_bot",
      "first_name": "Your Bot",
      "is_bot": true
    },
    "bound_user": {
      "chat_id": "987654321",
      "name": "用户名",
      "username": "telegram_username",
      "display_name": "用户名 (@telegram_username)"
    },
    "webhook_status": {
      "auto_configured": true,
      "url": "https://your-worker.workers.dev/telegram/webhook"
    },
    "binding_instructions": null
  }
}
```

当用户未绑定时，`bound_user` 为 `null`，`binding_instructions` 包含绑定步骤。

### 解除用户绑定

```http
POST /api/telegram/unbind
```

**描述**: 解除当前绑定的 Telegram 用户

**响应**:
```json
{
  "success": true,
  "message": "用户绑定已成功解除",
  "data": {
    "unbound_user": {
      "name": "用户名",
      "username": "telegram_username",
      "chat_id": "987654321"
    }
  }
}
```

**当没有绑定用户时**:
```json
{
  "success": true,
  "message": "当前未绑定任何用户"
}
```

### 设置 Bot 命令菜单

```http
POST /api/telegram/set-commands
```

**描述**: 为 Bot 设置命令菜单，用户在 Telegram 中可以通过菜单选择命令

**响应**:
```json
{
  "success": true,
  "message": "Bot 命令菜单设置成功",
  "data": {
    "bot_username": "your_bot",
    "commands_count": 10
  }
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "请先配置Bot Token"
}
```

## Telegram Webhook

### 接收 Telegram 更新

```http
POST /telegram/webhook
```

这个接口用于接收 Telegram Bot 的更新消息，由 Telegram 服务器自动调用。

### 测试 Telegram 连接

```http
GET /telegram/test
```

### 发送测试消息

```http
POST /telegram/send-test
```

**请求体**:
```json
{
  "message": "这是一条测试消息"
}
```

## 错误响应

所有接口在出错时都会返回统一的错误格式：

```json
{
  "success": false,
  "message": "错误描述"
}
```

常见的 HTTP 状态码：

- `200`: 成功
- `400`: 请求参数错误
- `401`: 未授权（Token 无效或过期）
- `403`: 禁止访问
- `404`: 资源不存在
- `429`: 请求过于频繁
- `500`: 服务器内部错误

## 速率限制

- API 请求：每分钟最多 200 次
- Telegram 消息：每分钟最多 30 条

## 数据模型

### 用户配置 (BaseConfig)

```typescript
interface BaseConfig {
  id?: number;
  username: string;
  password: string;
  bot_token?: string;
  chat_id: string;
  stop_push: number; // 0: 启用, 1: 停用
  only_title: number; // 0: 匹配标题和内容, 1: 只匹配标题
  created_at?: string;
  updated_at?: string;
}
```

### 文章 (Post)

```typescript
interface Post {
  id?: number;
  post_id: number;
  title: string;
  memo: string;
  category: string;
  creator: string;
  push_status: number; // 0: 未推送, 1: 已推送, 2: 无需推送
  sub_id?: number;
  pub_date: string;
  push_date?: string;
  created_at?: string;
}
```

### 关键词订阅 (KeywordSub)

```typescript
interface KeywordSub {
  id?: number;
  keyword1: string;
  keyword2?: string;
  keyword3?: string;
  creator?: string;
  category?: string;
  created_at?: string;
  updated_at?: string;
}
```
