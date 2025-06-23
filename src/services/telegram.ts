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
  private readonly API_BASE = 'https://api.telegram.org/bot';

  constructor(
    private dbService: DatabaseService,
    private botToken: string
  ) {}

  /**
   * 发送消息到 Telegram
   */
  async sendMessage(chatId: string | number, text: string, parseMode: string = 'HTML'): Promise<TelegramResponse> {
    try {
      const url = `${this.API_BASE}${this.botToken}/sendMessage`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: parseMode,
          disable_web_page_preview: true
        })
      });

      const result = await response.json() as TelegramResponse;
      
      if (!result.ok) {
        console.error('Telegram 发送消息失败:', result.description);
      }
      
      return result;
    } catch (error) {
      console.error('发送 Telegram 消息时出错:', error);
      return {
        ok: false,
        description: `发送失败: ${error}`
      };
    }
  }

  /**
   * 设置 Webhook
   */
  async setWebhook(webhookUrl: string): Promise<TelegramResponse> {
    try {
      const url = `${this.API_BASE}${this.botToken}/setWebhook`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: webhookUrl
        })
      });

      return await response.json() as TelegramResponse;
    } catch (error) {
      console.error('设置 Webhook 失败:', error);
      return {
        ok: false,
        description: `设置 Webhook 失败: ${error}`
      };
    }
  }

  /**
   * 获取 Bot 信息
   */
  async getBotInfo(): Promise<TelegramResponse> {
    try {
      const url = `${this.API_BASE}${this.botToken}/getMe`;
      const response = await fetch(url);
      return await response.json() as TelegramResponse;
    } catch (error) {
      console.error('获取 Bot 信息失败:', error);
      return {
        ok: false,
        description: `获取 Bot 信息失败: ${error}`
      };
    }
  }

  /**
   * 处理 Telegram Webhook 更新
   */
  async handleWebhookUpdate(update: TelegramUpdate): Promise<void> {
    if (!update.message || !update.message.text) {
      return;
    }

    const message = update.message;
    const chatId = message.chat.id;
    const text = message.text.trim();
    const userId = message.from.id;

    console.log(`收到消息: ${text} 来自用户: ${userId}`);

    // 处理命令
    if (text.startsWith('/')) {
      await this.handleCommand(chatId, text, message);
    } else {
      await this.sendMessage(chatId, '请使用命令与我交互。发送 /help 查看可用命令。');
    }
  }

  /**
   * 处理命令
   */
  private async handleCommand(chatId: number, command: string, message: TelegramMessage): Promise<void> {
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case '/start':
        await this.handleStartCommand(chatId, message);
        break;
      case '/stop':
        await this.handleStopCommand(chatId);
        break;
      case '/resume':
        await this.handleResumeCommand(chatId);
        break;
      case '/list':
        await this.handleListCommand(chatId);
        break;
      case '/add':
        await this.handleAddCommand(chatId, args);
        break;
      case '/delete':
        await this.handleDeleteCommand(chatId, args);
        break;
      case '/post':
        await this.handlePostCommand(chatId);
        break;
      case '/help':
        await this.handleHelpCommand(chatId);
        break;
      default:
        await this.sendMessage(chatId, '未知命令。发送 /help 查看可用命令。');
    }
  }

  /**
   * 处理 /start 命令
   */
  private async handleStartCommand(chatId: number, message: TelegramMessage): Promise<void> {
    const config = await this.dbService.getBaseConfig();
    
    if (!config) {
      await this.sendMessage(chatId, '系统尚未初始化，请先在网页端完成初始化设置。');
      return;
    }

    // 更新 chat_id
    await this.dbService.updateBaseConfig({ chat_id: chatId.toString() });

    const userInfo = `${message.from.first_name}${message.from.last_name ? ' ' + message.from.last_name : ''}`;
    const welcomeText = `
🎉 欢迎使用 NodeSeek RSS 监控机器人！

👤 用户信息：${userInfo}
🆔 Chat ID：${chatId}

✅ 已保存您的 Chat ID，现在可以接收推送消息了。

📋 可用命令：
/help - 查看帮助
/list - 查看订阅列表
/add - 添加订阅
/delete - 删除订阅
/post - 查看最近文章
/stop - 停止推送
/resume - 恢复推送
    `;

    await this.sendMessage(chatId, welcomeText);
  }

  /**
   * 处理 /stop 命令
   */
  private async handleStopCommand(chatId: number): Promise<void> {
    await this.dbService.updateBaseConfig({ stop_push: 1 });
    await this.sendMessage(chatId, '✅ 已停止推送。发送 /resume 可恢复推送。');
  }

  /**
   * 处理 /resume 命令
   */
  private async handleResumeCommand(chatId: number): Promise<void> {
    await this.dbService.updateBaseConfig({ stop_push: 0 });
    await this.sendMessage(chatId, '✅ 已恢复推送。');
  }

  /**
   * 处理 /list 命令
   */
  private async handleListCommand(chatId: number): Promise<void> {
    const subs = await this.dbService.getAllKeywordSubs();
    
    if (subs.length === 0) {
      await this.sendMessage(chatId, '📝 暂无订阅。使用 /add 添加订阅。');
      return;
    }

    let text = '📋 当前订阅列表：\n\n';
    subs.forEach((sub, index) => {
      text += `${index + 1}. ID: ${sub.id}\n`;
      text += `   关键词：${sub.keyword1}`;
      if (sub.keyword2) text += ` + ${sub.keyword2}`;
      if (sub.keyword3) text += ` + ${sub.keyword3}`;
      text += '\n';
      if (sub.creator) text += `   创建者：${sub.creator}\n`;
      if (sub.category) text += `   分类：${sub.category}\n`;
      text += '\n';
    });

    await this.sendMessage(chatId, text);
  }

  /**
   * 处理 /add 命令
   */
  private async handleAddCommand(chatId: number, args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.sendMessage(chatId, '❌ 请提供关键词。\n用法：/add 关键词1 关键词2 关键词3');
      return;
    }

    const keywords = args.slice(0, 3); // 最多3个关键词
    
    try {
      const sub = await this.dbService.createKeywordSub({
        keyword1: keywords[0],
        keyword2: keywords[1] || undefined,
        keyword3: keywords[2] || undefined
      });

      let text = `✅ 订阅添加成功！\n\nID: ${sub.id}\n关键词：${sub.keyword1}`;
      if (sub.keyword2) text += ` + ${sub.keyword2}`;
      if (sub.keyword3) text += ` + ${sub.keyword3}`;

      await this.sendMessage(chatId, text);
    } catch (error) {
      await this.sendMessage(chatId, `❌ 添加订阅失败：${error}`);
    }
  }

  /**
   * 处理 /delete 命令
   */
  private async handleDeleteCommand(chatId: number, args: string[]): Promise<void> {
    if (args.length === 0) {
      await this.sendMessage(chatId, '❌ 请提供订阅 ID。\n用法：/delete 订阅ID');
      return;
    }

    const id = parseInt(args[0]);
    if (isNaN(id)) {
      await this.sendMessage(chatId, '❌ 订阅 ID 必须是数字。');
      return;
    }

    try {
      const success = await this.dbService.deleteKeywordSub(id);
      if (success) {
        await this.sendMessage(chatId, `✅ 订阅 ${id} 删除成功。`);
      } else {
        await this.sendMessage(chatId, `❌ 订阅 ${id} 不存在。`);
      }
    } catch (error) {
      await this.sendMessage(chatId, `❌ 删除订阅失败：${error}`);
    }
  }

  /**
   * 处理 /post 命令
   */
  private async handlePostCommand(chatId: number): Promise<void> {
    const posts = await this.dbService.getRecentPosts(10);
    
    if (posts.length === 0) {
      await this.sendMessage(chatId, '📝 暂无文章数据。');
      return;
    }

    let text = '📰 最近10条文章：\n\n';
    posts.forEach((post, index) => {
      const status = post.push_status === 0 ? '⏳未推送' : 
                    post.push_status === 1 ? '✅已推送' : '❌无需推送';
      
      text += `${index + 1}. ${post.title}\n`;
      text += `   作者：${post.creator} | 分类：${post.category}\n`;
      text += `   状态：${status}\n`;
      text += `   时间：${new Date(post.pub_date).toLocaleString('zh-CN')}\n\n`;
    });

    await this.sendMessage(chatId, text);
  }

  /**
   * 处理 /help 命令
   */
  private async handleHelpCommand(chatId: number): Promise<void> {
    const helpText = `
🤖 NodeSeek RSS 监控机器人

📋 可用命令：

/start - 开始使用并保存用户信息
/stop - 停止推送
/resume - 恢复推送
/list - 列出所有订阅
/add 关键词1 关键词2 关键词3 - 添加订阅（最多3个关键词）
/delete 订阅ID - 根据订阅ID删除订阅
/post - 查看最近10条文章及推送状态
/help - 显示此帮助信息

💡 使用说明：
- 添加订阅后，系统会自动匹配包含关键词的文章
- 可以设置多个关键词，文章需要包含所有关键词才会推送
- 使用 /list 查看订阅ID，然后用 /delete 删除不需要的订阅
    `;

    await this.sendMessage(chatId, helpText);
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

      const text = `
🔔 <b>NodeSeek 新文章推送</b>

📰 <b>${post.title}</b>

👤 作者：${post.creator}
🏷️ 分类：${post.category}
🕒 时间：${new Date(post.pub_date).toLocaleString('zh-CN')}

📝 摘要：
${post.memo}

🔍 匹配关键词：${matchedSub.keyword1}${matchedSub.keyword2 ? ' + ' + matchedSub.keyword2 : ''}${matchedSub.keyword3 ? ' + ' + matchedSub.keyword3 : ''}

🔗 <a href="https://www.nodeseek.com/post-${post.post_id}-1">查看原文</a>
      `;

      const result = await this.sendMessage(config.chat_id, text);
      
      if (result.ok) {
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
