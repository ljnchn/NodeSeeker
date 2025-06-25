import { html } from 'hono/html'

export function DashboardPage() {
  return html`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>NodeSeek RSS 监控 - 控制台</title>
        <link href="/client/css/style.css" rel="stylesheet" />
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
        
        <script src="/client/js/dashboard.js"></script>
      </body>
    </html>
  `
} 