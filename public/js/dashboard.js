// 仪表板页面 JavaScript

let authToken = '';
let currentConfig = {};
let botInfo = null;
let userInfo = null;

document.addEventListener('DOMContentLoaded', function() {
    // 检查认证状态
    checkAuth();
    
    // 初始化事件监听器
    initEventListeners();
    
    // 加载初始数据
    loadInitialData();
    
    // 定期更新状态
    setInterval(updateStatus, 30000); // 每30秒更新一次状态
});

// 检查认证状态
async function checkAuth() {
    authToken = localStorage.getItem('auth_token');
    
    if (!authToken) {
        window.location.href = '/login';
        return;
    }

    try {
        const response = await fetch('/auth/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token: authToken })
        });

        const result = await response.json();

        if (!result.success) {
            localStorage.removeItem('auth_token');
            window.location.href = '/login';
            return;
        }
        
        // 更新用户信息
        if (result.user) {
            userInfo = result.user;
            updateUserInfo();
        }
    } catch (error) {
        console.error('认证验证失败:', error);
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
    }
}

// 更新用户信息显示
function updateUserInfo() {
    const userInfoElement = document.getElementById('userInfo');
    if (userInfoElement && userInfo) {
        const userNameElement = userInfoElement.querySelector('.user-name');
        const userStatusElement = userInfoElement.querySelector('.user-status');
        
        if (userNameElement) {
            userNameElement.textContent = userInfo.name || '管理员';
        }
        
        if (userStatusElement) {
            userStatusElement.textContent = '在线';
            userStatusElement.className = 'user-status online';
        }
    }
}

// 初始化事件监听器
function initEventListeners() {
    // 标签页切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });

    // 退出登录
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
    });

    // 基础配置表单
    document.getElementById('botConfigForm').addEventListener('submit', handleConfigSubmit);
    
    // 测试 Bot 连接
    document.getElementById('testBotBtn').addEventListener('click', testBotConnection);
    
    // 设置 Webhook
    document.getElementById('setWebhookBtn').addEventListener('click', setWebhook);
    
    // 订阅管理
    document.getElementById('addSubForm').addEventListener('submit', handleAddSubscription);
    
    // 文章管理
    document.getElementById('refreshPostsBtn').addEventListener('click', loadPosts);
    document.getElementById('updateRssBtn').addEventListener('click', updateRSS);
}

// 标签页切换
function switchTab(tabName) {
    // 更新标签按钮状态
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // 更新内容区域
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    // 根据标签页加载相应数据
    switch(tabName) {
        case 'config':
            loadConfig();
            break;
        case 'subscriptions':
            loadSubscriptions();
            break;
        case 'posts':
            loadPosts();
            break;
        case 'stats':
            loadStats();
            break;
    }
}

// 加载初始数据
async function loadInitialData() {
    await loadConfig();
    await loadBotInfo();
    await updateStatus();
}

// 加载 Bot 信息
async function loadBotInfo() {
    try {
        const response = await apiRequest('/api/telegram/info', 'GET');
        
        if (response.success) {
            botInfo = response.data;
            updateBotStatus();
        }
    } catch (error) {
        console.error('加载 Bot 信息失败:', error);
        updateBotStatus(false);
    }
}

// 更新 Bot 状态显示
function updateBotStatus(isOnline = true) {
    const botStatusElement = document.getElementById('botStatus');
    const botDetailElement = document.getElementById('botDetail');
    const botStatusCard = document.getElementById('botStatusCard');
    
    if (botStatusElement && botDetailElement) {
        if (isOnline && botInfo) {
            botStatusElement.textContent = '在线';
            botStatusElement.style.color = '#10b981';
            botDetailElement.textContent = `@${botInfo.bot.first_name || 'Unknown'}`;
            botStatusCard.style.borderLeft = '4px solid #10b981';
        } else {
            botStatusElement.textContent = '离线';
            botStatusElement.style.color = '#ef4444';
            botDetailElement.textContent = '请检查 Bot Token 配置';
            botStatusCard.style.borderLeft = '4px solid #ef4444';
        }
    }
}

// 更新绑定用户信息
function updateBoundUserInfo() {
    const boundUserElement = document.getElementById('boundUser');
    const userDetailElement = document.getElementById('userDetail');
    const userStatusCard = document.getElementById('userStatusCard');
    
    if (boundUserElement && userDetailElement) {
        if (currentConfig.chat_id) {
            boundUserElement.textContent = '已绑定';
            boundUserElement.style.color = '#10b981';
            userDetailElement.textContent = `Chat ID: ${currentConfig.chat_id}`;
            userStatusCard.style.borderLeft = '4px solid #10b981';
        } else {
            boundUserElement.textContent = '未绑定';
            boundUserElement.style.color = '#f59e0b';
            userDetailElement.textContent = '请发送 /start 给 Bot 进行绑定';
            userStatusCard.style.borderLeft = '4px solid #f59e0b';
        }
    }
}

// 更新状态信息
async function updateStatus() {
    try {
        // 更新订阅数量
        const subscriptionsResponse = await apiRequest('/api/subscriptions', 'GET');
        if (subscriptionsResponse.success) {
            const activeSubscriptions = document.getElementById('activeSubscriptions');
            if (activeSubscriptions) {
                activeSubscriptions.textContent = subscriptionsResponse.data.length;
            }
        }
        
        // 更新今日推送数量
        const statsResponse = await apiRequest('/api/stats/today', 'GET');
        if (statsResponse.success) {
            const todayMessages = document.getElementById('todayMessages');
            if (todayMessages) {
                todayMessages.textContent = statsResponse.data.messages || 0;
            }
        }
        
        // 更新绑定用户信息
        updateBoundUserInfo();
        
    } catch (error) {
        console.error('更新状态失败:', error);
    }
}

// 加载配置
async function loadConfig() {
    try {
        const response = await apiRequest('/api/config', 'GET');
        
        if (response.success) {
            currentConfig = response.data;
            populateConfigForm(response.data);
            updateBoundUserInfo();
        } else {
            showMessage(response.message || '加载配置失败', 'error');
        }
    } catch (error) {
        console.error('加载配置失败:', error);
        showMessage('加载配置失败', 'error');
    }
}

// 填充配置表单
function populateConfigForm(config) {
    document.getElementById('botToken').value = config.bot_token || '';
    document.getElementById('chatId').value = config.chat_id || '';
    document.getElementById('onlyTitle').checked = config.only_title === 1;
    document.getElementById('stopPush').checked = config.stop_push === 1;
}

// 处理配置提交
async function handleConfigSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        bot_token: formData.get('botToken'),
        chat_id: formData.get('chatId'),
        only_title: formData.get('onlyTitle') === 'on',
        stop_push: formData.get('stopPush') === 'on'
    };

    try {
        const response = await apiRequest('/api/config', 'PUT', data);
        
        if (response.success) {
            currentConfig = response.data;
            showMessage('配置保存成功', 'success');
            // 重新加载 Bot 信息
            await loadBotInfo();
            await updateStatus();
        } else {
            showMessage(response.message || '保存配置失败', 'error');
        }
    } catch (error) {
        console.error('保存配置失败:', error);
        showMessage('保存配置失败', 'error');
    }
}

// 测试 Bot 连接
async function testBotConnection() {
    if (!currentConfig.bot_token) {
        showMessage('请先配置 Bot Token', 'error');
        return;
    }

    const btn = document.getElementById('testBotBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-icon">⏳</span>测试中...';
    btn.disabled = true;

    try {
        const response = await apiRequest('/api/telegram/getme', 'GET');
        
        if (response.success) {
            showMessage('Bot 连接测试成功', 'success');
            botInfo = response.data;
            updateBotStatus(true);
        } else {
            showMessage(response.message || 'Bot 连接测试失败', 'error');
            updateBotStatus(false);
        }
    } catch (error) {
        console.error('测试 Bot 连接失败:', error);
        showMessage('测试 Bot 连接失败', 'error');
        updateBotStatus(false);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// 设置 Webhook
async function setWebhook() {
    if (!currentConfig.bot_token) {
        showMessage('请先配置 Bot Token', 'error');
        return;
    }

    const btn = document.getElementById('setWebhookBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-icon">⏳</span>设置中...';
    btn.disabled = true;

    try {
        const response = await apiRequest('/api/telegram/webhook', 'POST');
        
        if (response.success) {
            showMessage('Webhook 设置成功', 'success');
        } else {
            showMessage(response.message || 'Webhook 设置失败', 'error');
        }
    } catch (error) {
        console.error('设置 Webhook 失败:', error);
        showMessage('设置 Webhook 失败', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// API 请求封装
async function apiRequest(url, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

// 显示消息
function showMessage(text, type = 'info') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

// 加载订阅列表
async function loadSubscriptions() {
    try {
        const response = await apiRequest('/api/subscriptions', 'GET');
        
        if (response.success) {
            renderSubscriptions(response.data);
        } else {
            showMessage(response.message || '加载订阅失败', 'error');
        }
    } catch (error) {
        console.error('加载订阅失败:', error);
        showMessage('加载订阅失败', 'error');
    }
}

// 渲染订阅列表
function renderSubscriptions(subscriptions) {
    const container = document.getElementById('subscriptionsList');
    
    if (subscriptions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>🔍 还没有订阅</h3>
                <p>添加您的第一个关键词订阅来开始监控</p>
            </div>
        `;
        return;
    }
    
    // 分类映射表
    const categoryMap = {
        'daily': '📅 日常',
        'tech': '💻 技术',
        'info': 'ℹ️ 情报',
        'review': '⭐ 测评',
        'trade': '💰 交易',
        'carpool': '🚗 拼车',
        'promotion': '📢 推广',
        'life': '🏠 生活',
        'dev': '⚡ Dev',
        'photo': '📷 贴图',
        'expose': '🚨 曝光',
        'sandbox': '🏖️ 沙盒'
    };
    
    container.innerHTML = subscriptions.map(sub => {
        const keywords = [sub.keyword1, sub.keyword2, sub.keyword3].filter(k => k);
        const hasKeywords = keywords.length > 0;
        
        return `
            <div class="subscription-item">
                <h4>订阅 #${sub.id}</h4>
                ${hasKeywords ? `
                    <div class="keywords">
                        ${keywords.join(' + ')}
                    </div>
                ` : ''}
                <div class="filters">
                    ${sub.creator ? `<span>👤 创建者: ${sub.creator}</span>` : ''}
                    ${sub.category ? `<span>📂 分类: ${categoryMap[sub.category] || sub.category}</span>` : ''}
                    ${!hasKeywords && !sub.creator && !sub.category ? '<span style="color: #999;">无筛选条件</span>' : ''}
                </div>
                <div class="actions">
                    <button class="btn btn-danger" onclick="deleteSubscription(${sub.id})">
                        <span class="btn-icon">🗑️</span>
                        删除
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// 处理添加订阅
async function handleAddSubscription(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        keyword1: formData.get('keyword1')?.trim() || '',
        keyword2: formData.get('keyword2')?.trim() || '',
        keyword3: formData.get('keyword3')?.trim() || '',
        creator: formData.get('creator')?.trim() || '',
        category: formData.get('category') || ''
    };

    // 验证：至少需要一个关键词或者选择了创建者/分类
    const hasKeywords = data.keyword1 || data.keyword2 || data.keyword3;
    const hasCreatorOrCategory = data.creator || data.category;
    
    if (!hasKeywords && !hasCreatorOrCategory) {
        showMessage('请至少填写一个关键词，或者选择创建者/分类', 'error');
        return;
    }

    try {
        const response = await apiRequest('/api/subscriptions', 'POST', data);
        
        if (response.success) {
            showMessage('订阅添加成功', 'success');
            e.target.reset();
            loadSubscriptions();
            updateStatus(); // 更新状态
        } else {
            showMessage(response.message || '添加订阅失败', 'error');
        }
    } catch (error) {
        console.error('添加订阅失败:', error);
        showMessage('添加订阅失败', 'error');
    }
}

// 删除订阅
async function deleteSubscription(id) {
    if (!confirm('确定要删除这个订阅吗？')) {
        return;
    }

    try {
        const response = await apiRequest(`/api/subscriptions/${id}`, 'DELETE');
        
        if (response.success) {
            showMessage('订阅删除成功', 'success');
            loadSubscriptions();
            updateStatus(); // 更新状态
        } else {
            showMessage(response.message || '删除订阅失败', 'error');
        }
    } catch (error) {
        console.error('删除订阅失败:', error);
        showMessage('删除订阅失败', 'error');
    }
}

// 加载文章列表
async function loadPosts() {
    try {
        const response = await apiRequest('/api/posts', 'GET');
        
        if (response.success) {
            renderPosts(response.data);
        } else {
            showMessage(response.message || '加载文章失败', 'error');
        }
    } catch (error) {
        console.error('加载文章失败:', error);
        showMessage('加载文章失败', 'error');
    }
}

// 渲染文章列表
function renderPosts(posts) {
    const container = document.getElementById('postsList');
    
    if (posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>📰 暂无文章</h3>
                <p>还没有检测到匹配的文章</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = posts.map(post => `
        <div class="post-item">
            <h4>
                <a href="https://www.nodeseek.com/post-${post.post_id}-1" target="_blank" rel="noopener noreferrer">
                    ${post.title}
                </a>
            </h4>
            <div class="meta">
                <span>📅 ${new Date(post.pub_date).toLocaleString()}</span>
                ${post.creator ? `<span>👤 ${post.creator}</span>` : ''}
                ${post.category ? `<span>📂 ${post.category}</span>` : ''}
            </div>
            ${post.memo ? `
                <div class="content">
                    ${post.memo}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// 更新 RSS
async function updateRSS() {
    const btn = document.getElementById('updateRssBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-icon">⏳</span>更新中...';
    btn.disabled = true;

    try {
        const response = await apiRequest('/api/rss/update', 'POST');
        
        if (response.success) {
            showMessage('RSS 更新成功', 'success');
            loadPosts();
        } else {
            showMessage(response.message || 'RSS 更新失败', 'error');
        }
    } catch (error) {
        console.error('RSS 更新失败:', error);
        showMessage('RSS 更新失败', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// 加载统计信息（使用新的高效接口）
async function loadStats() {
    try {
        const response = await apiRequest('/api/stats/comprehensive', 'GET');
        
        if (response.success) {
            renderStats(response.data);
        } else {
            showMessage(response.message || '加载统计失败', 'error');
        }
    } catch (error) {
        console.error('加载统计失败:', error);
        showMessage('加载统计失败', 'error');
    }
}

// 渲染统计信息
function renderStats(stats) {
    const container = document.getElementById('statsContent');
    
    container.innerHTML = `
        <div class="stat-card">
            <h3>总订阅数</h3>
            <div class="number">${stats.total_subscriptions || 0}</div>
        </div>
        <div class="stat-card">
            <h3>总文章数</h3>
            <div class="number">${stats.total_posts || 0}</div>
        </div>
        <div class="stat-card">
            <h3>今日新增</h3>
            <div class="number">${stats.today_posts || 0}</div>
        </div>
        <div class="stat-card">
            <h3>推送消息</h3>
            <div class="number">${stats.total_messages || 0}</div>
        </div>
    `;
}
