import { Hono } from 'hono'
import { DatabaseService } from '../services/database'
import { AuthService } from '../services/auth'
import { html } from 'hono/html'

type Bindings = {
  DB: D1Database
  ENVIRONMENT: string
}

type Variables = {
  dbService: DatabaseService
  authService: AuthService
}

export const pageRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 首页 - 根据初始化状态重定向
pageRoutes.get('/', async (c) => {
  try {
    const authService = c.get('authService')
    const initStatus = await authService.checkInitialization()
    
    if (initStatus.initialized) {
      return c.html(LoginPage())
    } else {
      return c.html(InitPage())
    }
  } catch (error) {
    return c.html(ErrorPage(`加载页面失败: ${error}`))
  }
})

// 初始化页面
pageRoutes.get('/init', async (c) => {
  try {
    const authService = c.get('authService')
    const initStatus = await authService.checkInitialization()
    
    if (initStatus.initialized) {
      return c.redirect('/')
    }
    
    return c.html(InitPage())
  } catch (error) {
    return c.html(ErrorPage(`加载初始化页面失败: ${error}`))
  }
})

// 登录页面
pageRoutes.get('/login', async (c) => {
  return c.html(LoginPage())
})

// 主页面
pageRoutes.get('/dashboard', async (c) => {
  return c.html(DashboardPage())
})

// 初始化页面组件
function InitPage() {
  return html`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>NodeSeek RSS 监控 - 初始化</title>
        <link href="/src/style.css" rel="stylesheet" />
      </head>
      <body>
        <div class="container">
          <div class="init-form">
            <h1>🚀 NodeSeek RSS 监控系统</h1>
            <p class="subtitle">首次使用需要初始化系统</p>
            
            <form id="initForm">
              <div class="form-group">
                <label for="username">用户名</label>
                <input 
                  type="text" 
                  id="username" 
                  name="username" 
                  required 
                  placeholder="请输入用户名（3-20个字符）"
                />
              </div>
              
              <div class="form-group">
                <label for="password">密码</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  required 
                  placeholder="请输入密码（至少6个字符）"
                />
              </div>
              
              <div class="form-group">
                <label for="confirmPassword">确认密码</label>
                <input 
                  type="password" 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  required 
                  placeholder="请再次输入密码"
                />
              </div>
              
              <button type="submit" class="btn btn-primary">
                初始化系统
              </button>
            </form>
            
            <div id="message" class="message"></div>
          </div>
        </div>
        
        <script src="/js/init.js"></script>
      </body>
    </html>
  `
}

// 登录页面组件
function LoginPage() {
  return html`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>NodeSeek RSS 监控 - 登录</title>
        <link href="/src/style.css" rel="stylesheet" />
      </head>
      <body>
        <div class="container">
          <div class="login-form">
            <h1>🔐 用户登录</h1>
            <p class="subtitle">NodeSeek RSS 监控系统</p>
            
            <form id="loginForm">
              <div class="form-group">
                <label for="username">用户名</label>
                <input 
                  type="text" 
                  id="username" 
                  name="username" 
                  required 
                  placeholder="请输入用户名"
                />
              </div>
              
              <div class="form-group">
                <label for="password">密码</label>
                <input 
                  type="password" 
                  id="password" 
                  name="password" 
                  required 
                  placeholder="请输入密码"
                />
              </div>
              
              <button type="submit" class="btn btn-primary">
                登录
              </button>
            </form>
            
            <div id="message" class="message"></div>
          </div>
        </div>
        
        <script src="/js/login.js"></script>
      </body>
    </html>
  `
}

// 主页面组件
function DashboardPage() {
  return html`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>NodeSeek RSS 监控 - 控制台</title>
        <link href="/src/style.css" rel="stylesheet" />
      </head>
      <body>
        <div class="dashboard">
          <header class="header">
            <h1>📡 NodeSeek RSS 监控控制台</h1>
            <div class="header-actions">
              <button id="logoutBtn" class="btn btn-secondary">退出登录</button>
            </div>
          </header>
          
          <nav class="nav-tabs">
            <button class="tab-btn active" data-tab="config">基础设置</button>
            <button class="tab-btn" data-tab="subscriptions">订阅管理</button>
            <button class="tab-btn" data-tab="posts">文章列表</button>
            <button class="tab-btn" data-tab="stats">统计信息</button>
          </nav>
          
          <main class="main-content">
            <div id="config" class="tab-content active">
              <div class="section">
                <h2>🤖 Telegram Bot 设置</h2>
                <form id="botConfigForm">
                  <div class="form-group">
                    <label for="botToken">Bot Token</label>
                    <input 
                      type="text" 
                      id="botToken" 
                      name="botToken" 
                      placeholder="请输入 Telegram Bot Token"
                    />
                    <small>从 @BotFather 获取</small>
                  </div>
                  
                  <div class="form-group">
                    <label for="chatId">Chat ID</label>
                    <input 
                      type="text" 
                      id="chatId" 
                      name="chatId" 
                      placeholder="Telegram Chat ID"
                      readonly
                    />
                    <small>发送 /start 给 Bot 自动获取</small>
                  </div>
                  
                  <div class="form-group">
                    <label>
                      <input type="checkbox" id="onlyTitle" name="onlyTitle" />
                      只匹配标题
                    </label>
                  </div>
                  
                  <div class="form-group">
                    <label>
                      <input type="checkbox" id="stopPush" name="stopPush" />
                      停止推送
                    </label>
                  </div>
                  
                  <div class="form-actions">
                    <button type="submit" class="btn btn-primary">保存设置</button>
                    <button type="button" id="testBotBtn" class="btn btn-secondary">测试连接</button>
                    <button type="button" id="setWebhookBtn" class="btn btn-secondary">设置 Webhook</button>
                  </div>
                </form>
              </div>
            </div>
            
            <div id="subscriptions" class="tab-content">
              <div class="section">
                <h2>📝 订阅管理</h2>
                <form id="addSubForm">
                  <div class="form-row">
                    <div class="form-group">
                      <label for="keyword1">关键词1 *</label>
                      <input type="text" id="keyword1" name="keyword1" required />
                    </div>
                    <div class="form-group">
                      <label for="keyword2">关键词2</label>
                      <input type="text" id="keyword2" name="keyword2" />
                    </div>
                    <div class="form-group">
                      <label for="keyword3">关键词3</label>
                      <input type="text" id="keyword3" name="keyword3" />
                    </div>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label for="creator">创建者过滤</label>
                      <input type="text" id="creator" name="creator" />
                    </div>
                    <div class="form-group">
                      <label for="category">分类过滤</label>
                      <input type="text" id="category" name="category" />
                    </div>
                  </div>
                  <button type="submit" class="btn btn-primary">添加订阅</button>
                </form>
                
                <div id="subscriptionsList" class="subscriptions-list">
                </div>
              </div>
            </div>
            
            <div id="posts" class="tab-content">
              <div class="section">
                <h2>📰 最近文章</h2>
                <div class="section-actions">
                  <button id="refreshPostsBtn" class="btn btn-secondary">刷新</button>
                  <button id="updateRssBtn" class="btn btn-primary">手动更新RSS</button>
                </div>
                <div id="postsList" class="posts-list">
                </div>
              </div>
            </div>
            
            <div id="stats" class="tab-content">
              <div class="section">
                <h2>📊 统计信息</h2>
                <div id="statsContent" class="stats-content">
                </div>
              </div>
            </div>
          </main>
        </div>
        
        <div id="message" class="message"></div>
        
        <script src="/js/dashboard.js"></script>
      </body>
    </html>
  `
}

// 错误页面组件
function ErrorPage(message: string) {
  return html`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>错误 - NodeSeek RSS 监控</title>
        <link href="/src/style.css" rel="stylesheet" />
      </head>
      <body>
        <div class="container">
          <div class="error-page">
            <h1>❌ 出现错误</h1>
            <p>${message}</p>
            <a href="/" class="btn btn-primary">返回首页</a>
          </div>
        </div>
      </body>
    </html>
  `
} 