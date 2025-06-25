// 初始化页面 JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const initForm = document.getElementById('initForm');
    const messageDiv = document.getElementById('message');

    // 表单提交处理
    initForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(initForm);
        const data = {
            username: formData.get('username'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        };

        // 基础验证
        if (!data.username || !data.password || !data.confirmPassword) {
            showMessage('请填写所有字段', 'error');
            return;
        }

        if (data.password !== data.confirmPassword) {
            showMessage('两次输入的密码不一致', 'error');
            return;
        }

        if (data.password.length < 6) {
            showMessage('密码长度至少6个字符', 'error');
            return;
        }

        if (data.username.length < 3 || data.username.length > 20) {
            showMessage('用户名长度必须在3-20个字符之间', 'error');
            return;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
            showMessage('用户名只能包含字母、数字和下划线', 'error');
            return;
        }

        // 显示加载状态
        const submitBtn = initForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '初始化中...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                showMessage('初始化成功！正在跳转...', 'success');
                
                // 保存 token
                if (result.token) {
                    localStorage.setItem('auth_token', result.token);
                }
                
                // 延迟跳转到仪表板
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } else {
                showMessage(result.message || '初始化失败', 'error');
            }
        } catch (error) {
            console.error('初始化请求失败:', error);
            showMessage('网络错误，请稍后重试', 'error');
        } finally {
            // 恢复按钮状态
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // 显示消息函数
    function showMessage(text, type = 'info') {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';
        
        // 3秒后自动隐藏
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }

    // 实时密码验证
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    confirmPasswordInput.addEventListener('input', function() {
        if (this.value && passwordInput.value && this.value !== passwordInput.value) {
            this.setCustomValidity('密码不一致');
        } else {
            this.setCustomValidity('');
        }
    });

    passwordInput.addEventListener('input', function() {
        if (confirmPasswordInput.value && this.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity('密码不一致');
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    });

    // 用户名验证
    const usernameInput = document.getElementById('username');
    usernameInput.addEventListener('input', function() {
        const value = this.value;
        if (value && !/^[a-zA-Z0-9_]+$/.test(value)) {
            this.setCustomValidity('用户名只能包含字母、数字和下划线');
        } else if (value && (value.length < 3 || value.length > 20)) {
            this.setCustomValidity('用户名长度必须在3-20个字符之间');
        } else {
            this.setCustomValidity('');
        }
    });
});
