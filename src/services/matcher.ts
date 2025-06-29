import { DatabaseService, Post, KeywordSub, BaseConfig } from './database';
import { TelegramService } from './telegram';

export interface MatchResult {
  matched: boolean;
  subscription?: KeywordSub;
  matchedKeywords: string[];
  matchType: 'title' | 'content' | 'author' | 'category' | 'mixed';
  matchDetails: {
    titleMatches: string[];
    contentMatches: string[];
    authorMatches: string[];
    categoryMatches: string[];
  };
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
    // 并发获取订阅和配置信息
    const [subscriptions, config] = await Promise.all([
      this.dbService.getAllKeywordSubs(),
      this.dbService.getBaseConfig()
    ]);
    
    if (!config) {
      return [];
    }

    return this.checkPostMatchesWithData(post, subscriptions, config);
  }

  /**
   * 检查文章是否匹配任何订阅 - 带缓存数据版本
   */
  private checkPostMatchesWithData(post: Post, subscriptions: KeywordSub[], config: BaseConfig): MatchResult[] {
    const results: MatchResult[] = [];

    // 预处理文章内容以提高匹配性能
    const preprocessedPost = {
      ...post,
      titleLower: post.title.toLowerCase(),
      memoLower: post.memo.toLowerCase(),
      creatorLower: post.creator.toLowerCase(),
      categoryLower: post.category.toLowerCase()
    };

    for (const sub of subscriptions) {
      const matchResult = this.matchPostWithSubscription(preprocessedPost, sub, config);
      if (matchResult.matched) {
        results.push(matchResult);
      }
    }

    return results;
  }

  /**
   * 匹配单个文章与单个订阅
   */
  private matchPostWithSubscription(post: Post & {
    titleLower?: string;
    memoLower?: string;
    creatorLower?: string;
    categoryLower?: string;
  }, subscription: KeywordSub, config: BaseConfig): MatchResult {
    const keywords = [subscription.keyword1, subscription.keyword2, subscription.keyword3]
      .filter(k => k && k.trim().length > 0);

    if (keywords.length === 0 && !subscription.creator && !subscription.category) {
      return {
        matched: false,
        matchedKeywords: [],
        matchType: 'title',
        matchDetails: {
          titleMatches: [],
          contentMatches: [],
          authorMatches: [],
          categoryMatches: []
        }
      };
    }

    // 使用预处理的文本或实时转换
    const titleText = post.titleLower || post.title.toLowerCase();
    const contentText = post.memoLower || post.memo.toLowerCase();
    const creatorText = post.creatorLower || post.creator.toLowerCase();
    const categoryText = post.categoryLower || post.category.toLowerCase();

    // 检查作者精确匹配过滤（如果指定了creator，必须精确匹配）
    if (subscription.creator && subscription.creator.trim().length > 0) {
      const targetCreator = subscription.creator.toLowerCase().trim();
      if (!creatorText.includes(targetCreator)) {
        return {
          matched: false,
          matchedKeywords: [],
          matchType: 'title',
          matchDetails: {
            titleMatches: [],
            contentMatches: [],
            authorMatches: [],
            categoryMatches: []
          }
        };
      }
    }

    // 检查分类精确匹配过滤（如果指定了category，必须精确匹配）
    if (subscription.category && subscription.category.trim().length > 0) {
      const targetCategory = subscription.category.toLowerCase().trim();
      if (!categoryText.includes(targetCategory)) {
        return {
          matched: false,
          matchedKeywords: [],
          matchType: 'title',
          matchDetails: {
            titleMatches: [],
            contentMatches: [],
            authorMatches: [],
            categoryMatches: []
          }
        };
      }
    }

    // 关键词匹配（扩展到标题、内容、作者、分类）
    const matchDetails = {
      titleMatches: [] as string[],
      contentMatches: [] as string[],
      authorMatches: [] as string[],
      categoryMatches: [] as string[]
    };

    const matchedKeywords: string[] = [];
    let totalMatchedKeywords = 0;

    for (const keyword of keywords) {
      const lowerKeyword = keyword?.toLowerCase().trim() || '';
      let keywordMatched = false;
      
      // 检查标题匹配
      if (titleText.includes(lowerKeyword)) {
        matchDetails.titleMatches.push(keyword || '');
        keywordMatched = true;
      }
      
      // 检查内容匹配（如果不是仅标题模式）
      if (!keywordMatched && !config.only_title && contentText.includes(lowerKeyword)) {
        matchDetails.contentMatches.push(keyword || '');
        keywordMatched = true;
      }
      
      // 检查作者匹配（如果没有指定具体的creator过滤条件）
      if (!keywordMatched && !subscription.creator && creatorText.includes(lowerKeyword)) {
        matchDetails.authorMatches.push(keyword || '');
        keywordMatched = true;
      }
      
      // 检查分类匹配（如果没有指定具体的category过滤条件）
      if (!keywordMatched && !subscription.category && categoryText.includes(lowerKeyword)) {
        matchDetails.categoryMatches.push(keyword || '');
        keywordMatched = true;
      }

      if (keywordMatched) {
        matchedKeywords.push(keyword || '');
        totalMatchedKeywords++;
      }
    }

    // 判断是否匹配（所有关键词都必须匹配）
    const matched = totalMatchedKeywords === keywords.length;

    if (!matched) {
      return {
        matched: false,
        matchedKeywords: [],
        matchType: 'title',
        matchDetails
      };
    }

    // 确定匹配类型
    let matchType: 'title' | 'content' | 'author' | 'category' | 'mixed';
    if (matchDetails.titleMatches.length === keywords.length) {
      matchType = 'title';
    } else if (matchDetails.contentMatches.length === keywords.length) {
      matchType = 'content';
    } else if (matchDetails.authorMatches.length === keywords.length) {
      matchType = 'author';
    } else if (matchDetails.categoryMatches.length === keywords.length) {
      matchType = 'category';
    } else {
      matchType = 'mixed';
    }

    return {
      matched: true,
      subscription,
      matchedKeywords,
      matchType,
      matchDetails
    };
  }

  /**
   * 处理未推送的文章 - 优化版本，减少重复查询和批量更新
   */
  async processUnpushedPosts(): Promise<PushResult> {
    // 第一步：并发获取所有需要的数据
    const [config, unpushedPosts, subscriptions] = await Promise.all([
      this.dbService.getBaseConfig(),
      this.dbService.getUnpushedPosts(),
      this.dbService.getAllKeywordSubs()
    ]);
    
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

    console.log(`找到 ${unpushedPosts.length} 篇未推送文章`);

    const result: PushResult = {
      processed: 0,
      pushed: 0,
      skipped: 0,
      errors: 0,
      details: []
    };

    // 第二步：收集所有需要批量更新的操作
    const batchUpdates: Array<{
      postId: number;
      pushStatus: number;
      subId?: number;
      pushDate?: string;
    }> = [];

    // 第三步：处理每篇文章
    for (const post of unpushedPosts) {
      result.processed++;
      
      try {
        // 使用缓存的数据进行匹配检查
        const matches = this.checkPostMatchesWithData(post, subscriptions, config);
        
        if (matches.length === 0) {
          // 没有匹配，收集到批量更新中
          batchUpdates.push({
            postId: post.post_id,
            pushStatus: 2 // 2 = 无需推送
          });
          
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
          
          // 注意：pushPost 方法内部已经更新了状态，这里不需要再次更新
        } else {
          // 推送失败，收集到批量更新中（保持未推送状态，下次再试）
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

    // 第四步：批量更新数据库状态
    if (batchUpdates.length > 0) {
      try {
        await this.dbService.batchUpdatePostPushStatus(batchUpdates);
        console.log(`批量更新完成: ${batchUpdates.length} 条记录`);
      } catch (error) {
        console.error('批量更新状态失败:', error);
        // 这里可以选择是否要回退统计结果
      }
    }

    console.log(`推送处理完成: 处理 ${result.processed} 篇，推送 ${result.pushed} 篇，跳过 ${result.skipped} 篇，错误 ${result.errors} 篇`);
    
    return result;
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
      // 使用高效的 COUNT 查询代替获取大量数据
      const [totalPosts, unpushedPosts, pushedPosts, skippedPosts, totalSubscriptions] = await Promise.all([
        this.dbService.getPostsCount(),
        this.dbService.getPostsCountByStatus(0), // 未推送
        this.dbService.getPostsCountByStatus(1), // 已推送
        this.dbService.getPostsCountByStatus(2), // 无需推送
        this.dbService.getSubscriptionsCount()
      ]);

      return {
        totalPosts,
        unpushedPosts,
        pushedPosts,
        skippedPosts,
        totalSubscriptions
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
