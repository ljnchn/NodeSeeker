import { html } from 'hono/html'

export function LoginPage() {
  return html`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>NodeSeek RSS 监控 - 登录</title>
        <link href="/css/style.css" rel="stylesheet" />
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