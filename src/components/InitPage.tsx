import type { FC } from 'hono/jsx'
import { PageLayout } from './Layout'

export const InitPage: FC = () => {
  return (
    <PageLayout 
      title="NodeSeek RSS 监控 - 初始化"
      description="NodeSeek RSS 监控系统初始化设置页面"
      scriptSrc="/js/init.js"
    >
      <div class="init-form">
          <h1>🚀 NodeSeek RSS 监控系统</h1>
          <p class="subtitle">首次使用需要初始化系统</p>
          
          <form id="initForm">
            <div class="form-group">
              <label for="username">用户名</label>
              <input 
                type="text" 
                id="username" 
                name="username" 
                required 
                placeholder="请输入用户名（3-20个字符）"
              />
            </div>
            
            <div class="form-group">
              <label for="password">密码</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                required 
                placeholder="请输入密码（至少6个字符）"
              />
            </div>
            
            <div class="form-group">
              <label for="confirmPassword">确认密码</label>
              <input 
                type="password" 
                id="confirmPassword" 
                name="confirmPassword" 
                required 
                placeholder="请再次输入密码"
              />
            </div>
            
            <button type="submit" class="btn btn-primary">
              初始化系统
            </button>
          </form>
          
          <div id="message" class="message"></div>
        </div>
    </PageLayout>
  )
} 