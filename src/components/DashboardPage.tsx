import type { FC } from 'hono/jsx'
import { Layout } from './Layout'

export const DashboardPage: FC = () => {
  return (
    <Layout 
      title="NodeSeek RSS 监控 - 控制台"
      description="NodeSeek RSS 监控系统管理控制台"
      scriptSrc="/js/dashboard.js"
    >
      <div class="dashboard">
        <header class="header">
          <div class="header-left">
            <h1>📡 NodeSeek RSS 监控控制台</h1>
            <div class="header-subtitle">智能文章监控与推送系统</div>
          </div>
          <div class="header-right">
            <div class="user-info" id="userInfo">
              <div class="user-avatar">👤</div>
              <div class="user-details">
                <div class="user-name">管理员</div>
                <div class="user-status online">在线</div>
              </div>
            </div>
            <button id="logoutBtn" class="btn btn-outline">退出登录</button>
          </div>
        </header>
        
        {/* Bot 状态信息卡片 */}
        <div class="status-banner">
          <div class="container">
            <div class="status-cards">
              <div class="status-card" id="botStatusCard">
                <div class="status-icon bot-icon">🤖</div>
                <div class="status-content">
                  <div class="status-title">Bot 状态</div>
                  <div class="status-value" id="botStatus">检查中...</div>
                  <div class="status-detail" id="botDetail">Telegram Bot 连接状态</div>
                </div>
              </div>
              <div class="status-card" id="userStatusCard">
                <div class="status-icon user-icon">👥</div>
                <div class="status-content">
                  <div class="status-title">绑定用户</div>
                  <div class="status-value" id="boundUser">未绑定</div>
                  <div class="status-detail" id="userDetail">当前绑定的 Telegram 用户</div>
                </div>
              </div>
              <div class="status-card" id="subscriptionStatusCard">
                <div class="status-icon sub-icon">📝</div>
                <div class="status-content">
                  <div class="status-title">活跃订阅</div>
                  <div class="status-value" id="activeSubscriptions">0</div>
                  <div class="status-detail">正在监控的关键词订阅</div>
                </div>
              </div>
              <div class="status-card" id="messageStatusCard">
                <div class="status-icon msg-icon">📬</div>
                <div class="status-content">
                  <div class="status-title">今日推送</div>
                  <div class="status-value" id="todayMessages">0</div>
                  <div class="status-detail">今天发送的消息数量</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <nav class="nav-tabs">
          <div class="container">
            <div class="tab-buttons">
              <button class="tab-btn active" data-tab="config">
                <span class="tab-icon">⚙️</span>
                <span class="tab-text">基础设置</span>
              </button>
              <button class="tab-btn" data-tab="subscriptions">
                <span class="tab-icon">📝</span>
                <span class="tab-text">订阅管理</span>
              </button>
              <button class="tab-btn" data-tab="posts">
                <span class="tab-icon">📰</span>
                <span class="tab-text">文章列表</span>
              </button>
              <button class="tab-btn" data-tab="stats">
                <span class="tab-icon">📊</span>
                <span class="tab-text">统计信息</span>
              </button>
            </div>
          </div>
        </nav>
        
        <main class="main-content">
          <div class="container">
            <div id="config" class="tab-content active">
              <div class="section modern-card">
                <div class="section-header">
                  <h2>🤖 Telegram Bot 设置</h2>
                  <div class="section-actions">
                    <button type="button" id="testBotBtn" class="btn btn-secondary">
                      <span class="btn-icon">🔍</span>
                      测试连接
                    </button>
                    <button type="button" id="setWebhookBtn" class="btn btn-secondary">
                      <span class="btn-icon">🔗</span>
                      设置 Webhook
                    </button>
                  </div>
                </div>
                
                <form id="botConfigForm">
                  <div class="form-grid">
                    <div class="form-group">
                      <label for="botToken">
                        <span class="label-icon">🔑</span>
                        Bot Token
                      </label>
                      <input 
                        type="password" 
                        id="botToken" 
                        name="botToken" 
                        placeholder="请输入 Telegram Bot Token"
                        class="form-input"
                      />
                      <small>从 @BotFather 获取 Bot Token</small>
                    </div>
                    
                    <div class="form-group">
                      <label for="chatId">
                        <span class="label-icon">💬</span>
                        Chat ID
                      </label>
                      <input 
                        type="text" 
                        id="chatId" 
                        name="chatId" 
                        placeholder="Telegram Chat ID"
                        class="form-input"
                        readonly
                      />
                      <small>发送 /start 给 Bot 自动获取</small>
                    </div>
                  </div>
                  
                  <div class="form-options">
                    <div class="option-group">
                      <label class="checkbox-label">
                        <input type="checkbox" id="onlyTitle" name="onlyTitle" />
                        <span class="checkbox-custom"></span>
                        <span class="checkbox-text">
                          <strong>只匹配标题</strong>
                          <small>仅在文章标题中搜索关键词</small>
                        </span>
                      </label>
                    </div>
                    
                    <div class="option-group">
                      <label class="checkbox-label">
                        <input type="checkbox" id="stopPush" name="stopPush" />
                        <span class="checkbox-custom"></span>
                        <span class="checkbox-text">
                          <strong>停止推送</strong>
                          <small>暂停所有文章推送通知</small>
                        </span>
                      </label>
                    </div>
                  </div>
                  
                  <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                      <span class="btn-icon">💾</span>
                      保存设置
                    </button>
                  </div>
                </form>
              </div>
            </div>
            
            <div id="subscriptions" class="tab-content">
              <div class="section modern-card">
                <div class="section-header">
                  <h2>📝 订阅管理</h2>
                  <div class="section-subtitle">配置关键词监控规则</div>
                </div>
                
                <form id="addSubForm" class="add-form">
                  <div class="form-grid-3">
                    <div class="form-group">
                      <label for="keyword1">
                        <span class="label-icon">🔍</span>
                        关键词1 <span class="required">*</span>
                      </label>
                      <input type="text" id="keyword1" name="keyword1" required class="form-input" />
                    </div>
                    <div class="form-group">
                      <label for="keyword2">
                        <span class="label-icon">🔍</span>
                        关键词2
                      </label>
                      <input type="text" id="keyword2" name="keyword2" class="form-input" />
                    </div>
                    <div class="form-group">
                      <label for="keyword3">
                        <span class="label-icon">🔍</span>
                        关键词3
                      </label>
                      <input type="text" id="keyword3" name="keyword3" class="form-input" />
                    </div>
                  </div>
                  
                  <div class="form-grid-2">
                    <div class="form-group">
                      <label for="creator">
                        <span class="label-icon">👤</span>
                        创建者过滤
                      </label>
                      <input type="text" id="creator" name="creator" class="form-input" />
                    </div>
                    <div class="form-group">
                      <label for="category">
                        <span class="label-icon">📂</span>
                        分类过滤
                      </label>
                      <input type="text" id="category" name="category" class="form-input" />
                    </div>
                  </div>
                  
                  <button type="submit" class="btn btn-primary">
                    <span class="btn-icon">➕</span>
                    添加订阅
                  </button>
                </form>
                
                <div id="subscriptionsList" class="subscriptions-list">
                </div>
              </div>
            </div>
            
            <div id="posts" class="tab-content">
              <div class="section modern-card">
                <div class="section-header">
                  <h2>📰 最近文章</h2>
                  <div class="section-actions">
                    <button id="refreshPostsBtn" class="btn btn-secondary">
                      <span class="btn-icon">🔄</span>
                      刷新
                    </button>
                    <button id="updateRssBtn" class="btn btn-primary">
                      <span class="btn-icon">📡</span>
                      手动更新RSS
                    </button>
                  </div>
                </div>
                
                <div id="postsList" class="posts-list">
                </div>
              </div>
            </div>
            
            <div id="stats" class="tab-content">
              <div class="section modern-card">
                <div class="section-header">
                  <h2>📊 统计信息</h2>
                  <div class="section-subtitle">系统运行状态概览</div>
                </div>
                
                <div id="statsContent" class="stats-content">
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      <div id="message" class="message"></div>
    </Layout>
  )
} 