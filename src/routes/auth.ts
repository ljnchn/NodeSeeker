import { Hono } from 'hono'
import { AuthService } from '../services/auth'
import { DatabaseService } from '../services/database'

type Bindings = {
  DB: D1Database
  ENVIRONMENT: string
}

type Variables = {
  dbService: DatabaseService
  authService: AuthService
}

export const authRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 检查初始化状态
authRoutes.get('/check-init', async (c) => {
  try {
    const authService = c.get('authService')
    const result = await authService.checkInitialization()
    
    return c.json({
      success: true,
      data: result
    })
  } catch (error) {
    return c.json({
      success: false,
      message: `检查初始化状态失败: ${error}`
    }, 500)
  }
})

// 用户注册（初始化）
authRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const { username, password, confirmPassword } = body
    
    if (!username || !password || !confirmPassword) {
      return c.json({
        success: false,
        message: '请填写所有必填字段'
      }, 400)
    }
    
    const authService = c.get('authService')
    const result = await authService.register({
      username,
      password,
      confirmPassword
    })
    
    if (result.success) {
      return c.json(result)
    } else {
      return c.json(result, 400)
    }
  } catch (error) {
    return c.json({
      success: false,
      message: `注册失败: ${error}`
    }, 500)
  }
})

// 用户登录
authRoutes.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const { username, password } = body
    
    if (!username || !password) {
      return c.json({
        success: false,
        message: '请填写用户名和密码'
      }, 400)
    }
    
    const authService = c.get('authService')
    const result = await authService.login({
      username,
      password
    })
    
    if (result.success) {
      return c.json(result)
    } else {
      return c.json(result, 401)
    }
  } catch (error) {
    return c.json({
      success: false,
      message: `登录失败: ${error}`
    }, 500)
  }
})

// 验证token
authRoutes.post('/verify', async (c) => {
  try {
    const body = await c.req.json()
    const { token } = body
    
    if (!token) {
      return c.json({
        success: false,
        message: '请提供token'
      }, 400)
    }
    
    const authService = c.get('authService')
    const result = await authService.verifyToken(token)
    
    return c.json({
      success: result.valid,
      message: result.message || (result.valid ? 'Token有效' : 'Token无效'),
      data: result.payload
    })
  } catch (error) {
    return c.json({
      success: false,
      message: `验证失败: ${error}`
    }, 500)
  }
})

// 刷新token
authRoutes.post('/refresh', async (c) => {
  try {
    const body = await c.req.json()
    const { token } = body
    
    if (!token) {
      return c.json({
        success: false,
        message: '请提供token'
      }, 400)
    }
    
    const authService = c.get('authService')
    const result = await authService.refreshToken(token)
    
    if (result.success) {
      return c.json(result)
    } else {
      return c.json(result, 401)
    }
  } catch (error) {
    return c.json({
      success: false,
      message: `刷新token失败: ${error}`
    }, 500)
  }
})

// 修改密码
authRoutes.post('/change-password', async (c) => {
  try {
    const body = await c.req.json()
    const { token, oldPassword, newPassword } = body
    
    if (!token || !oldPassword || !newPassword) {
      return c.json({
        success: false,
        message: '请填写所有必填字段'
      }, 400)
    }
    
    const authService = c.get('authService')
    
    // 验证token
    const verification = await authService.verifyToken(token)
    if (!verification.valid || !verification.payload) {
      return c.json({
        success: false,
        message: verification.message || 'Token无效'
      }, 401)
    }
    
    // 修改密码
    const result = await authService.changePassword(
      verification.payload.username,
      oldPassword,
      newPassword
    )
    
    if (result.success) {
      return c.json(result)
    } else {
      return c.json(result, 400)
    }
  } catch (error) {
    return c.json({
      success: false,
      message: `修改密码失败: ${error}`
    }, 500)
  }
})
