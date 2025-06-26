import type { FC } from 'hono/jsx'

export const DashboardPage: FC = () => {
  return (
    <>
      <title>NodeSeek RSS 监控 - 控制台</title>
      <meta name="description" content="NodeSeek RSS 监控系统管理控制台" />
      <link href="/css/style.css" rel="stylesheet" />
      
      <style>
        {`
        .tab-btn {
          transition: all 0.2s ease;
        }
        .tab-btn.active {
          background: #2196f3 !important;
          color: white !important;
        }
        .tab-btn:not(.active) {
          background: #f5f5f5 !important;
          color: #666 !important;
        }
        .tab-btn:hover:not(.active) {
          background: #e8e8e8 !important;
          color: #333 !important;
        }
        .tab-content {
          display: none;
        }
        .tab-content.active {
          display: block !important;
        }
        .subscription-item, .post-item {
          background: white;
          padding: 20px;
          margin-bottom: 16px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          border-left: 4px solid #2196f3;
        }
        .subscription-item h4, .post-item h4 {
          margin-bottom: 12px;
          color: #333;
        }
        .keywords {
          background: #e3f2fd;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 14px;
          color: #1976d2;
          margin-bottom: 8px;
        }
        .filters {
          font-size: 12px;
          color: #666;
          margin-bottom: 12px;
        }
        .actions {
          display: flex;
          gap: 8px;
        }
                 .empty-state {
           text-align: center;
           padding: 60px 20px;
           color: #999;
         }
         .stat-card {
           background: white;
           padding: 24px;
           border-radius: 8px;
           box-shadow: 0 2px 4px rgba(0,0,0,0.1);
           text-align: center;
           border-left: 4px solid #4caf50;
         }
         .stat-card h3 {
           font-size: 14px;
           color: #666;
           margin-bottom: 12px;
           font-weight: 500;
         }
         .stat-card .number {
           font-size: 28px;
           font-weight: bold;
           color: #333;
         }
        `}
      </style>
      
      <div style="min-height: 100vh; background: #f5f5f5; padding: 20px;">
        <div style="max-width: 1200px; margin: 0 auto;">
          {/* 页面头部 */}
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div>
              <h1 style="font-size: 28px; font-weight: bold; color: #333; margin-bottom: 8px;">
                📡 NodeSeek RSS 监控控制台
              </h1>
              <p style="color: #666; font-size: 16px;">
                智能文章监控与推送系统
              </p>
            </div>
            <div style="display: flex; align-items: center; gap: 16px;">
              <span style="color: #666; font-size: 14px;">管理员已登录</span>
              <button id="logoutBtn" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">
                退出登录
              </button>
            </div>
          </div>

          {/* 消息提示区域 */}
          <div id="message" style="display: none; margin-bottom: 20px; padding: 12px; border-radius: 6px;"></div>

          {/* 状态卡片 */}
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div id="botStatusCard" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #999;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="font-size: 14px; color: #666; margin: 0;">Bot 状态</h3>
                <span style="font-size: 24px;">🤖</span>
              </div>
              <div style="font-size: 24px; font-weight: bold; color: #4caf50;" id="botStatus">检查中...</div>
              <p style="font-size: 12px; color: #999; margin: 4px 0 0 0;" id="botDetail">Telegram Bot 连接状态</p>
            </div>

            <div id="userStatusCard" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #999;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="font-size: 14px; color: #666; margin: 0;">绑定用户</h3>
                <span style="font-size: 24px;">👥</span>
              </div>
              <div style="font-size: 24px; font-weight: bold; color: #333;" id="boundUser">未绑定</div>
              <p style="font-size: 12px; color: #999; margin: 4px 0 0 0;" id="userDetail">当前绑定的 Telegram 用户</p>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="font-size: 14px; color: #666; margin: 0;">活跃订阅</h3>
                <span style="font-size: 24px;">📝</span>
              </div>
              <div style="font-size: 24px; font-weight: bold; color: #333;" id="activeSubscriptions">0</div>
              <p style="font-size: 12px; color: #999; margin: 4px 0 0 0;">正在监控的关键词订阅</p>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="font-size: 14px; color: #666; margin: 0;">24小时推送</h3>
                <span style="font-size: 24px;">📬</span>
              </div>
              <div style="font-size: 24px; font-weight: bold; color: #333;" id="todayMessages">0</div>
              <p style="font-size: 12px; color: #999; margin: 4px 0 0 0;">最近24小时发送的消息数量</p>
            </div>
          </div>

          {/* 标签页导航 */}
          <div style="background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="display: flex; border-bottom: 1px solid #eee;">
              <button class="tab-btn active" data-tab="config" style="padding: 16px 24px; border: none; background: #2196f3; color: white; cursor: pointer; font-size: 14px;">
                ⚙️ 基础设置
              </button>
              <button class="tab-btn" data-tab="subscriptions" style="padding: 16px 24px; border: none; background: #f5f5f5; color: #666; cursor: pointer; font-size: 14px;">
                📝 订阅管理
              </button>
              <button class="tab-btn" data-tab="posts" style="padding: 16px 24px; border: none; background: #f5f5f5; color: #666; cursor: pointer; font-size: 14px;">
                📰 文章列表
              </button>
              <button class="tab-btn" data-tab="stats" style="padding: 16px 24px; border: none; background: #f5f5f5; color: #666; cursor: pointer; font-size: 14px;">
                📊 统计信息
              </button>
            </div>

            {/* 基础设置内容 */}
            <div id="config" class="tab-content active" style="padding: 30px;">
              <h2 style="font-size: 20px; margin-bottom: 20px; color: #333;">🤖 Telegram Bot 设置</h2>
              
              <form id="botConfigForm" style="display: flex; flex-direction: column; gap: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <div>
                    <label for="botToken" style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">🔑 Bot Token</label>
                    <input 
                      type="password" 
                      id="botToken" 
                      name="botToken" 
                      placeholder="请输入 Telegram Bot Token"
                      style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"
                    />
                    <p style="font-size: 12px; color: #999; margin-top: 4px;">从 @BotFather 获取 Bot Token</p>
                  </div>
                  
                  <div>
                    <label for="chatId" style="display: block; margin-bottom: 8px; font-weight: 500; color: #333;">💬 Chat ID</label>
                    <input 
                      type="text" 
                      id="chatId" 
                      name="chatId" 
                      placeholder="Telegram Chat ID"
                      readonly
                      style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; background: #f9f9f9;"
                    />
                    <p style="font-size: 12px; color: #999; margin-top: 4px;">发送 /start 给 Bot 自动获取</p>
                  </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 16px;">
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="onlyTitle" name="onlyTitle" style="margin: 0;" />
                    <span style="font-size: 14px; color: #333;">只匹配标题</span>
                  </label>
                  
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" id="stopPush" name="stopPush" style="margin: 0;" />
                    <span style="font-size: 14px; color: #333;">停止推送</span>
                  </label>
                </div>
                
                <div style="display: flex; gap: 12px;">
                  <button type="submit" style="padding: 12px 24px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                    💾 保存设置
                  </button>
                  <button type="button" id="testBotBtn" style="padding: 12px 24px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                    🔍 测试连接
                  </button>
                  <button type="button" id="setWebhookBtn" style="padding: 12px 24px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
                    🔗 设置 Webhook
                  </button>
                </div>
              </form>
            </div>

            {/* 订阅管理内容 */}
            <div id="subscriptions" class="tab-content" style="padding: 30px; display: none;">
              <h2 style="font-size: 20px; margin-bottom: 20px; color: #333;">📝 订阅管理</h2>
              
              <form id="addSubForm" style="margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px;">
                <h3 style="font-size: 16px; margin-bottom: 16px; color: #333;">添加新订阅</h3>
                <p style="font-size: 14px; color: #666; margin-bottom: 16px;">
                  💡 提示：至少需要填写一个关键词，或者选择创建者/分类进行监控
                </p>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                  <div>
                    <label for="keyword1" style="display: block; margin-bottom: 6px; font-weight: 500; color: #333;">关键词1</label>
                    <input type="text" id="keyword1" name="keyword1" placeholder="输入关键词" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" />
                  </div>
                  <div>
                    <label for="keyword2" style="display: block; margin-bottom: 6px; font-weight: 500; color: #333;">关键词2</label>
                    <input type="text" id="keyword2" name="keyword2" placeholder="输入关键词" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" />
                  </div>
                  <div>
                    <label for="keyword3" style="display: block; margin-bottom: 6px; font-weight: 500; color: #333;">关键词3</label>
                    <input type="text" id="keyword3" name="keyword3" placeholder="输入关键词" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" />
                  </div>
                  <div>
                    <label for="creator" style="display: block; margin-bottom: 6px; font-weight: 500; color: #333;">创建者</label>
                    <input type="text" id="creator" name="creator" placeholder="用户名" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" />
                  </div>
                  <div>
                    <label for="category" style="display: block; margin-bottom: 6px; font-weight: 500; color: #333;">分类</label>
                    <select id="category" name="category" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background: white;">
                      <option value="">全部</option>
                      <option value="daily">📅 日常</option>
                      <option value="tech">💻 技术</option>
                      <option value="info">ℹ️ 情报</option>
                      <option value="review">⭐ 测评</option>
                      <option value="trade">💰 交易</option>
                      <option value="carpool">🚗 拼车</option>
                      <option value="promotion">📢 推广</option>
                      <option value="life">🏠 生活</option>
                      <option value="dev">⚡ Dev</option>
                      <option value="photo">📷 贴图</option>
                      <option value="expose">🚨 曝光</option>
                      <option value="sandbox">🏖️ 沙盒</option>
                    </select>
                  </div>
                </div>
                <button type="submit" style="margin-top: 16px; padding: 8px 16px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                  ➕ 添加订阅
                </button>
              </form>
              
              <div id="subscriptionsList" style="min-height: 200px;">
                <div style="text-align: center; padding: 60px 20px; color: #999;">
                  加载中...
                </div>
              </div>
            </div>

            {/* 文章列表内容 */}
            <div id="posts" class="tab-content" style="padding: 30px; display: none;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="font-size: 20px; color: #333; margin: 0;">📰 文章列表</h2>
                <div style="display: flex; gap: 12px;">
                  <button id="refreshPostsBtn" style="padding: 8px 16px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    🔄 刷新
                  </button>
                  <button id="updateRssBtn" style="padding: 8px 16px; background: #ff9800; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    📡 更新RSS
                  </button>
                </div>
              </div>
              
              <div id="postsList" style="min-height: 400px;">
                <div style="text-align: center; padding: 60px 20px; color: #999;">
                  加载中...
                </div>
              </div>
            </div>

            {/* 统计信息内容 */}
            <div id="stats" class="tab-content" style="padding: 30px; display: none;">
              <h2 style="font-size: 20px; margin-bottom: 20px; color: #333;">📊 统计信息</h2>
              <div id="statsContent" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; min-height: 300px;">
                <div style="text-align: center; padding: 60px 20px; color: #999; grid-column: 1 / -1;">
                  加载中...
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <script src="/js/dashboard.js"></script>
    </>
  )
} 