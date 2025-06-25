import type { FC } from 'hono/jsx'

export const LoginPage: FC = () => {
  return (
    <>
      <title>NodeSeek RSS 监控 - 登录</title>
      <meta name="description" content="NodeSeek RSS 监控系统用户登录页面" />
      <link href="/css/style.css" rel="stylesheet" />
      
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 20px;">
        <div style="width: 100%; max-width: 400px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 32px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 8px; color: #1976d2;">
              🔐 用户登录
            </h1>
            <p style="color: #666; font-size: 14px;">
              NodeSeek RSS 监控系统
            </p>
          </div>
          
          <form id="loginForm" style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <label for="username" style="display: block; margin-bottom: 6px; font-weight: 500; color: #333;">用户名</label>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="请输入用户名"
                required
                style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; transition: border-color 0.2s;"
              />
            </div>
            
            <div>
              <label for="password" style="display: block; margin-bottom: 6px; font-weight: 500; color: #333;">密码</label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="请输入密码"
                required
                style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; transition: border-color 0.2s;"
              />
            </div>

            <button 
              type="submit" 
              style="width: 100%; padding: 12px; background: #1976d2; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 500; cursor: pointer; transition: background-color 0.2s;"
            >
              登录
            </button>
          </form>

          <div id="message" style="margin-top: 16px; padding: 12px; border-radius: 6px; display: none;"></div>
        </div>
      </div>
      
      <script src="/js/login.js"></script>
    </>
  )
} 