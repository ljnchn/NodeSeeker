# NodeSeek RSS 监控系统部署指南

## 前置要求

1. **Cloudflare 账户**：需要有 Cloudflare 账户
2. **Node.js**：版本 18 或更高
3. **pnpm**：包管理器
4. **Telegram Bot**：从 @BotFather 创建

## 部署步骤

### 1. 安装依赖

```bash
pnpm install
```

### 2. 创建 Cloudflare D1 数据库

```bash
# 创建数据库
npx wrangler d1 create nodeseeker-db

# 记录返回的 database_id，更新 wrangler.jsonc 中的 database_id
```

### 3. 更新配置文件

编辑 `wrangler.jsonc`，将 `database_id` 替换为实际的数据库 ID：

```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "nodeseeker-db",
      "database_id": "你的实际数据库ID"
    }
  ]
}
```

### 4. 初始化数据库

```bash
# 执行数据库迁移
npx wrangler d1 execute nodeseeker-db --file=./migrations/0001_initial.sql
```

### 5. 本地开发测试

```bash
# 启动本地开发服务器
pnpm dev

# 访问 http://localhost:8787
```

### 6. 部署到 Cloudflare Workers

```bash
# 构建并部署
pnpm deploy
```

## 配置说明

### 定时任务配置

在 `wrangler.jsonc` 中配置的 cron 表达式：
- `"0 */10 * * * *"`：每10分钟执行一次
- 可以根据需要调整频率

### 环境变量

- `ENVIRONMENT`：环境标识（development/production）

## 使用指南

### 1. 初始化系统

1. 访问部署后的域名
2. 首次访问会显示初始化页面
3. 设置管理员用户名和密码

### 2. 配置 Telegram Bot

1. 从 @BotFather 创建 Bot 并获取 Token
2. 在系统中配置 Bot Token
3. 设置 Webhook（系统会自动配置）
4. 向 Bot 发送 `/start` 命令绑定 Chat ID

### 3. 添加订阅

1. 在订阅管理页面添加关键词
2. 可以设置多个关键词（AND 关系）
3. 可以设置创建者和分类过滤

### 4. 监控和管理

- 查看最近文章和推送状态
- 手动更新 RSS
- 查看统计信息

## Telegram Bot 命令

- `/start` - 开始使用并保存用户信息
- `/stop` - 停止推送
- `/resume` - 恢复推送
- `/list` - 查看订阅列表
- `/add 关键词1 关键词2` - 添加订阅
- `/delete 订阅ID` - 删除订阅
- `/post` - 查看最近文章
- `/help` - 显示帮助信息

## 故障排除

### 1. 数据库连接问题

检查 `wrangler.jsonc` 中的数据库配置是否正确：

```bash
# 测试数据库连接
npx wrangler d1 execute nodeseeker-db --command="SELECT 1"
```

### 2. Telegram Bot 问题

1. 检查 Bot Token 是否正确
2. 确认 Webhook 设置成功
3. 检查 Chat ID 是否正确绑定

### 3. RSS 抓取问题

1. 检查网络连接
2. 确认 RSS 源是否可访问
3. 查看 Worker 日志

### 4. 定时任务问题

1. 确认 cron 表达式格式正确
2. 检查 Worker 日志
3. 验证系统配置完整性

## 监控和日志

### 查看 Worker 日志

```bash
npx wrangler tail
```

### 查看数据库内容

```bash
# 查看配置
npx wrangler d1 execute nodeseeker-db --command="SELECT * FROM base_config"

# 查看最近文章
npx wrangler d1 execute nodeseeker-db --command="SELECT * FROM posts ORDER BY created_at DESC LIMIT 10"

# 查看订阅
npx wrangler d1 execute nodeseeker-db --command="SELECT * FROM keywords_sub"
```

## 安全建议

1. **定期更改密码**：建议定期更改管理员密码
2. **保护 Bot Token**：不要在公开场所泄露 Bot Token
3. **监控访问日志**：定期检查访问日志
4. **备份数据**：定期备份数据库数据

## 性能优化

1. **调整抓取频率**：根据需要调整 cron 表达式
2. **限制文章数量**：可以在代码中调整保留的文章数量
3. **优化关键词匹配**：避免过于宽泛的关键词

## 更新和维护

### 更新代码

```bash
# 拉取最新代码
git pull

# 安装依赖
pnpm install

# 重新部署
pnpm deploy
```

### 数据库迁移

如果有新的数据库迁移文件：

```bash
npx wrangler d1 execute nodeseeker-db --file=./migrations/新的迁移文件.sql
```

## 技术支持

如果遇到问题，可以：

1. 检查 Worker 日志
2. 查看数据库状态
3. 验证配置文件
4. 测试网络连接

## 许可证

本项目基于 MIT 许可证开源。
