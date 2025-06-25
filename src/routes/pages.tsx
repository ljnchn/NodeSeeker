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

// 首页 - 根据初始化状态重定向
pageRoutes.get('/', async (c) => {
  try {
    const authService = c.get('authService')
    const initStatus = await authService.checkInitialization()
    
    if (initStatus.initialized) {
      return c.render(<LoginPage />)
    } else {
      return c.render(<InitPage />)
    }
  } catch (error) {
    return c.render(<ErrorPage message={`加载页面失败: ${error}`} />)
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
    
    return c.render(<InitPage />)
  } catch (error) {
    return c.render(<ErrorPage message={`加载初始化页面失败: ${error}`} />)
  }
})

// 登录页面
pageRoutes.get('/login', async (c) => {
  return c.render(<LoginPage />)
})

// 主页面
pageRoutes.get('/dashboard', async (c) => {
  return c.render(<DashboardPage />)
}) 