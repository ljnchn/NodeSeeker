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

## 🤖 Telegram Bot 命令

- `/start` - 开始使用并绑定 Chat ID
- `/stop` - 停止推送
- `/resume` - 恢复推送
- `/list` - 查看订阅列表
- `/add 关键词1 关键词2` - 添加订阅
- `/delete 订阅ID` - 删除订阅
- `/post` - 查看最近文章
- `/help` - 显示帮助信息

## 📄 许可证

本项目基于 MIT 许可证开源。
