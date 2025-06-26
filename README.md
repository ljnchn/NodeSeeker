# 🚀 NodeSeek RSS 监控系统

一个基于 Cloudflare Workers 的智能 RSS 监控和 Telegram 推送系统，专门用于监控 NodeSeek 社区的最新动态。

## ✨ 功能特性

- 🔄 **自动 RSS 抓取**：定时抓取 NodeSeek 社区 RSS 数据
- 🎯 **智能关键词匹配**：支持多关键词组合匹配，可设置创建者和分类过滤
- 📱 **Telegram Bot 推送**：实时推送匹配的文章到 Telegram
- 🌐 **Web 管理界面**：直观的 Web 界面管理订阅和配置
- ⚡ **高性能架构**：基于 Cloudflare Workers，全球边缘计算
- 🗄️ **D1 数据库**：使用 Cloudflare D1 数据库存储数据
- 🔐 **安全认证**：JWT 认证，密码加密存储
- 📊 **统计监控**：实时查看推送统计和系统状态

## 🏗️ 技术架构

- **平台**：Cloudflare Workers + Hono.js + Vite
- **数据库**：Cloudflare D1 (SQLite)
- **前端**：原生 HTML/CSS/JavaScript
- **认证**：JWT（密码明文存储）
- **推送**：Telegram Bot API
- **RSS 解析**：rss-parser

## 🚀 快速开始

### 前置要求

- Node.js 18+
- pnpm
- Cloudflare 账户
- Telegram Bot Token

### 1. 安装依赖

```bash
pnpm install
```

### 2. 本地开发

```bash
pnpm dev
```

### 3. 部署

```bash
# 自动部署（推荐）
pnpm run deploy:auto

# 或手动部署
pnpm run deploy
```

### 4. 类型生成

```bash
pnpm run cf-typegen
```

## 🛠️ 开发命令

```bash
# 开发
pnpm dev                 # 启动开发服务器
pnpm build              # 构建项目
pnpm test               # 运行测试

# 部署
pnpm run deploy:auto    # 自动部署脚本
pnpm run deploy         # 部署到开发环境
pnpm run deploy:prod    # 部署到生产环境

# 数据库
pnpm run db:create      # 创建数据库
pnpm run db:migrate     # 运行迁移

# 监控
pnpm run logs           # 查看日志
```

## 📖 详细文档

- [部署指南](deploy.md) - 完整的部署说明

## 🤖 Telegram Bot 设置

### 快速设置

1. **获取 Bot Token**
   - 在 Telegram 中搜索 `@BotFather`
   - 发送 `/newbot` 创建新的 Bot
   - 按提示设置 Bot 名称和用户名
   - 复制获得的 Bot Token

2. **配置 Bot Token**
   - 在系统仪表板的「基础设置」页面
   - 在「Bot Token 配置」区域输入 Token
   - 点击「保存并验证」按钮
   - 系统将自动验证 Token 有效性并设置 Webhook

3. **绑定用户**
   - Bot Token 配置成功后，会显示绑定指引
   - 在 Telegram 中搜索你的 Bot
   - 向 Bot 发送 `/start` 命令
   - 系统自动保存你的 Chat ID 完成绑定

4. **推送设置**
   - 在「推送设置」区域可以单独管理推送配置
   - **停止推送**：暂停所有消息推送
   - **只匹配标题**：仅在文章标题中搜索关键词

### Bot 功能

绑定成功后，你可以使用以下命令：

- `/start` - 重新绑定并查看欢迎信息
- `/getme` - 查看 Bot 和绑定状态信息
- `/unbind` - 解除用户绑定
- `/stop` - 停止推送
- `/resume` - 恢复推送
- `/list` - 查看订阅列表
- `/add 关键词1 关键词2` - 添加订阅（最多3个关键词）
- `/delete 订阅ID` - 删除订阅
- `/post` - 查看最近文章
- `/help` - 显示帮助信息

### 技术特性

- **自动 Webhook 设置**：Token 验证成功后自动配置 Webhook
- **智能绑定流程**：清晰的步骤指引和状态显示
- **分离式设置**：Bot 配置和推送设置独立管理
- **灵活的用户绑定**：支持绑定和解绑操作，可通过网页或Bot命令操作
- **实时状态监控**：仪表板实时显示 Bot 和绑定状态

## 📄 许可证

本项目基于 MIT 许可证开源。
