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
