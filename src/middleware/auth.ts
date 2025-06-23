import { Context, Next } from 'hono'
import { AuthService } from '../services/auth'

/**
 * JWT 认证中间件
 */
export const jwtAuthMiddleware = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        success: false,
        message: '请提供有效的认证token'
      }, 401)
    }
    
    const token = authHeader.substring(7)
    const authService = c.get('authService') as AuthService
    
    if (!authService) {
      return c.json({
        success: false,
        message: '认证服务未初始化'
      }, 500)
    }
    
    const verification = await authService.verifyToken(token)
    if (!verification.valid) {
      return c.json({
        success: false,
        message: verification.message || 'Token无效'
      }, 401)
    }
    
    // 将用户信息存储到上下文中
    c.set('jwtPayload', verification.payload)
    c.set('currentUser', verification.payload?.username)
    
    await next()
  } catch (error) {
    console.error('JWT认证中间件错误:', error)
    return c.json({
      success: false,
      message: '认证过程中发生错误'
    }, 500)
  }
}

/**
 * 可选的 JWT 认证中间件（不强制要求认证）
 */
export const optionalJwtAuthMiddleware = async (c: Context, next: Next) => {
  try {
    const authHeader = c.req.header('Authorization')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const authService = c.get('authService') as AuthService
      
      if (authService) {
        const verification = await authService.verifyToken(token)
        if (verification.valid) {
          c.set('jwtPayload', verification.payload)
          c.set('currentUser', verification.payload?.username)
        }
      }
    }
    
    await next()
  } catch (error) {
    console.error('可选JWT认证中间件错误:', error)
    // 不阻止请求继续，只是不设置用户信息
    await next()
  }
}

/**
 * 管理员权限检查中间件
 */
export const adminAuthMiddleware = async (c: Context, next: Next) => {
  try {
    const currentUser = c.get('currentUser')
    
    if (!currentUser) {
      return c.json({
        success: false,
        message: '需要管理员权限'
      }, 403)
    }
    
    // 在这个简单的系统中，只有一个用户，所以任何认证用户都是管理员
    // 在更复杂的系统中，这里可以检查用户角色
    
    await next()
  } catch (error) {
    console.error('管理员权限检查错误:', error)
    return c.json({
      success: false,
      message: '权限检查过程中发生错误'
    }, 500)
  }
}

/**
 * 请求日志中间件
 */
export const requestLoggerMiddleware = async (c: Context, next: Next) => {
  const start = Date.now()
  const method = c.req.method
  const url = c.req.url
  const userAgent = c.req.header('User-Agent') || 'Unknown'
  const ip = c.req.header('CF-Connecting-IP') || 
             c.req.header('X-Forwarded-For') || 
             c.req.header('X-Real-IP') || 
             'Unknown'

  console.log(`[${new Date().toISOString()}] ${method} ${url} - IP: ${ip} - UA: ${userAgent}`)

  await next()

  const duration = Date.now() - start
  const status = c.res.status
  
  console.log(`[${new Date().toISOString()}] ${method} ${url} - ${status} - ${duration}ms`)
}

/**
 * 错误处理中间件
 */
export const errorHandlerMiddleware = async (c: Context, next: Next) => {
  try {
    await next()
  } catch (error) {
    console.error('请求处理错误:', error)
    
    // 根据错误类型返回不同的响应
    if (error instanceof Error) {
      // 检查是否是已知的错误类型
      if (error.message.includes('Unauthorized')) {
        return c.json({
          success: false,
          message: '未授权访问'
        }, 401)
      }
      
      if (error.message.includes('Forbidden')) {
        return c.json({
          success: false,
          message: '禁止访问'
        }, 403)
      }
      
      if (error.message.includes('Not Found')) {
        return c.json({
          success: false,
          message: '资源不存在'
        }, 404)
      }
      
      if (error.message.includes('Validation')) {
        return c.json({
          success: false,
          message: '数据验证失败'
        }, 400)
      }
    }
    
    // 默认服务器错误
    return c.json({
      success: false,
      message: '服务器内部错误'
    }, 500)
  }
}

/**
 * CORS 中间件配置
 */
export const corsConfig = {
  origin: ['http://localhost:3000', 'https://*.workers.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
  credentials: true
}

/**
 * 速率限制中间件（简单实现）
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export const rateLimitMiddleware = (maxRequests: number = 100, windowMs: number = 60000) => {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('CF-Connecting-IP') || 
               c.req.header('X-Forwarded-For') || 
               c.req.header('X-Real-IP') || 
               'unknown'
    
    const now = Date.now()
    const key = `rate_limit_${ip}`
    
    let record = rateLimitStore.get(key)
    
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      }
    } else {
      record.count++
    }
    
    rateLimitStore.set(key, record)
    
    if (record.count > maxRequests) {
      return c.json({
        success: false,
        message: '请求过于频繁，请稍后再试'
      }, 429)
    }
    
    // 清理过期记录
    if (Math.random() < 0.01) { // 1% 的概率清理
      for (const [key, value] of rateLimitStore.entries()) {
        if (now > value.resetTime) {
          rateLimitStore.delete(key)
        }
      }
    }
    
    await next()
  }
}

/**
 * 内容类型验证中间件
 */
export const validateJsonMiddleware = async (c: Context, next: Next) => {
  if (c.req.method === 'POST' || c.req.method === 'PUT') {
    const contentType = c.req.header('Content-Type')
    
    if (!contentType || !contentType.includes('application/json')) {
      return c.json({
        success: false,
        message: '请求必须使用 application/json 内容类型'
      }, 400)
    }
  }
  
  await next()
}
