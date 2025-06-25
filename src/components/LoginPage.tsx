import type { FC } from 'hono/jsx'
import { PageLayout } from './Layout'

export const LoginPage: FC = () => {
  return (
    <PageLayout 
      title="NodeSeek RSS 监控 - 登录"
      description="NodeSeek RSS 监控系统用户登录页面"
      scriptSrc="/js/login.js"
    >
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
    </PageLayout>
  )
} 