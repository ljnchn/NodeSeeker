import { Hono } from 'hono'
import { renderer } from './renderer'
import { cors } from 'hono/cors'

// 导入服务
import { DatabaseService } from './services/database'
import { AuthService } from './services/auth'
import { RSSService } from './services/rss'
import { TelegramService } from './services/telegram'
import { MatcherService } from './services/matcher'

// 导入中间件
import {
  requestLoggerMiddleware,
  errorHandlerMiddleware,
  corsConfig,
  rateLimitMiddleware
} from './middleware/auth'

// 导入路由
import { authRoutes } from './routes/auth'
import { apiRoutes } from './routes/api'
import { telegramRoutes } from './routes/telegram'
import { pageRoutes } from './routes/pages'

type Bindings = {
  DB: D1Database
  ENVIRONMENT: string
}

type Variables = {
  dbService: DatabaseService
  authService: AuthService
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

// 全局中间件
app.use('*', errorHandlerMiddleware)
app.use('*', requestLoggerMiddleware)
app.use('*', cors(corsConfig))
app.use('*', rateLimitMiddleware(200, 60000)) // 每分钟最多200个请求
app.use(renderer)

// 初始化服务
app.use('*', async (c, next) => {
  const dbService = new DatabaseService(c.env.DB)
  const authService = new AuthService(dbService)

  c.set('dbService', dbService)
  c.set('authService', authService)

  await next()
})

// 路由
app.route('/auth', authRoutes)
app.route('/api', apiRoutes)
app.route('/telegram', telegramRoutes)
app.route('/', pageRoutes)

// 定时任务处理器
export default {
  fetch: app.fetch,

  // 定时任务处理器
  async scheduled(event: ScheduledEvent, env: Bindings, ctx: ExecutionContext): Promise<void> {
    const cronExpression = event.cron.trim();
    console.log(`开始执行定时任务，cron: ${cronExpression}`)

    try {
      const dbService = new DatabaseService(env.DB)

      // RSS抓取和推送任务（每分钟执行）
      const config = await dbService.getBaseConfig()

      if (!config || !config.bot_token) {
        console.log('系统未配置，跳过RSS抓取任务')
        return
      }

      const rssService = new RSSService(dbService)
      const telegramService = new TelegramService(dbService, config.bot_token)
      const matcherService = new MatcherService(dbService, telegramService)

      // 1. 抓取新的RSS数据
      console.log('开始抓取RSS数据...')
      const rssResult = await rssService.processNewRSSData()
      console.log(`RSS抓取完成: 新增 ${rssResult.new} 篇文章`)

      // 2. 处理未推送的文章
      if (rssResult.new > 0) {
        console.log('开始处理推送...')
        const pushResult = await matcherService.processUnpushedPosts()
        console.log(`推送完成: 推送 ${pushResult.pushed} 篇文章`)
      }
      // 3. 数据清理任务
      console.log('执行数据清理任务...')
      const cleanupResult = await dbService.cleanupOldPosts()
      console.log(`数据清理完成: 删除了 ${cleanupResult.deletedCount} 条过期记录`)

    } catch (error) {
      console.error('定时任务执行失败:', error)
    }
  }
}
