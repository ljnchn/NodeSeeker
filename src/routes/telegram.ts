import { Hono } from 'hono'
import { DatabaseService } from '../services/database'
import { TelegramService } from '../services/telegram'

type Bindings = {
  DB: D1Database
  ENVIRONMENT: string
}

type Variables = {
  dbService: DatabaseService
}

export const telegramRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// Telegram Webhook 处理
telegramRoutes.post('/webhook', async (c) => {
  try {
    const dbService = c.get('dbService')
    const config = await dbService.getBaseConfig()
    
    if (!config || !config.bot_token) {
      console.error('Bot Token 未配置')
      return c.json({ ok: true }) // 返回 ok 避免 Telegram 重复发送
    }
    
    const telegramService = new TelegramService(dbService, config.bot_token)
    
    // 使用 grammy 的 webhook 处理器
    const webhookHandler = telegramService.getWebhookCallback()
    return await webhookHandler(c.req.raw)
  } catch (error) {
    console.error('处理 Telegram Webhook 失败:', error)
    return c.json({ ok: true }) // 即使出错也返回 ok，避免 Telegram 重复发送
  }
})

// 测试 Telegram 连接
telegramRoutes.get('/test', async (c) => {
  try {
    const dbService = c.get('dbService')
    const config = await dbService.getBaseConfig()
    
    if (!config || !config.bot_token) {
      return c.json({
        success: false,
        message: 'Bot Token 未配置'
      }, 400)
    }
    
    const telegramService = new TelegramService(dbService, config.bot_token)
    
    // 获取 Bot 信息
    const botInfo = await telegramService.getBotInfo()
    
    if (!botInfo) {
      return c.json({
        success: false,
        message: 'Bot 连接失败',
        data: null
      }, 400)
    }
    
    // 如果有 chat_id，发送测试消息
    if (config.chat_id) {
      const testMessage = `🤖 **NodeSeek RSS Bot 测试消息**\n\n⏰ **时间:** ${new Date().toLocaleString('zh-CN')}\n✅ Bot 连接正常`
      
      const sendResult = await telegramService.sendMessage(config.chat_id, testMessage)
      
      return c.json({
        success: true,
        message: 'Telegram 连接测试成功',
        data: {
          botInfo: botInfo,
          sendResult: sendResult
        }
      })
    } else {
      return c.json({
        success: true,
        message: 'Bot 连接正常，但未绑定 Chat ID',
        data: {
          botInfo: botInfo
        }
      })
    }
  } catch (error) {
    return c.json({
      success: false,
      message: `测试失败: ${error}`
    }, 500)
  }
})

// 发送测试消息
telegramRoutes.post('/send-test', async (c) => {
  try {
    const body = await c.req.json()
    const { message } = body
    
    const dbService = c.get('dbService')
    const config = await dbService.getBaseConfig()
    
    if (!config || !config.bot_token) {
      return c.json({
        success: false,
        message: 'Bot Token 未配置'
      }, 400)
    }
    
    if (!config.chat_id) {
      return c.json({
        success: false,
        message: 'Chat ID 未配置'
      }, 400)
    }
    
    const telegramService = new TelegramService(dbService, config.bot_token)
    
    const testMessage = message || `🧪 **测试消息**\n\n⏰ **时间:** ${new Date().toLocaleString('zh-CN')}`
    
    const result = await telegramService.sendMessage(config.chat_id, testMessage)
    
    if (result) {
      return c.json({
        success: true,
        message: '测试消息发送成功',
        data: { ok: true }
      })
    } else {
      return c.json({
        success: false,
        message: '发送失败',
        data: { ok: false }
      }, 400)
    }
  } catch (error) {
    return c.json({
      success: false,
      message: `发送测试消息失败: ${error}`
    }, 500)
  }
})

// 获取 Webhook 信息
telegramRoutes.get('/webhook-info', async (c) => {
  try {
    const dbService = c.get('dbService')
    const config = await dbService.getBaseConfig()
    
    if (!config || !config.bot_token) {
      return c.json({
        success: false,
        message: 'Bot Token 未配置'
      }, 400)
    }
    
        const response = await fetch(`https://api.telegram.org/bot${config.bot_token}/getWebhookInfo`)
    const result = await response.json() as any

    return c.json({
      success: result.ok,
      message: result.ok ? '获取 Webhook 信息成功' : `获取失败: ${result.description}`,
      data: result
    })
  } catch (error) {
    return c.json({
      success: false,
      message: `获取 Webhook 信息失败: ${error}`
    }, 500)
  }
})

// 获取 Bot 状态信息
telegramRoutes.get('/bot-status', async (c) => {
  try {
    const dbService = c.get('dbService')
    const config = await dbService.getBaseConfig()
    
    if (!config || !config.bot_token) {
      return c.json({
        success: false,
        message: 'Bot Token 未配置',
        data: {
          configured: false,
          connected: false,
          bound: false
        }
      }, 400)
    }
    
    const telegramService = new TelegramService(dbService, config.bot_token)
    
    // 获取 Bot 信息检测连接状态
    const botInfo = await telegramService.getBotInfo()
    
    // 获取 Webhook 信息
    const webhookResponse = await fetch(`https://api.telegram.org/bot${config.bot_token}/getWebhookInfo`)
    const webhookInfo = await webhookResponse.json() as any
    
    const statusData = {
      configured: true,
      connected: !!botInfo,
      bound: !!config.chat_id,
      bot_info: botInfo || null,
      webhook_info: webhookInfo?.result || null,
      config: {
        has_bot_token: !!config.bot_token,
        has_chat_id: !!config.chat_id,
        bound_user_name: config.bound_user_name || null,
        bound_user_username: config.bound_user_username || null,
        stop_push: config.stop_push === 1,
        last_check_time: new Date().toISOString()
      }
    }
    
    if (!botInfo) {
      return c.json({
        success: false,
        message: 'Bot Token 无效或网络连接失败',
        data: statusData
      }, 400)
    }
    
    return c.json({
      success: true,
      message: 'Bot 状态检测成功',
      data: statusData
    })
  } catch (error) {
    return c.json({
      success: false,
      message: `Bot 状态检测失败: ${error}`,
      data: {
        configured: false,
        connected: false,
        bound: false,
        error: String(error)
      }
    }, 500)
  }
})

// 删除 Webhook
telegramRoutes.delete('/webhook', async (c) => {
  try {
    const dbService = c.get('dbService')
    const config = await dbService.getBaseConfig()
    
    if (!config || !config.bot_token) {
      return c.json({
        success: false,
        message: 'Bot Token 未配置'
      }, 400)
    }
    
        const response = await fetch(`https://api.telegram.org/bot${config.bot_token}/deleteWebhook`, {
      method: 'POST'
    })
    const result = await response.json() as any

    return c.json({
      success: result.ok,
      message: result.ok ? 'Webhook 删除成功' : `删除失败: ${result.description}`,
      data: result
    })
  } catch (error) {
    return c.json({
      success: false,
      message: `删除 Webhook 失败: ${error}`
    }, 500)
  }
})

// Bot 健康检查接口
telegramRoutes.get('/health-check', async (c) => {
  try {
    const dbService = c.get('dbService')
    const config = await dbService.getBaseConfig()
    
    const healthStatus = {
      timestamp: new Date().toISOString(),
      overall_status: 'unknown',
      checks: {
        config_check: {
          status: 'fail',
          message: '',
          details: {}
        },
        connection_check: {
          status: 'fail', 
          message: '',
          details: {}
        },
        webhook_check: {
          status: 'fail',
          message: '',
          details: {}
        },
        binding_check: {
          status: 'fail',
          message: '',
          details: {}
        }
      }
    }
    
    // 1. 配置检查
    if (!config || !config.bot_token) {
      healthStatus.checks.config_check = {
        status: 'fail',
        message: 'Bot Token 未配置',
        details: {
          has_config: !!config,
          has_bot_token: false
        }
      }
    } else {
      healthStatus.checks.config_check = {
        status: 'pass',
        message: '配置正常',
        details: {
          has_config: true,
          has_bot_token: true,
          has_chat_id: !!config.chat_id
        }
      }
    }
    
    // 如果配置不正确，直接返回
    if (healthStatus.checks.config_check.status === 'fail') {
      healthStatus.overall_status = 'fail'
      return c.json({
        success: false,
        message: '系统配置不完整',
        data: healthStatus
      }, 400)
    }
    
         const telegramService = new TelegramService(dbService, config!.bot_token!)
     
     // 2. 连接检查
    try {
      const botInfo = await telegramService.getBotInfo()
      if (botInfo) {
        healthStatus.checks.connection_check = {
          status: 'pass',
          message: 'Bot 连接正常',
          details: {
            bot_id: botInfo.id,
            bot_username: botInfo.username,
            bot_name: botInfo.first_name,
            is_bot: botInfo.is_bot
          }
        }
      } else {
        healthStatus.checks.connection_check = {
          status: 'fail',
          message: 'Bot 连接失败',
          details: {}
        }
      }
    } catch (error) {
      healthStatus.checks.connection_check = {
        status: 'fail',
        message: `Bot 连接异常: ${error}`,
        details: { error: String(error) }
      }
    }
    
         // 3. Webhook 检查
     try {
       const webhookResponse = await fetch(`https://api.telegram.org/bot${config!.bot_token}/getWebhookInfo`)
       const webhookResult = await webhookResponse.json() as any
      
      if (webhookResult.ok) {
        const webhookInfo = webhookResult.result
        healthStatus.checks.webhook_check = {
          status: webhookInfo.url ? 'pass' : 'warn',
          message: webhookInfo.url ? 'Webhook 已设置' : 'Webhook 未设置',
          details: {
            url: webhookInfo.url || null,
            has_custom_certificate: webhookInfo.has_custom_certificate || false,
            pending_update_count: webhookInfo.pending_update_count || 0,
            last_error_date: webhookInfo.last_error_date || null,
            last_error_message: webhookInfo.last_error_message || null,
            max_connections: webhookInfo.max_connections || null
          }
        }
      } else {
        healthStatus.checks.webhook_check = {
          status: 'fail',
          message: 'Webhook 信息获取失败',
          details: { error: webhookResult.description }
        }
      }
    } catch (error) {
      healthStatus.checks.webhook_check = {
        status: 'fail',
        message: `Webhook 检查异常: ${error}`,
        details: { error: String(error) }
      }
    }
    
         // 4. 绑定检查
     if (config!.chat_id) {
       // 尝试发送测试消息来验证绑定状态
       const testResult = await telegramService.sendMessage(
         config!.chat_id, 
         '🔍 **系统健康检查**\n\n✅ Bot 运行正常，绑定状态良好'
       )
       
       healthStatus.checks.binding_check = {
         status: testResult ? 'pass' : 'fail',
         message: testResult ? '用户绑定正常，消息发送成功' : '绑定存在问题，消息发送失败',
         details: {
           chat_id: config!.chat_id,
           bound_user_name: config!.bound_user_name || null,
           bound_user_username: config!.bound_user_username || null,
           stop_push: config!.stop_push === 1,
           message_sent: testResult
         }
       }
    } else {
      healthStatus.checks.binding_check = {
        status: 'warn',
        message: '用户未绑定',
        details: {
          chat_id: null,
          bound_user_name: null,
          bound_user_username: null
        }
      }
    }
    
    // 计算整体状态
    const allChecks = Object.values(healthStatus.checks)
    const failedChecks = allChecks.filter(check => check.status === 'fail')
    const warnChecks = allChecks.filter(check => check.status === 'warn')
    
    if (failedChecks.length === 0) {
      healthStatus.overall_status = warnChecks.length === 0 ? 'healthy' : 'warning'
    } else {
      healthStatus.overall_status = 'unhealthy'
    }
    
    const httpStatus = healthStatus.overall_status === 'unhealthy' ? 500 : 200
    
    return c.json({
      success: healthStatus.overall_status !== 'unhealthy',
      message: `Bot 健康检查完成 - 状态: ${healthStatus.overall_status}`,
      data: healthStatus
    }, httpStatus)
    
  } catch (error) {
    return c.json({
      success: false,
      message: `健康检查失败: ${error}`,
      data: {
        timestamp: new Date().toISOString(),
        overall_status: 'error',
        error: String(error)
      }
    }, 500)
  }
})
