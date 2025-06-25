import { Bot, Context, webhookCallback } from 'grammy';
import { DatabaseService, Post, KeywordSub } from './database';

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramResponse {
  ok: boolean;
  result?: any;
  description?: string;
}

export class TelegramService {
  private bot: Bot;

  constructor(
    private dbService: DatabaseService,
    private botToken: string
  ) {
    this.bot = new Bot(botToken);
    this.setupHandlers();
  }

  /**
   * 设置命令处理器
   */
  private setupHandlers(): void {
    // 处理 /start 命令
    this.bot.command('start', async (ctx) => {
      await this.handleStartCommand(ctx);
    });

    // 处理 /stop 命令
    this.bot.command('stop', async (ctx) => {
      await this.handleStopCommand(ctx);
    });

    // 处理 /resume 命令
    this.bot.command('resume', async (ctx) => {
      await this.handleResumeCommand(ctx);
    });

    // 处理 /list 命令
    this.bot.command('list', async (ctx) => {
      await this.handleListCommand(ctx);
    });

    // 处理 /add 命令
    this.bot.command('add', async (ctx) => {
      await this.handleAddCommand(ctx);
    });

    // 处理 /delete 命令
    this.bot.command('delete', async (ctx) => {
      await this.handleDeleteCommand(ctx);
    });

    // 处理 /post 命令
    this.bot.command('post', async (ctx) => {
      await this.handlePostCommand(ctx);
    });

    // 处理 /help 命令
    this.bot.command('help', async (ctx) => {
      await this.handleHelpCommand(ctx);
    });

    // 处理其他消息
    this.bot.on('message:text', async (ctx) => {
      if (!ctx.message.text.startsWith('/')) {
        await ctx.reply('请使用命令与我交互。发送 /help 查看可用命令。');
      }
    });
  }

  /**
   * 获取 webhook 回调
   */
  getWebhookCallback() {
    return webhookCallback(this.bot, 'cloudflare-mod');
  }

  /**
   * 发送消息到 Telegram
   */
  async sendMessage(chatId: string | number, text: string): Promise<boolean> {
    try {
      await this.bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      return true;
    } catch (error) {
      console.error('发送 Telegram 消息时出错:', error);
      return false;
    }
  }

  /**
   * 设置 Webhook
   */
  async setWebhook(webhookUrl: string): Promise<boolean> {
    try {
      await this.bot.api.setWebhook(webhookUrl);
      return true;
    } catch (error) {
      console.error('设置 Webhook 失败:', error);
      return false;
    }
  }

  /**
   * 获取 Bot 信息
   */
  async getBotInfo() {
    try {
      return await this.bot.api.getMe();
    } catch (error) {
      console.error('获取 Bot 信息失败:', error);
      return null;
    }
  }

  /**
   * 处理 /start 命令
   */
  private async handleStartCommand(ctx: Context): Promise<void> {
    const config = await this.dbService.getBaseConfig();
    
    if (!config) {
      await ctx.reply('系统尚未初始化，请先在网页端完成初始化设置。');
      return;
    }

    const chatId = ctx.chat?.id;
    if (!chatId) return;

    // 更新 chat_id
    await this.dbService.updateBaseConfig({ chat_id: chatId.toString() });

    const userInfo = `${ctx.from?.first_name}${ctx.from?.last_name ? ' ' + ctx.from.last_name : ''}`;
    const welcomeText = `
🎉 **欢迎使用 NodeSeek RSS 监控机器人！**

👤 **用户信息：** ${userInfo}
🆔 **Chat ID：** ${chatId}

✅ 已保存您的 Chat ID，现在可以接收推送消息了。

📋 **可用命令：**
/help - 查看帮助
/list - 查看订阅列表
/add - 添加订阅
/delete - 删除订阅
/post - 查看最近文章
/stop - 停止推送
/resume - 恢复推送
    `;

    await ctx.reply(welcomeText, { parse_mode: 'Markdown' });
  }

  /**
   * 处理 /stop 命令
   */
  private async handleStopCommand(ctx: Context): Promise<void> {
    await this.dbService.updateBaseConfig({ stop_push: 1 });
    await ctx.reply('✅ 已停止推送。发送 /resume 可恢复推送。');
  }

  /**
   * 处理 /resume 命令
   */
  private async handleResumeCommand(ctx: Context): Promise<void> {
    await this.dbService.updateBaseConfig({ stop_push: 0 });
    await ctx.reply('✅ 已恢复推送。');
  }

  /**
   * 处理 /list 命令
   */
  private async handleListCommand(ctx: Context): Promise<void> {
    const subs = await this.dbService.getAllKeywordSubs();
    
    if (subs.length === 0) {
      await ctx.reply('📝 暂无订阅。使用 /add 添加订阅。');
      return;
    }

    let text = '📋 **当前订阅列表：**\n\n';
    subs.forEach((sub, index) => {
      text += `${index + 1}\\. **ID:** ${sub.id}\n`;
      text += `   **关键词：** ${sub.keyword1}`;
      if (sub.keyword2) text += ` \\+ ${sub.keyword2}`;
      if (sub.keyword3) text += ` \\+ ${sub.keyword3}`;
      text += '\n';
      if (sub.creator) text += `   **创建者：** ${sub.creator}\n`;
      if (sub.category) text += `   **分类：** ${sub.category}\n`;
      text += '\n';
    });

    await ctx.reply(text, { parse_mode: 'Markdown' });
  }

  /**
   * 处理 /add 命令
   */
  private async handleAddCommand(ctx: Context): Promise<void> {
    const args = ctx.message?.text?.split(' ').slice(1) || [];
    
    if (args.length === 0) {
      await ctx.reply('❌ 请提供关键词。\n**用法：** /add 关键词1 关键词2 关键词3', { parse_mode: 'Markdown' });
      return;
    }

    const keywords = args.slice(0, 3); // 最多3个关键词
    
    try {
      const sub = await this.dbService.createKeywordSub({
        keyword1: keywords[0],
        keyword2: keywords[1] || undefined,
        keyword3: keywords[2] || undefined
      });

      let text = `✅ **订阅添加成功！**\n\n**ID:** ${sub.id}\n**关键词：** ${sub.keyword1}`;
      if (sub.keyword2) text += ` \\+ ${sub.keyword2}`;
      if (sub.keyword3) text += ` \\+ ${sub.keyword3}`;

      await ctx.reply(text, { parse_mode: 'Markdown' });
    } catch (error) {
      await ctx.reply(`❌ 添加订阅失败：${error}`);
    }
  }

  /**
   * 处理 /delete 命令
   */
  private async handleDeleteCommand(ctx: Context): Promise<void> {
    const args = ctx.message?.text?.split(' ').slice(1) || [];
    
    if (args.length === 0) {
      await ctx.reply('❌ 请提供订阅 ID。\n**用法：** /delete 订阅ID', { parse_mode: 'Markdown' });
      return;
    }

    const id = parseInt(args[0]);
    if (isNaN(id)) {
      await ctx.reply('❌ 订阅 ID 必须是数字。');
      return;
    }

    try {
      const success = await this.dbService.deleteKeywordSub(id);
      if (success) {
        await ctx.reply(`✅ 订阅 ${id} 删除成功。`);
      } else {
        await ctx.reply(`❌ 订阅 ${id} 不存在。`);
      }
    } catch (error) {
      await ctx.reply(`❌ 删除订阅失败：${error}`);
    }
  }

  /**
   * 处理 /post 命令
   */
  private async handlePostCommand(ctx: Context): Promise<void> {
    const posts = await this.dbService.getRecentPosts(10);
    
    if (posts.length === 0) {
      await ctx.reply('📝 暂无文章数据。');
      return;
    }

    let text = '📰 **最近10条文章：**\n\n';
    posts.forEach((post, index) => {
      const status = post.push_status === 0 ? '⏳未推送' : 
                    post.push_status === 1 ? '✅已推送' : '❌无需推送';
      
      text += `${index + 1}\\. [${post.title}](https://www.nodeseek.com/post-${post.post_id}-1)\n`;
      text += `   **作者：** ${post.creator} \\| **分类：** ${post.category}\n`;
      text += `   **状态：** ${status}\n`;
      text += `   **时间：** ${new Date(post.pub_date).toLocaleString('zh-CN')}\n\n`;
    });

    await ctx.reply(text, { parse_mode: 'Markdown' });
  }

  /**
   * 处理 /help 命令
   */
  private async handleHelpCommand(ctx: Context): Promise<void> {
    const helpText = `
🤖 **NodeSeek RSS 监控机器人**

📋 **可用命令：**

/start \\- 开始使用并保存用户信息
/stop \\- 停止推送
/resume \\- 恢复推送
/list \\- 列出所有订阅
/add 关键词1 关键词2 关键词3 \\- 添加订阅（最多3个关键词）
/delete 订阅ID \\- 根据订阅ID删除订阅
/post \\- 查看最近10条文章及推送状态
/help \\- 显示此帮助信息

💡 **使用说明：**
\\- 添加订阅后，系统会自动匹配包含关键词的文章
\\- 可以设置多个关键词，文章需要包含所有关键词才会推送
\\- 使用 /list 查看订阅ID，然后用 /delete 删除不需要的订阅
    `;

    await ctx.reply(helpText, { parse_mode: 'Markdown' });
  }

  /**
   * 推送文章到 Telegram
   */
  async pushPost(post: Post, matchedSub: KeywordSub): Promise<boolean> {
    try {
      const config = await this.dbService.getBaseConfig();
      if (!config || config.stop_push === 1) {
        return false;
      }

      // 构建关键词字符串
      const keywords = [matchedSub.keyword1, matchedSub.keyword2, matchedSub.keyword3, matchedSub.creator, matchedSub.category]
        .filter(k => k && k.trim().length > 0)
        .join(' ');

        // 构建帖子链接
        const postUrl = `https://www.nodeseek.com/post-${post.post_id}-1`;

        // 去除 post.title 会影响markdown链接的符号
        const title = post.title
          .replace(/\[/g, "「")
          .replace(/\]/g, "」")
          .replace(/\(/g, "（")
          .replace(/\)/g, "）");

      const text = `
🎯 **${keywords}**

📰 **[${title}](${postUrl})**
      `;

      const success = await this.sendMessage(config.chat_id, text);
      
      if (success) {
        // 更新推送状态
        await this.dbService.updatePostPushStatus(
          post.post_id, 
          1, // 已推送
          matchedSub.id,
          new Date().toISOString()
        );
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('推送文章失败:', error);
      return false;
    }
  }
}
