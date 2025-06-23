import { Hono } from 'hono'
import { DatabaseService } from '../services/database'
import { AuthService } from '../services/auth'
import { InitPage, LoginPage, DashboardPage, ErrorPage } from '../components'

type Bindings = {
  DB: D1Database
  ENVIRONMENT: string
}

type Variables = {
  dbService: DatabaseService
  authService: AuthService
}

export const pageRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 静态资源服务
pageRoutes.get('/style.css', async (c) => {
  try {
    // 在生产环境中，从构建输出提供 CSS
    const css = `
      /* NodeSeeker 样式 */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f5f5f5;
      }
      
      .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      
      .card {
        background: white;
        border-radius: 8px;
        padding: 24px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        margin-bottom: 24px;
      }
      
      button {
        background: #007bff;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      
      button:hover {
        background: #0056b3;
      }
      
      input[type="text"], input[type="password"], textarea {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        margin-bottom: 16px;
      }
      
      .error {
        color: #dc3545;
        background: #f8d7da;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 16px;
      }
      
      .success {
        color: #155724;
        background: #d4edda;
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 16px;
      }
    `
    
    c.header('Content-Type', 'text/css')
    c.header('Cache-Control', 'public, max-age=31536000')
    return c.text(css)
  } catch (error) {
    return c.text('/* CSS loading error */', 500)
  }
})

// 服务 public 目录下的静态文件
pageRoutes.get('/public/*', async (c) => {
  const path = c.req.path.replace('/public/', '')
  
  // 简单的 favicon 处理
  if (path === 'favicon.ico') {
    // 返回一个简单的 favicon 或 404
    return c.notFound()
  }
  
  return c.notFound()
})

// 首页 - 根据初始化状态重定向
pageRoutes.get('/', async (c) => {
  try {
    const authService = c.get('authService')
    const initStatus = await authService.checkInitialization()
    
    if (initStatus.initialized) {
      return c.html(LoginPage())
    } else {
      return c.html(InitPage())
    }
  } catch (error) {
    return c.html(ErrorPage(`加载页面失败: ${error}`))
  }
})

// 初始化页面
pageRoutes.get('/init', async (c) => {
  try {
    const authService = c.get('authService')
    const initStatus = await authService.checkInitialization()
    
    if (initStatus.initialized) {
      return c.redirect('/')
    }
    
    return c.html(InitPage())
  } catch (error) {
    return c.html(ErrorPage(`加载初始化页面失败: ${error}`))
  }
})

// 登录页面
pageRoutes.get('/login', async (c) => {
  return c.html(LoginPage())
})

// 主页面
pageRoutes.get('/dashboard', async (c) => {
  return c.html(DashboardPage())
}) 