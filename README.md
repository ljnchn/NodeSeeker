# 🚀 NodeSeek RSS 监控系统

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ljnchn/NodeSeeker.git)

一个基于 Cloudflare Workers 的智能 RSS 监控和 Telegram 推送系统，专门用于监控 NodeSeek 社区的最新动态。

## ✨ 功能特性

- 🔄 **自动 RSS 抓取**：定时抓取 NodeSeek 社区 RSS 数据，确保信息不遗漏。
- 🎯 **智能关键词匹配**：支持多关键词组合匹配，可按创建者和分类进行精准过滤。
- 📱 **Telegram Bot 推送**：实时将匹配的文章推送到您的 Telegram，随时随地掌握动态。
- 🌐 **Web 管理界面**：提供直观的 Web 操作界面，轻松管理订阅规则和系统配置。
- ⚡ **高性能架构**：基于 Cloudflare Workers 构建，享受全球边缘网络的低延迟和高可用性。
- 🗄️ **D1 数据库**：使用 Cloudflare 原生 D1 数据库存储数据，稳定可靠。
- 🔐 **安全认证**：内置 JWT 认证和密码加密存储，保障您的账户安全。
- 📊 **统计监控**：实时查看推送统计和系统状态，全面了解系统运行状况。

## 🏗️ 技术架构

- **平台**：Cloudflare Workers + Hono.js + Vite
- **数据库**：Cloudflare D1 (SQLite)
- **前端**：原生 HTML/CSS/JavaScript
- **认证**：JWT (密码使用 BCrypt 加密)
- **推送**：Telegram Bot API
- **RSS 解析**：rss-parser

## 🚀 部署指南

我们提供两种部署方式：一键部署和手动部署。推荐使用一键部署，流程更简单。

### 方式一：一键部署 (推荐)

1. 点击上方的 [![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ljnchn/NodeSeeker.git) 按钮。
2. 授权 Cloudflare 访问您的 GitHub 仓库。
3. 按照提示完成部署流程，Cloudflare 将自动为您完成项目创建和配置。
4. 部署完成后，访问域名，系统会引导您创建一个管理员账户。
5. 登录后，在「基础设置」页面配置 Telegram Bot Token。
6. 配置完成后，在「推送设置」页面配置推送规则。

### 方式二：手动部署

#### 1. 前置要求

在开始之前，请确保您已安装以下工具和拥有相应账户：

- [Node.js](https://nodejs.org/) (版本 18 或更高)
- [pnpm](https://pnpm.io/)
- [Cloudflare 账户](https://dash.cloudflare.com/sign-up)
- [Telegram Bot Token](https://core.telegram.org/bots#6-botfather)

#### 2. 配置流程

1.  **克隆仓库**
    ```bash
    git clone https://github.com/ljnchn/NodeSeeker.git
    cd your-repo-name
    ```

2.  **安装依赖**
    ```bash
    pnpm install
    ```

3.  **创建 D1 数据库**
    执行以下命令创建一个名为 `nodeseek-rss` 的 D1 数据库。
    ```bash
    pnpm run db:create
    ```
    该命令会更新您的 `wrangler.toml` 文件，自动绑定数据库。


5.  **部署到 Cloudflare**
    ```bash
    # 部署到开发环境
    pnpm run deploy

    # 或部署到生产环境
    pnpm run deploy:prod
    ```

## 🛠️ 使用说明

部署成功后，您可以开始配置和使用系统。

### 1. 初始化系统

首次访问您的 Worker URL，系统会引导您创建一个管理员账户。请设置一个安全的密码，该密码将经过加密后存储。

### 2. Telegram Bot 设置

#### 快速设置

1.  **获取 Bot Token**
    - 在 Telegram 中搜索 `@BotFather`。
    - 发送 `/newbot` 创建一个新的 Bot。
    - 按照提示设置 Bot 的名称和用户名。
    - 复制并妥善保管您获得的 Bot Token。

2.  **配置 Bot Token**
    - 在系统 Web 界面的「基础设置」页面。
    - 在「Bot Token 配置」区域输入您的 Token。
    - 点击「保存并验证」。系统将自动验证 Token 的有效性、设置 Webhook 并创建 Bot 命令菜单。

3.  **绑定用户**
    - Bot Token 配置成功后，页面会显示绑定指引。
    - 在 Telegram 中搜索您的 Bot。
    - 向 Bot 发送 `/start` 命令。系统会自动保存您的 Chat ID，完成绑定。

4.  **推送设置**
    - 在「推送设置」区域，您可以管理消息推送。
    - **停止/恢复推送**：随时暂停或恢复所有消息推送。
    - **只匹配标题**：设置是否仅在文章标题中搜索关键词。

#### Bot 命令

绑定成功后，您可以在 Telegram 中使用以下命令与 Bot 交互：

- `/start` - 重新绑定并查看欢迎信息
- `/getme` - 查看 Bot 和绑定状态信息
- `/unbind` - 解除用户绑定
- `/stop` - 停止推送
- `/resume` - 恢复推送
- `/list` - 查看订阅列表
- `/add 关键词1 关键词2` - 添加订阅（最多3个关键词）
- `/del 订阅ID` - 删除订阅
- `/post` - 查看最近文章
- `/help` - 显示帮助信息

## 💻 本地开发

如果您希望在本地进行开发和测试：

1.  **启动开发服务器**
    ```bash
    pnpm dev
    ```
    此命令会启动一个本地服务器，并监听文件变化。

2.  **生成 Cloudflare 类型**
    为了获得完整的 TypeScript 类型提示，请运行：
    ```bash
    pnpm run cf-typegen
    ```

## 📜 开发命令

```bash
# 开发
pnpm dev                 # 启动开发服务器
pnpm build               # 构建项目
pnpm test                # 运行测试

# 部署
pnpm run deploy          # 部署到开发环境
pnpm run deploy:prod     # 部署到生产环境

# 数据库
pnpm run db:create       # 创建数据库
pnpm run db:migrate      # 运行数据库迁移

# 监控
pnpm run logs            # 查看线上日志
```

## 📄 许可证

本项目基于 MIT 许可证开源。
