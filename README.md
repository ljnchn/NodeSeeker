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

- **平台**：Cloudflare Workers + Hono.js
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

## 重构说明

本项目已从 Vite 构建系统迁移到 esbuild，以获得更好的性能和更简洁的配置。

## 技术栈

- **后端框架**: Hono (轻量级 Web 框架)
- **运行时**: Cloudflare Workers
- **数据库**: Cloudflare D1 (SQLite)
- **构建工具**: esbuild (替代 Vite)
- **包管理器**: pnpm
- **语言**: TypeScript + JSX

## 开发

### 环境准备

```bash
# 安装依赖
pnpm install

# 配置数据库
pnpm run db:create
pnpm run db:migrate
```

### 开发模式

```bash
# 启动开发服务器 (使用 wrangler dev)
pnpm dev
```

开发模式直接运行 TypeScript 源码，无需预构建。

### 构建

```bash
# 构建生产版本
pnpm build
```

构建输出：
- `dist/index.js` - 主应用文件 (使用 esbuild 打包)
- `dist/style.css` - 样式文件
- `dist/public/` - 静态资源

### 部署

```bash
# 部署到开发环境
pnpm deploy

# 部署到生产环境  
pnpm run deploy:prod
```

## 构建系统变更

### 从 Vite 迁移到 esbuild

**之前 (Vite):**
- 使用 `vite.config.ts` 配置
- 依赖 `vite-ssr-components` 处理 SSR
- 开发时使用 Vite 开发服务器

**现在 (esbuild):**
- 使用 `scripts/build.js` 自定义构建脚本
- 原生的静态资源处理
- 开发时直接使用 `wrangler dev`
- 更快的构建速度和更小的输出文件

### 移除的依赖

- `vite`
- `@cloudflare/vite-plugin`  
- `vite-ssr-components`

### 新增的依赖

- `esbuild` - 快速的 JavaScript 打包器
- `typescript` - TypeScript 编译支持

## 项目结构

```
├── src/
│   ├── components/       # React 组件
│   ├── services/         # 业务逻辑服务
│   ├── routes/           # 路由处理
│   ├── middleware/       # 中间件
│   └── index.tsx         # 主入口文件
├── scripts/
│   ├── build.js          # 构建脚本 (新增)
│   └── deploy.js         # 部署脚本
├── dist/                 # 构建输出目录
├── wrangler.jsonc        # 生产环境配置
├── wrangler.dev.jsonc    # 开发环境配置 (新增)
└── tsconfig.json         # TypeScript 配置
```

## 脚本说明

- `pnpm dev` - 开发模式 (使用 wrangler.dev.jsonc)
- `pnpm build` - 构建项目 (使用 esbuild)
- `pnpm deploy` - 构建并部署到开发环境
- `pnpm run deploy:prod` - 构建并部署到生产环境

## 环境配置

- **开发环境**: 直接运行 `src/index.tsx`
- **生产环境**: 运行构建后的 `dist/index.js`

两个环境使用不同的 wrangler 配置文件以确保隔离。
