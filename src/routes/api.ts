import { Hono } from 'hono'
import { jwt } from 'hono/jwt'
import { DatabaseService } from '../services/database'
import { AuthService } from '../services/auth'
import { RSSService } from '../services/rss'
import { TelegramService } from '../services/telegram'
import { MatcherService } from '../services/matcher'

type Bindings = {
  DB: D1Database
  ENVIRONMENT: string
}

type Variables = {
  dbService: DatabaseService
  authService: AuthService
  jwtPayload: any
}

export const apiRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// JWT 中间件
const jwtMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      success: false,
      message: '请提供有效的认证token'
    }, 401)
  }
  
  const token = authHeader.substring(7)
  const authService = c.get('authService')
  
  const verification = await authService.verifyToken(token)
  if (!verification.valid) {
    return c.json({
      success: false,
      message: verification.message || 'Token无效'
    }, 401)
  }
  
  c.set('jwtPayload', verification.payload)
  await next()
}

// 应用JWT中间件到所有API路由
apiRoutes.use('*', jwtMiddleware)

// 获取基础配置
apiRoutes.get('/config', async (c) => {
  try {
    const dbService = c.get('dbService')
    const config = await dbService.getBaseConfig()
    
    if (!config) {
      return c.json({
        success: false,
        message: '配置不存在'
      }, 404)
    }
    
    // 不返回密码
    const { password, ...safeConfig } = config
    
    return c.json({
      success: true,
      data: safeConfig
    })
  } catch (error) {
    return c.json({
      success: false,
      message: `获取配置失败: ${error}`
    }, 500)
  }
})

// 更新基础配置
apiRoutes.put('/config', async (c) => {
  try {
    const body = await c.req.json()
    const { bot_token, chat_id, stop_push, only_title } = body
    
    const dbService = c.get('dbService')
    const config = await dbService.updateBaseConfig({
      bot_token,
      chat_id,
      stop_push: stop_push ? 1 : 0,
      only_title: only_title ? 1 : 0
    })
    
    if (!config) {
      return c.json({
        success: false,
        message: '更新配置失败'
      }, 500)
    }
    
    // 不返回密码
    const { password, ...safeConfig } = config
    
    return c.json({
      success: true,
      data: safeConfig,
      message: '配置更新成功'
    })
  } catch (error) {
    return c.json({
      success: false,
      message: `更新配置失败: ${error}`
    }, 500)
  }
})

// 设置Telegram Webhook
apiRoutes.post('/telegram/webhook', async (c) => {
  try {
    const body = await c.req.json()
    const { bot_token, webhook_url } = body
    
    if (!bot_token || !webhook_url) {
      return c.json({
        success: false,
        message: '请提供bot_token和webhook_url'
      }, 400)
    }
    
    const dbService = c.get('dbService')
    const telegramService = new TelegramService(dbService, bot_token)
    
    const result = await telegramService.setWebhook(webhook_url)
    
    if (result) {
      return c.json({
        success: true,
        message: 'Webhook设置成功',
        data: result
      })
    } else {
      return c.json({
        success: false,
        message: `Webhook设置失败: ${result}`,
        data: result
      }, 400)
    }
  } catch (error) {
    return c.json({
      success: false,
      message: `设置Webhook失败: ${error}`
    }, 500)
  }
})

// Bot 测试端点 - getMe
apiRoutes.get('/telegram/getme', async (c) => {
  try {
    const dbService = c.get('dbService')
    const config = await dbService.getBaseConfig()
    
    if (!config || !config.bot_token) {
      return c.json({
        success: false,
        message: '请先配置Bot Token'
      }, 400)
    }
    
    const telegramService = new TelegramService(dbService, config.bot_token)
    const botInfo = await telegramService.getBotInfo()
    
    if (!botInfo) {
      return c.json({
        success: false,
        message: '无法获取Bot信息，请检查Token是否正确'
      }, 400)
    }
    
    return c.json({
      success: true,
      message: 'Bot 测试成功',
      data: {
        id: botInfo.id,
        is_bot: botInfo.is_bot,
        first_name: botInfo.first_name,
        username: botInfo.username,
        can_join_groups: botInfo.can_join_groups,
        can_read_all_group_messages: botInfo.can_read_all_group_messages,
        supports_inline_queries: botInfo.supports_inline_queries
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      message: `Bot 测试失败: ${error}`
    }, 500)
  }
})

// 获取Bot信息
apiRoutes.get('/telegram/info', async (c) => {
  try {
    const dbService = c.get('dbService')
    const config = await dbService.getBaseConfig()
    
    if (!config || !config.bot_token) {
      return c.json({
        success: false,
        message: '请先配置Bot Token'
      }, 400)
    }
    
    const telegramService = new TelegramService(dbService, config.bot_token)
    const botInfo = await telegramService.getBotInfo()
    
    if (!botInfo) {
      return c.json({
        success: false,
        message: '无法获取Bot信息，请检查Token是否正确'
      }, 400)
    }
    
    // 获取绑定用户信息
    let boundUserInfo = null
    if (config.chat_id) {
      try {
        // 使用存储的用户信息
        boundUserInfo = {
          chat_id: config.chat_id,
          name: config.bound_user_name || '未知用户',
          username: config.bound_user_username || null,
          display_name: config.bound_user_name ? 
            (config.bound_user_username ? `${config.bound_user_name} (@${config.bound_user_username})` : config.bound_user_name) :
            '未知用户'
        }
      } catch (error) {
        console.error('获取绑定用户信息失败:', error)
      }
    }
    
    return c.json({
      success: true,
      message: '获取Bot信息成功',
      data: {
        bot: {
          id: botInfo.id,
          username: botInfo.username,
          first_name: botInfo.first_name,
          is_bot: botInfo.is_bot
        },
        bound_user: boundUserInfo
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      message: `获取Bot信息失败: ${error}`
    }, 500)
  }
})

// 获取订阅列表
apiRoutes.get('/subscriptions', async (c) => {
  try {
    const dbService = c.get('dbService')
    const subscriptions = await dbService.getAllKeywordSubs()
    
    return c.json({
      success: true,
      data: subscriptions
    })
  } catch (error) {
    return c.json({
      success: false,
      message: `获取订阅列表失败: ${error}`
    }, 500)
  }
})

// 添加订阅
apiRoutes.post('/subscriptions', async (c) => {
  try {
    const body = await c.req.json()
    const { keyword1, keyword2, keyword3, creator, category } = body
    
    // 检查是否至少有一个关键词或者有创建者/分类
    const hasKeywords = (keyword1 && keyword1.trim()) || (keyword2 && keyword2.trim()) || (keyword3 && keyword3.trim())
    const hasCreatorOrCategory = (creator && creator.trim()) || (category && category.trim())
    
    if (!hasKeywords && !hasCreatorOrCategory) {
      return c.json({
        success: false,
        message: '请至少填写一个关键词，或者选择创建者/分类'
      }, 400)
    }
    
    const dbService = c.get('dbService')
    const subscription = await dbService.createKeywordSub({
      keyword1: keyword1 && keyword1.trim() ? keyword1.trim() : null,
      keyword2: keyword2 && keyword2.trim() ? keyword2.trim() : null,
      keyword3: keyword3 && keyword3.trim() ? keyword3.trim() : null,
      creator: creator && creator.trim() ? creator.trim() : null,
      category: category && category.trim() ? category.trim() : null
    })
    
    return c.json({
      success: true,
      data: subscription,
      message: '订阅添加成功'
    })
  } catch (error) {
    return c.json({
      success: false,
      message: `添加订阅失败: ${error}`
    }, 500)
  }
})

// 更新订阅
apiRoutes.put('/subscriptions/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({
        success: false,
        message: '无效的订阅ID'
      }, 400)
    }
    
    const body = await c.req.json()
    const { keyword1, keyword2, keyword3, creator, category } = body
    
    const dbService = c.get('dbService')
    const subscription = await dbService.updateKeywordSub(id, {
      keyword1: keyword1 ? keyword1.trim() : undefined,
      keyword2: keyword2 ? keyword2.trim() : undefined,
      keyword3: keyword3 ? keyword3.trim() : undefined,
      creator: creator ? creator.trim() : undefined,
      category: category ? category.trim() : undefined
    })
    
    if (!subscription) {
      return c.json({
        success: false,
        message: '订阅不存在'
      }, 404)
    }
    
    return c.json({
      success: true,
      data: subscription,
      message: '订阅更新成功'
    })
  } catch (error) {
    return c.json({
      success: false,
      message: `更新订阅失败: ${error}`
    }, 500)
  }
})

// 删除订阅
apiRoutes.delete('/subscriptions/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'))
    if (isNaN(id)) {
      return c.json({
        success: false,
        message: '无效的订阅ID'
      }, 400)
    }
    
    const dbService = c.get('dbService')
    const success = await dbService.deleteKeywordSub(id)
    
    if (success) {
      return c.json({
        success: true,
        message: '订阅删除成功'
      })
    } else {
      return c.json({
        success: false,
        message: '订阅不存在'
      }, 404)
    }
  } catch (error) {
    return c.json({
      success: false,
      message: `删除订阅失败: ${error}`
    }, 500)
  }
})

// 获取文章列表
apiRoutes.get('/posts', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20')
    const dbService = c.get('dbService')
    const posts = await dbService.getRecentPosts(limit)
    
    return c.json({
      success: true,
      data: posts
    })
  } catch (error) {
    return c.json({
      success: false,
      message: `获取文章列表失败: ${error}`
    }, 500)
  }
})

// 手动更新RSS
apiRoutes.post('/rss/update', async (c) => {
  try {
    const dbService = c.get('dbService')
    const rssService = new RSSService(dbService)
    
    const result = await rssService.manualUpdate()
    
    return c.json(result)
  } catch (error) {
    return c.json({
      success: false,
      message: `RSS更新失败: ${error}`
    }, 500)
  }
})

// 获取匹配统计（兼容旧接口）
apiRoutes.get('/stats', async (c) => {
  try {
    const dbService = c.get('dbService')
    const config = await dbService.getBaseConfig()
    
    if (!config || !config.bot_token) {
      return c.json({
        success: false,
        message: '请先配置Bot Token'
      }, 400)
    }
    
    const telegramService = new TelegramService(dbService, config.bot_token)
    const matcherService = new MatcherService(dbService, telegramService)
    
    const stats = await matcherService.getMatchStats()
    
    return c.json({
      success: true,
      data: stats
    })
  } catch (error) {
    return c.json({
      success: false,
      message: `获取统计信息失败: ${error}`
    }, 500)
  }
})

// 获取综合统计信息（新接口，更高效）
apiRoutes.get('/stats/comprehensive', async (c) => {
  try {
    const dbService = c.get('dbService')
    const stats = await dbService.getComprehensiveStats()
    
    return c.json({
      success: true,
      data: {
        ...stats
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      message: `获取综合统计信息失败: ${error}`
    }, 500)
  }
})

// 获取今日统计
apiRoutes.get('/stats/today', async (c) => {
  try {
    const dbService = c.get('dbService')
    
    const [todayPosts, todayMessages] = await Promise.all([
      dbService.getTodayPostsCount(),
      dbService.getTodayMessagesCount()
    ])
    
    return c.json({
      success: true,
      data: {
        posts: todayPosts,
        messages: todayMessages
      }
    })
  } catch (error) {
    return c.json({
      success: false,
      message: `获取今日统计失败: ${error}`
    }, 500)
  }
})
