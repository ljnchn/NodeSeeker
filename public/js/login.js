// 登录页面 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const messageDiv = document.getElementById('message');

    // 检查是否已经登录
    checkExistingAuth();

    // 表单提交处理
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(loginForm);
        const data = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        // 基础验证
        if (!data.username || !data.password) {
            showMessage('请填写用户名和密码', 'error');
            return;
        }

        // 显示加载状态
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '登录中...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                showMessage('登录成功！正在跳转...', 'success');
                
                // 保存 token
                if (result.token) {
                    localStorage.setItem('auth_token', result.token);
                }
                
                // 延迟跳转到仪表板
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1000);
            } else {
                showMessage(result.message || '登录失败', 'error');
            }
        } catch (error) {
            console.error('登录请求失败:', error);
            showMessage('网络错误，请稍后重试', 'error');
        } finally {
            // 恢复按钮状态
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // 检查现有认证状态
    async function checkExistingAuth() {
        const token = localStorage.getItem('auth_token');
        if (!token) return;

        try {
            const response = await fetch('/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            });

            const result = await response.json();

            if (result.success) {
                // Token 有效，直接跳转到仪表板
                window.location.href = '/dashboard';
            } else {
                // Token 无效，清除本地存储
                localStorage.removeItem('auth_token');
            }
        } catch (error) {
            console.error('验证 token 失败:', error);
            localStorage.removeItem('auth_token');
        }
    }

    // 显示消息函数
    function showMessage(text, type = 'info') {
        messageDiv.textContent = text;
        messageDiv.style.display = 'block';
        
        // 根据类型设置样式
        if (type === 'error') {
            messageDiv.style.backgroundColor = '#ffebee';
            messageDiv.style.color = '#c62828';
            messageDiv.style.border = '1px solid #ef5350';
        } else if (type === 'success') {
            messageDiv.style.backgroundColor = '#e8f5e8';
            messageDiv.style.color = '#2e7d32';
            messageDiv.style.border = '1px solid #66bb6a';
        } else {
            messageDiv.style.backgroundColor = '#e3f2fd';
            messageDiv.style.color = '#1976d2';
            messageDiv.style.border = '1px solid #42a5f5';
        }
        
        // 3秒后自动隐藏
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }

    // 回车键提交
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
});
