// 仪表板页面 JavaScript

let authToken = '';
let currentConfig = {};
let botInfo = null;
let userInfo = null;

// 文章列表相关变量
let currentPage = 1;
let isLoading = false;
let hasMorePosts = true;
let currentFilters = {};

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

    // Bot Token 设置表单
    document.getElementById('botTokenForm').addEventListener('submit', handleBotTokenSubmit);
    
    // 推送设置表单
    document.getElementById('pushSettingsForm').addEventListener('submit', handlePushSettingsSubmit);
    
    // 测试 Bot 连接
    document.getElementById('testBotBtn').addEventListener('click', testBotConnection);
    
    // 设置命令菜单
    document.getElementById('setCommandsBtn').addEventListener('click', setCommands);
    
    // 刷新状态
    document.getElementById('refreshInfoBtn').addEventListener('click', refreshBotInfo);
    
    // 解除用户绑定 - 使用事件委托
    document.addEventListener('click', function(e) {
        if (e.target.id === 'unbindUserBtn') {
            unbindUser();
        }
    });
    
    // 订阅管理
    document.getElementById('addSubForm').addEventListener('submit', handleAddSubscription);
    
    // 文章管理
    document.getElementById('refreshPostsBtn').addEventListener('click', () => loadPosts(true));
    document.getElementById('updateRssBtn').addEventListener('click', updateRSS);
    document.getElementById('cleanupPostsBtn').addEventListener('click', cleanupOldPosts);
    
    // 筛选功能
    document.getElementById('applyFiltersBtn').addEventListener('click', applyFilters);
    
    // 加载更多
    document.getElementById('loadMoreBtn').addEventListener('click', loadMorePosts);
    
    // 筛选输入框回车键触发
    document.getElementById('filterCreator').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            applyFilters();
        }
    });
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
            updateBotDisplay();
            updateBindingDisplay();
        } else {
            updateBotDisplay(false);
        }
    } catch (error) {
        console.error('加载 Bot 信息失败:', error);
        updateBotDisplay(false);
    }
}

// 更新 Bot 显示状态
function updateBotDisplay(hasBot = true) {
    const botTokenStatus = document.getElementById('botTokenStatus');
    const botInfoDisplay = document.getElementById('botInfoDisplay');
    const botStatusElement = document.getElementById('botStatus');
    const botDetailElement = document.getElementById('botDetail');
    const botStatusCard = document.getElementById('botStatusCard');
    
    if (hasBot && botInfo?.bot) {
        // 更新 Token 状态
        if (botTokenStatus) {
            botTokenStatus.textContent = '已配置';
            botTokenStatus.style.background = '#4caf50';
        }
        
        // 显示 Bot 信息
        if (botInfoDisplay) {
            botInfoDisplay.style.display = 'block';
            document.getElementById('botId').textContent = botInfo.bot.id;
            document.getElementById('botUsername').textContent = `@${botInfo.bot.username}`;
            document.getElementById('botName').textContent = botInfo.bot.first_name;
            
            // 更新命令菜单状态
            const commandsStatus = document.getElementById('commandsStatus');
            if (commandsStatus) {
                // 假设如果有bot信息就说明命令菜单已配置（在实际应用中可以通过API返回具体状态）
                commandsStatus.innerHTML = '<span style="color: #4caf50;">✅ 已创建</span>';
            }
        }
        
        // 更新状态卡片
        if (botStatusElement && botDetailElement) {
            botStatusElement.textContent = '在线';
            botStatusElement.style.color = '#10b981';
            botDetailElement.textContent = `@${botInfo.bot.first_name || 'Unknown'}`;
            if (botStatusCard) {
                botStatusCard.style.borderLeft = '4px solid #10b981';
            }
        }
    } else {
        // 未配置状态
        if (botTokenStatus) {
            botTokenStatus.textContent = '未配置';
            botTokenStatus.style.background = '#dc3545';
        }
        
        if (botInfoDisplay) {
            botInfoDisplay.style.display = 'none';
        }
        
        if (botStatusElement && botDetailElement) {
            botStatusElement.textContent = '离线';
            botStatusElement.style.color = '#ef4444';
            botDetailElement.textContent = '请配置 Bot Token';
            if (botStatusCard) {
                botStatusCard.style.borderLeft = '4px solid #ef4444';
            }
        }
    }
}

// 更新绑定显示状态
function updateBindingDisplay() {
    const bindingStatus = document.getElementById('bindingStatus');
    const bindingInstructions = document.getElementById('bindingInstructions');
    const boundUserInfo = document.getElementById('boundUserInfo');
    const boundUserElement = document.getElementById('boundUser');
    const userDetailElement = document.getElementById('userDetail');
    const userStatusCard = document.getElementById('userStatusCard');
    
    if (botInfo?.bound_user) {
        // 已绑定状态
        if (bindingStatus) {
            bindingStatus.textContent = '已绑定';
            bindingStatus.style.background = '#4caf50';
        }
        
        if (bindingInstructions) {
            bindingInstructions.style.display = 'none';
        }
        
        if (boundUserInfo) {
            boundUserInfo.style.display = 'block';
            document.getElementById('boundUserName').textContent = botInfo.bound_user.name;
            document.getElementById('boundUserUsername').textContent = 
                botInfo.bound_user.username ? `@${botInfo.bound_user.username}` : '无';
            document.getElementById('boundChatId').textContent = botInfo.bound_user.chat_id;
        }
        
        // 更新状态卡片
        if (boundUserElement && userDetailElement) {
            boundUserElement.textContent = '已绑定';
            boundUserElement.style.color = '#10b981';
            userDetailElement.textContent = botInfo.bound_user.display_name;
            if (userStatusCard) {
                userStatusCard.style.borderLeft = '4px solid #10b981';
            }
        }
    } else {
        // 未绑定状态
        if (bindingStatus) {
            bindingStatus.textContent = '未绑定';
            bindingStatus.style.background = '#dc3545';
        }
        
        // 显示绑定指引
        if (botInfo?.bot?.username && bindingInstructions) {
            bindingInstructions.style.display = 'block';
            const botUsernameLink = document.getElementById('botUsernameLink');
            if (botUsernameLink) {
                botUsernameLink.textContent = `@${botInfo.bot.username}`;
            }
        } else if (bindingInstructions) {
            bindingInstructions.style.display = 'none';
        }
        
        if (boundUserInfo) {
            boundUserInfo.style.display = 'none';
        }
        
        // 更新状态卡片
        if (boundUserElement && userDetailElement) {
            boundUserElement.textContent = '未绑定';
            boundUserElement.style.color = '#f59e0b';
            userDetailElement.textContent = botInfo?.bot?.username ? 
                `请向 @${botInfo.bot.username} 发送 /start` : 
                '请先配置 Bot Token';
            if (userStatusCard) {
                userStatusCard.style.borderLeft = '4px solid #f59e0b';
            }
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
        updateBindingDisplay();
        
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
            updateBindingDisplay();
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
    // 只填充推送设置表单
    document.getElementById('stopPush').checked = config.stop_push === 1;
    document.getElementById('onlyTitle').checked = config.only_title === 1;
}

// 处理 Bot Token 设置
async function handleBotTokenSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const botToken = formData.get('botToken');

    if (!botToken.trim()) {
        showMessage('请输入 Bot Token', 'error');
        return;
    }

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="btn-icon">⏳</span>验证中...';
    submitBtn.disabled = true;

    try {
        const response = await apiRequest('/api/telegram/setup-bot', 'POST', {
            bot_token: botToken
        });

        if (response.success) {
            showMessage(response.message, 'success');
            
            // 清空输入框
            e.target.reset();
            
            // 更新显示
            await loadBotInfo();
            
            // 如果有绑定指引，显示给用户
            if (response.data.binding_instructions) {
                const instructions = response.data.binding_instructions;
                const commandsInfo = response.data.commands_configured ? 
                    '命令菜单已创建，你可以在输入框中输入 "/" 或点击菜单按钮来选择命令。' : 
                    '';
                setTimeout(() => {
                    showMessage(
                        `Bot 设置成功！请在 Telegram 中搜索 ${instructions.bot_username || '你的 Bot'} 并发送 /start 完成绑定。${commandsInfo}`, 
                        'info', 
                        10000
                    );
                }, 1000);
            }
        } else {
            showMessage(response.message || 'Bot Token 设置失败', 'error');
        }
    } catch (error) {
        console.error('设置 Bot Token 失败:', error);
        showMessage('设置 Bot Token 失败', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// 处理推送设置
async function handlePushSettingsSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const stopPush = formData.get('stopPush') === 'on';
    const onlyTitle = formData.get('onlyTitle') === 'on';

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="btn-icon">⏳</span>保存中...';
    submitBtn.disabled = true;

    try {
        const response = await apiRequest('/api/telegram/push-settings', 'PUT', {
            stop_push: stopPush,
            only_title: onlyTitle
        });

        if (response.success) {
            showMessage(response.message, 'success');
            currentConfig.stop_push = stopPush ? 1 : 0;
            currentConfig.only_title = onlyTitle ? 1 : 0;
        } else {
            showMessage(response.message || '推送设置更新失败', 'error');
        }
    } catch (error) {
        console.error('更新推送设置失败:', error);
        showMessage('更新推送设置失败', 'error');
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
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
            // 将getme接口返回的数据转换为与info接口一致的结构
            botInfo = {
                bot: {
                    id: response.data.id,
                    username: response.data.username,
                    first_name: response.data.first_name,
                    is_bot: response.data.is_bot
                },
                bound_user: botInfo?.bound_user || null // 保持原有的绑定用户信息
            };
            updateBotDisplay(true);
            updateBindingDisplay(); // 同时更新绑定状态显示
        } else {
            showMessage(response.message || 'Bot 连接测试失败', 'error');
            updateBotDisplay(false);
            updateBindingDisplay(); // 失败时也更新绑定状态显示
        }
    } catch (error) {
        console.error('测试 Bot 连接失败:', error);
        showMessage('测试 Bot 连接失败', 'error');
        updateBotDisplay(false);
        updateBindingDisplay(); // 失败时也更新绑定状态显示
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
function showMessage(text, type = 'info', duration = 5000) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, duration);
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
                <div class="subscription-header">
                    <h4 class="subscription-title">订阅 #${sub.id}</h4>
                    <button class="subscription-delete-btn" onclick="deleteSubscription(${sub.id})">
                        🗑️ 删除
                    </button>
                </div>
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
async function loadPosts(reset = true) {
    if (isLoading) return;
    
    // 如果是重置加载，重置分页状态
    if (reset) {
        currentPage = 1;
        hasMorePosts = true;
        document.getElementById('postsList').innerHTML = '';
        document.getElementById('loadMoreContainer').style.display = 'none';
        document.getElementById('noMoreData').style.display = 'none';
        document.getElementById('postsInfo').style.display = 'none';
    }
    
    isLoading = true;
    
    try {
        // 构建查询参数
        const params = new URLSearchParams({
            page: currentPage.toString(),
            limit: '20'
        });
        
        // 添加筛选参数
        if (currentFilters.category) params.append('category', currentFilters.category);
        if (currentFilters.pushStatus !== undefined && currentFilters.pushStatus !== '') {
            params.append('push_status', currentFilters.pushStatus);
        }
        if (currentFilters.creator) params.append('creator', currentFilters.creator);
        
        const response = await apiRequest(`/api/posts?${params.toString()}`, 'GET');
        
        if (response.success) {
            const { data: posts, pagination } = response;
            
            if (reset) {
                renderPosts(posts, true);
                updatePostsInfo(pagination);
            } else {
                renderPosts(posts, false);
            }
            
            // 更新分页状态
            currentPage = pagination.page + 1;
            hasMorePosts = pagination.page < pagination.totalPages;
            
            // 更新加载更多按钮显示状态
            updateLoadMoreButton();
            
        } else {
            showMessage(response.message || '加载文章失败', 'error');
        }
    } catch (error) {
        console.error('加载文章失败:', error);
        showMessage('加载文章失败', 'error');
    } finally {
        isLoading = false;
    }
}

// 渲染文章列表
function renderPosts(posts, reset = true) {
    const container = document.getElementById('postsList');
    
    if (reset && posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>📰 暂无文章</h3>
                <p>没有找到符合条件的文章</p>
            </div>
        `;
        return;
    }
    
    // 如果是重置，清空容器
    if (reset) {
        container.innerHTML = '';
    }
    
    // 添加新的文章项
    const postsHtml = posts.map(post => {
        // 推送状态显示
        let pushStatusText = '';
        let pushStatusColor = '';
        switch (post.push_status) {
            case 0:
                pushStatusText = '⏳ 未推送';
                pushStatusColor = '#ff9800';
                break;
            case 1:
                pushStatusText = '✅ 已推送';
                pushStatusColor = '#4caf50';
                break;
            case 2:
                pushStatusText = '🚫 无需推送';
                pushStatusColor = '#9e9e9e';
                break;
        }
        
        return `
            <div class="post-item">
                <h4>
                    <a href="https://www.nodeseek.com/post-${post.post_id}-1" target="_blank" rel="noopener noreferrer">
                        ${post.title}
                    </a>
                </h4>
                <div class="meta">
                    <span>📅 ${new Date(post.pub_date).toLocaleString()}</span>
                    ${post.creator ? `<span>👤 ${post.creator}</span>` : ''}
                    ${post.category ? `<span>📂 ${getCategoryName(post.category)}</span>` : ''}
                    <span style="color: ${pushStatusColor}; font-weight: 500;">${pushStatusText}</span>
                </div>
                ${post.memo ? `
                    <div class="content">
                        ${post.memo}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    container.insertAdjacentHTML('beforeend', postsHtml);
}

// 获取分类显示名称
function getCategoryName(category) {
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
    return categoryMap[category] || category;
}

// 更新文章信息显示
function updatePostsInfo(pagination) {
    const infoDiv = document.getElementById('postsInfo');
    const infoText = document.getElementById('postsInfoText');
    
    if (pagination.total > 0) {
        let filterText = '';
        const activeFilters = [];
        
        if (currentFilters.category) {
            activeFilters.push(`分类: ${getCategoryName(currentFilters.category)}`);
        }
        if (currentFilters.pushStatus !== undefined && currentFilters.pushStatus !== '') {
            const statusMap = {
                '0': '未推送',
                '1': '已推送', 
                '2': '无需推送'
            };
            activeFilters.push(`推送状态: ${statusMap[currentFilters.pushStatus]}`);
        }
        if (currentFilters.creator) {
            activeFilters.push(`创建者: ${currentFilters.creator}`);
        }
        
        if (activeFilters.length > 0) {
            filterText = ` (筛选条件: ${activeFilters.join(', ')})`;
        }
        
        infoText.textContent = `共找到 ${pagination.total} 篇文章，当前显示第 1-${Math.min(pagination.page * pagination.limit, pagination.total)} 篇${filterText}`;
        infoDiv.style.display = 'block';
    } else {
        infoDiv.style.display = 'none';
    }
}

// 更新加载更多按钮状态
function updateLoadMoreButton() {
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const noMoreData = document.getElementById('noMoreData');
    
    if (hasMorePosts) {
        loadMoreContainer.style.display = 'block';
        noMoreData.style.display = 'none';
    } else {
        loadMoreContainer.style.display = 'none';
        if (currentPage > 1) { // 只有当已经加载了数据时才显示"已显示全部"
            noMoreData.style.display = 'block';
        }
    }
}

// 应用筛选条件
function applyFilters() {
    const category = document.getElementById('filterCategory').value;
    const pushStatus = document.getElementById('filterPushStatus').value;
    const creator = document.getElementById('filterCreator').value.trim();
    
    currentFilters = {
        category: category || undefined,
        pushStatus: pushStatus || undefined,
        creator: creator || undefined
    };
    
    // 重置分页并重新加载
    loadPosts(true);
}

// 加载更多文章
async function loadMorePosts() {
    if (!hasMorePosts || isLoading) return;
    
    const btn = document.getElementById('loadMoreBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-icon">⏳</span>加载中...';
    btn.disabled = true;
    
    try {
        await loadPosts(false);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
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
            <h3>活跃订阅数</h3>
            <div class="number">${stats.total_subscriptions || 0}</div>
        </div>
        <div class="stat-card">
            <h3>24小时文章数</h3>
            <div class="number">${stats.total_posts || 0}</div>
        </div>
        <div class="stat-card">
            <h3>24小时新增</h3>
            <div class="number">${stats.today_posts || 0}</div>
        </div>
        <div class="stat-card">
            <h3>24小时推送</h3>
            <div class="number">${stats.today_messages || 0}</div>
        </div>
    `;
}

// 刷新 Bot 信息
async function refreshBotInfo() {
    const btn = document.getElementById('refreshInfoBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-icon">⏳</span>刷新中...';
    btn.disabled = true;

    try {
        await loadBotInfo();
        await loadConfig();
        showMessage('状态信息已刷新', 'success');
    } catch (error) {
        console.error('刷新信息失败:', error);
        showMessage('刷新信息失败', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// 解除用户绑定
async function unbindUser() {
    if (!confirm('确定要解除用户绑定吗？\n\n解除绑定后，将无法接收 Telegram 推送消息。')) {
        return;
    }

    const btn = document.getElementById('unbindUserBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-icon">⏳</span>解绑中...';
    btn.disabled = true;

    try {
        const response = await apiRequest('/api/telegram/unbind', 'POST');
        
        if (response.success) {
            showMessage('用户绑定已成功解除', 'success');
            
            // 重新加载Bot信息以更新状态
            await loadBotInfo();
            
            // 更新配置信息
            if (currentConfig) {
                currentConfig.chat_id = '';
                currentConfig.bound_user_name = '';
                currentConfig.bound_user_username = '';
            }
        } else {
            showMessage(response.message || '解除用户绑定失败', 'error');
        }
    } catch (error) {
        console.error('解除用户绑定失败:', error);
        showMessage('解除用户绑定失败', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// 设置 Bot 命令菜单
async function setCommands() {
    const btn = document.getElementById('setCommandsBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-icon">⏳</span>设置中...';
    btn.disabled = true;

    try {
        const response = await apiRequest('/api/telegram/set-commands', 'POST');
        
        if (response.success) {
            showMessage(`命令菜单设置成功！Bot @${response.data.bot_username} 现在可以使用菜单选择命令了。`, 'success');
        } else {
            showMessage(response.message || '设置命令菜单失败', 'error');
        }
    } catch (error) {
        console.error('设置命令菜单失败:', error);
        showMessage('设置命令菜单失败', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// 清理旧数据
async function cleanupOldPosts() {
    if (!confirm('确定要清理 24 小时以外的旧数据吗？\n\n此操作不可撤销，将删除所有 24 小时以外的文章记录。')) {
        return;
    }

    const btn = document.getElementById('cleanupPostsBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="btn-icon">⏳</span>清理中...';
    btn.disabled = true;

    try {
        const response = await apiRequest('/api/posts/cleanup', 'POST');
        
        if (response.success) {
            showMessage(response.message || '数据清理完成', 'success');
            // 刷新文章列表以显示更新后的数据
            await loadPosts();
            // 刷新统计信息
            if (document.getElementById('stats').classList.contains('active')) {
                await loadStats();
            }
        } else {
            showMessage(response.message || '清理旧数据失败', 'error');
        }
    } catch (error) {
        console.error('清理旧数据失败:', error);
        showMessage('清理旧数据失败', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
