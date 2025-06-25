// 仪表板页面 JavaScript

let authToken = '';
let currentConfig = {};

document.addEventListener('DOMContentLoaded', function() {
    // 检查认证状态
    checkAuth();
    
    // 初始化事件监听器
    initEventListeners();
    
    // 加载初始数据
    loadInitialData();
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
    } catch (error) {
        console.error('认证验证失败:', error);
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
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
}

// 加载配置
async function loadConfig() {
    try {
        const response = await apiRequest('/api/config', 'GET');
        
        if (response.success) {
            currentConfig = response.data;
            populateConfigForm(response.data);
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
    const originalText = btn.textContent;
    btn.textContent = '测试中...';
    btn.disabled = true;

    try {
        const response = await apiRequest('/telegram/test', 'GET');
        
        if (response.success) {
            showMessage('Bot 连接测试成功', 'success');
        } else {
            showMessage(response.message || 'Bot 连接测试失败', 'error');
        }
    } catch (error) {
        console.error('测试 Bot 连接失败:', error);
        showMessage('测试 Bot 连接失败', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// 设置 Webhook
async function setWebhook() {
    if (!currentConfig.bot_token) {
        showMessage('请先配置 Bot Token', 'error');
        return;
    }

    const webhookUrl = `${window.location.origin}/telegram/webhook`;
    
    const btn = document.getElementById('setWebhookBtn');
    const originalText = btn.textContent;
    btn.textContent = '设置中...';
    btn.disabled = true;

    try {
        const response = await apiRequest('/api/telegram/webhook', 'POST', {
            bot_token: currentConfig.bot_token,
            webhook_url: webhookUrl
        });
        
        if (response.success) {
            showMessage(`Webhook 设置成功: ${webhookUrl}`, 'success');
        } else {
            showMessage(response.message || 'Webhook 设置失败', 'error');
        }
    } catch (error) {
        console.error('设置 Webhook 失败:', error);
        showMessage('设置 Webhook 失败', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// API 请求封装
async function apiRequest(url, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
        }
    };

    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    
    if (response.status === 401) {
        // Token 过期，重新登录
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
        return;
    }

    return await response.json();
}

// 显示消息
function showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';

    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
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
        container.innerHTML = '<p>暂无订阅</p>';
        return;
    }

    const html = subscriptions.map(sub => `
        <div class="subscription-item">
            <h4>订阅 #${sub.id}</h4>
            <div class="keywords">
                关键词: ${sub.keyword1}${sub.keyword2 ? ' + ' + sub.keyword2 : ''}${sub.keyword3 ? ' + ' + sub.keyword3 : ''}
            </div>
            <div class="filters">
                ${sub.creator ? `创建者: ${sub.creator} | ` : ''}
                ${sub.category ? `分类: ${sub.category} | ` : ''}
                创建时间: ${new Date(sub.created_at).toLocaleString('zh-CN')}
            </div>
            <div class="actions">
                <button class="btn btn-danger" onclick="deleteSubscription(${sub.id})">删除</button>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

// 处理添加订阅
async function handleAddSubscription(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = {
        keyword1: formData.get('keyword1'),
        keyword2: formData.get('keyword2'),
        keyword3: formData.get('keyword3'),
        creator: formData.get('creator'),
        category: formData.get('category')
    };

    if (!data.keyword1 || data.keyword1.trim().length === 0) {
        showMessage('请至少输入一个关键词', 'error');
        return;
    }

    try {
        const response = await apiRequest('/api/subscriptions', 'POST', data);

        if (response.success) {
            showMessage('订阅添加成功', 'success');
            e.target.reset(); // 清空表单
            loadSubscriptions(); // 重新加载列表
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
            loadSubscriptions(); // 重新加载列表
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
        const response = await apiRequest('/api/posts?limit=20', 'GET');

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
        container.innerHTML = '<p>暂无文章</p>';
        return;
    }

    const html = posts.map(post => {
        const statusText = post.push_status === 0 ? '⏳ 未推送' :
                          post.push_status === 1 ? '✅ 已推送' : '❌ 无需推送';
        const statusClass = post.push_status === 0 ? 'warning' :
                           post.push_status === 1 ? 'success' : 'secondary';

        return `
            <div class="post-item">
                <h4>${post.title}</h4>
                <div class="meta">
                    作者: ${post.creator} | 分类: ${post.category} |
                    发布时间: ${new Date(post.pub_date).toLocaleString('zh-CN')} |
                    <span class="status ${statusClass}">${statusText}</span>
                </div>
                <div class="content">
                    ${post.memo.substring(0, 200)}${post.memo.length > 200 ? '...' : ''}
                </div>
                <div class="actions">
                    <a href="https://www.nodeseek.com/post-${post.post_id}-1" target="_blank" class="btn btn-secondary">查看原文</a>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// 手动更新 RSS
async function updateRSS() {
    const btn = document.getElementById('updateRssBtn');
    const originalText = btn.textContent;
    btn.textContent = '更新中...';
    btn.disabled = true;

    try {
        const response = await apiRequest('/api/rss/update', 'POST');

        if (response.success) {
            showMessage(`RSS 更新成功: 新增 ${response.data.new} 篇文章`, 'success');
            loadPosts(); // 重新加载文章列表
        } else {
            showMessage(response.message || 'RSS 更新失败', 'error');
        }
    } catch (error) {
        console.error('RSS 更新失败:', error);
        showMessage('RSS 更新失败', 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// 加载统计信息
async function loadStats() {
    try {
        const response = await apiRequest('/api/stats', 'GET');

        if (response.success) {
            renderStats(response.data);
        } else {
            showMessage(response.message || '加载统计信息失败', 'error');
        }
    } catch (error) {
        console.error('加载统计信息失败:', error);
        showMessage('加载统计信息失败', 'error');
    }
}

// 渲染统计信息
function renderStats(stats) {
    const container = document.getElementById('statsContent');

    const html = `
        <div class="stat-card">
            <h3>总文章数</h3>
            <div class="number">${stats.totalPosts}</div>
        </div>
        <div class="stat-card">
            <h3>未推送</h3>
            <div class="number">${stats.unpushedPosts}</div>
        </div>
        <div class="stat-card">
            <h3>已推送</h3>
            <div class="number">${stats.pushedPosts}</div>
        </div>
        <div class="stat-card">
            <h3>无需推送</h3>
            <div class="number">${stats.skippedPosts}</div>
        </div>
        <div class="stat-card">
            <h3>订阅数量</h3>
            <div class="number">${stats.totalSubscriptions}</div>
        </div>
    `;

    container.innerHTML = html;
}
