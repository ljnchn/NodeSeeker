import { DatabaseService, Post, KeywordSub, BaseConfig } from './database';
import { TelegramService } from './telegram';

export interface MatchResult {
  matched: boolean;
  subscription?: KeywordSub;
  matchedKeywords: string[];
  matchType: 'title' | 'content' | 'both';
}

export interface PushResult {
  processed: number;
  pushed: number;
  skipped: number;
  errors: number;
  details: Array<{
    postId: number;
    title: string;
    status: 'pushed' | 'skipped' | 'error';
    reason?: string;
  }>;
}

export class MatcherService {
  constructor(
    private dbService: DatabaseService,
    private telegramService: TelegramService
  ) {}

  /**
   * 检查文章是否匹配任何订阅
   */
  async checkPostMatches(post: Post): Promise<MatchResult[]> {
    const subscriptions = await this.dbService.getAllKeywordSubs();
    const config = await this.dbService.getBaseConfig();
    
    if (!config) {
      return [];
    }

    const results: MatchResult[] = [];

    for (const sub of subscriptions) {
      const matchResult = this.matchPostWithSubscription(post, sub, config);
      if (matchResult.matched) {
        results.push(matchResult);
      }
    }

    return results;
  }

  /**
   * 匹配单个文章与单个订阅
   */
  private matchPostWithSubscription(post: Post, subscription: KeywordSub, config: BaseConfig): MatchResult {
    const keywords = [subscription.keyword1, subscription.keyword2, subscription.keyword3]
      .filter(k => k && k.trim().length > 0);

    if (keywords.length === 0) {
      return {
        matched: false,
        matchedKeywords: [],
        matchType: 'title'
      };
    }

    // 准备搜索文本
    const titleText = post.title.toLowerCase();
    const contentText = post.memo.toLowerCase();
    const creatorText = post.creator.toLowerCase();
    const categoryText = post.category.toLowerCase();

    // 检查创建者过滤
    if (subscription.creator && subscription.creator.trim().length > 0) {
      const targetCreator = subscription.creator.toLowerCase().trim();
      if (!creatorText.includes(targetCreator)) {
        return {
          matched: false,
          matchedKeywords: [],
          matchType: 'title'
        };
      }
    }

    // 检查分类过滤
    if (subscription.category && subscription.category.trim().length > 0) {
      const targetCategory = subscription.category.toLowerCase().trim();
      if (!categoryText.includes(targetCategory)) {
        return {
          matched: false,
          matchedKeywords: [],
          matchType: 'title'
        };
      }
    }

    // 关键词匹配
    const matchedKeywords: string[] = [];
    let titleMatches = 0;
    let contentMatches = 0;

    for (const keyword of keywords) {
      const lowerKeyword = keyword.toLowerCase().trim();
      
      if (titleText.includes(lowerKeyword)) {
        titleMatches++;
        matchedKeywords.push(keyword);
      } else if (!config.only_title && contentText.includes(lowerKeyword)) {
        contentMatches++;
        matchedKeywords.push(keyword);
      }
    }

    // 判断是否匹配（所有关键词都必须匹配）
    const totalMatches = titleMatches + contentMatches;
    const matched = totalMatches === keywords.length;

    if (!matched) {
      return {
        matched: false,
        matchedKeywords: [],
        matchType: 'title'
      };
    }

    // 确定匹配类型
    let matchType: 'title' | 'content' | 'both';
    if (titleMatches === keywords.length) {
      matchType = 'title';
    } else if (contentMatches === keywords.length) {
      matchType = 'content';
    } else {
      matchType = 'both';
    }

    return {
      matched: true,
      subscription,
      matchedKeywords,
      matchType
    };
  }

  /**
   * 处理未推送的文章
   */
  async processUnpushedPosts(): Promise<PushResult> {
    const config = await this.dbService.getBaseConfig();
    
    if (!config) {
      return {
        processed: 0,
        pushed: 0,
        skipped: 0,
        errors: 0,
        details: []
      };
    }

    if (config.stop_push === 1) {
      console.log('推送已停止，跳过处理');
      return {
        processed: 0,
        pushed: 0,
        skipped: 0,
        errors: 0,
        details: []
      };
    }

    const unpushedPosts = await this.dbService.getUnpushedPosts();
    console.log(`找到 ${unpushedPosts.length} 篇未推送文章`);

    const result: PushResult = {
      processed: 0,
      pushed: 0,
      skipped: 0,
      errors: 0,
      details: []
    };

    for (const post of unpushedPosts) {
      result.processed++;
      
      try {
        const matches = await this.checkPostMatches(post);
        
        if (matches.length === 0) {
          // 没有匹配，标记为无需推送
          await this.dbService.updatePostPushStatus(post.post_id, 2); // 2 = 无需推送
          result.skipped++;
          result.details.push({
            postId: post.post_id,
            title: post.title,
            status: 'skipped',
            reason: '没有匹配的订阅'
          });
          continue;
        }

        // 有匹配，推送第一个匹配的订阅
        const firstMatch = matches[0];
        if (!firstMatch.subscription) {
          result.errors++;
          result.details.push({
            postId: post.post_id,
            title: post.title,
            status: 'error',
            reason: '匹配结果异常'
          });
          continue;
        }

        const pushSuccess = await this.telegramService.pushPost(post, firstMatch.subscription);
        
        if (pushSuccess) {
          result.pushed++;
          result.details.push({
            postId: post.post_id,
            title: post.title,
            status: 'pushed'
          });
          console.log(`成功推送文章: ${post.title}`);
        } else {
          result.errors++;
          result.details.push({
            postId: post.post_id,
            title: post.title,
            status: 'error',
            reason: '推送失败'
          });
          console.error(`推送文章失败: ${post.title}`);
        }

        // 添加延迟避免频率限制
        if (result.pushed > 0 && result.pushed % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        result.errors++;
        result.details.push({
          postId: post.post_id,
          title: post.title,
          status: 'error',
          reason: `处理异常: ${error}`
        });
        console.error(`处理文章失败: ${post.title}`, error);
      }
    }

    console.log(`推送处理完成: 处理 ${result.processed} 篇，推送 ${result.pushed} 篇，跳过 ${result.skipped} 篇，错误 ${result.errors} 篇`);
    
    return result;
  }

  /**
   * 测试匹配规则
   */
  async testMatch(postId: number): Promise<{
    success: boolean;
    post?: Post;
    matches: MatchResult[];
    message: string;
  }> {
    try {
      const post = await this.dbService.getPostByPostId(postId);
      
      if (!post) {
        return {
          success: false,
          matches: [],
          message: '文章不存在'
        };
      }

      const matches = await this.checkPostMatches(post);

      return {
        success: true,
        post,
        matches,
        message: matches.length > 0 ? `找到 ${matches.length} 个匹配的订阅` : '没有匹配的订阅'
      };
    } catch (error) {
      return {
        success: false,
        matches: [],
        message: `测试失败: ${error}`
      };
    }
  }

  /**
   * 获取匹配统计信息
   */
  async getMatchStats(): Promise<{
    totalPosts: number;
    unpushedPosts: number;
    pushedPosts: number;
    skippedPosts: number;
    totalSubscriptions: number;
  }> {
    try {
      const [recentPosts, unpushedPosts, subscriptions] = await Promise.all([
        this.dbService.getRecentPosts(1000), // 获取最近1000篇文章用于统计
        this.dbService.getUnpushedPosts(),
        this.dbService.getAllKeywordSubs()
      ]);

      const pushedPosts = recentPosts.filter(p => p.push_status === 1).length;
      const skippedPosts = recentPosts.filter(p => p.push_status === 2).length;

      return {
        totalPosts: recentPosts.length,
        unpushedPosts: unpushedPosts.length,
        pushedPosts,
        skippedPosts,
        totalSubscriptions: subscriptions.length
      };
    } catch (error) {
      console.error('获取匹配统计失败:', error);
      return {
        totalPosts: 0,
        unpushedPosts: 0,
        pushedPosts: 0,
        skippedPosts: 0,
        totalSubscriptions: 0
      };
    }
  }

  /**
   * 手动推送指定文章
   */
  async manualPushPost(postId: number, subscriptionId: number): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const [post, subscription] = await Promise.all([
        this.dbService.getPostByPostId(postId),
        this.dbService.getKeywordSubById(subscriptionId)
      ]);

      if (!post) {
        return {
          success: false,
          message: '文章不存在'
        };
      }

      if (!subscription) {
        return {
          success: false,
          message: '订阅不存在'
        };
      }

      const pushSuccess = await this.telegramService.pushPost(post, subscription);

      if (pushSuccess) {
        return {
          success: true,
          message: '推送成功'
        };
      } else {
        return {
          success: false,
          message: '推送失败'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `推送失败: ${error}`
      };
    }
  }
}
