export interface BaseConfig {
  id?: number;
  username: string;
  password: string;
  bot_token?: string;
  chat_id: string;
  bound_user_name?: string;
  bound_user_username?: string;
  stop_push: number;
  only_title: number;
  created_at?: string;
  updated_at?: string;
}

export interface Post {
  id?: number;
  post_id: number;
  title: string;
  memo: string;
  category: string;
  creator: string;
  push_status: number; // 0 未推送 1 已推送 2 无需推送
  sub_id?: number;
  pub_date: string;
  push_date?: string;
  created_at?: string;
}

export interface KeywordSub {
  id?: number;
  keyword1?: string;
  keyword2?: string;
  keyword3?: string;
  creator?: string;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

export class DatabaseService {
  private queryCache: Map<string, { data: any; timestamp: number; ttl: number }>;
  private readonly CACHE_TTL = 60000; // 1分钟缓存

  constructor(private db: D1Database) {
    this.queryCache = new Map();
  }

  // 缓存助手方法
  private getCacheKey(method: string, params: any[]): string {
    return `${method}:${JSON.stringify(params)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data as T;
    }
    this.queryCache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number = this.CACHE_TTL): void {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private clearCacheByPattern(pattern: string): void {
    for (const key of this.queryCache.keys()) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key);
      }
    }
  }

  /**
   * 检查数据库表是否存在
   */
  private async checkTablesExist(): Promise<boolean> {
    try {
      // 检查主要表是否存在
      const tables = ['base_config', 'posts', 'keywords_sub'];
      
      for (const table of tables) {
        const result = await this.db.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name=?
        `).bind(table).first();
        
        if (!result) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('检查数据库表存在性失败:', error);
      return false;
    }
  }

  /**
   * 初始化数据库表
   */
  async initializeTables(): Promise<void> {
    try {
      // 检查表是否已存在，如果存在则跳过初始化
      const tablesExist = await this.checkTablesExist();
      if (tablesExist) {
        console.log('数据库表已存在，跳过初始化');
        return;
      }

      console.log('开始初始化数据库表...');

      // 创建配置表
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS base_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL,
          password TEXT NOT NULL,
          bot_token TEXT DEFAULT NULL,
          chat_id TEXT NOT NULL,
          bound_user_name TEXT DEFAULT NULL,
          bound_user_username TEXT DEFAULT NULL,
          stop_push INTEGER DEFAULT 0,
          only_title INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // 创建文章表
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          post_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          memo TEXT NOT NULL,
          category TEXT NOT NULL,
          creator TEXT NOT NULL,
          push_status INTEGER DEFAULT 0,
          sub_id INTEGER DEFAULT NULL,
          pub_date DATETIME NOT NULL,
          push_date DATETIME DEFAULT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // 创建文章表的索引
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_posts_post_id ON posts(post_id)
      `).run();

      // 添加更多索引以优化查询性能
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_posts_push_status ON posts(push_status)
      `).run();

      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_posts_pub_date ON posts(pub_date)
      `).run();

      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at)
      `).run();

      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_posts_push_date ON posts(push_date)
      `).run();

      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_posts_creator ON posts(creator)
      `).run();

      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category)
      `).run();

      // 创建关键词订阅表
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS keywords_sub (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          keyword1 TEXT DEFAULT NULL,
          keyword2 TEXT DEFAULT NULL,
          keyword3 TEXT DEFAULT NULL,
          creator TEXT NULL,
          category TEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      // 为关键词订阅表添加索引
      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_keywords_sub_creator ON keywords_sub(creator)
      `).run();

      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_keywords_sub_category ON keywords_sub(category)
      `).run();

      await this.db.prepare(`
        CREATE INDEX IF NOT EXISTS idx_keywords_sub_created_at ON keywords_sub(created_at)
      `).run();

      console.log('数据库表初始化完成');
    } catch (error) {
      console.error('数据库表初始化失败:', error);
      throw new Error(`数据库表初始化失败: ${error}`);
    }
  }

  // 基础配置相关操作
  async getBaseConfig(): Promise<BaseConfig | null> {
    const cacheKey = this.getCacheKey('getBaseConfig', []);
    const cached = this.getFromCache<BaseConfig | null>(cacheKey);
    if (cached !== null) return cached;

    const result = await this.db.prepare('SELECT * FROM base_config LIMIT 1').first();
    const config = result as BaseConfig | null;
    
    // 缓存120秒，配置变化不频繁
    this.setCache(cacheKey, config, 120000);
    return config;
  }

  async createBaseConfig(config: Omit<BaseConfig, 'id' | 'created_at' | 'updated_at'>): Promise<BaseConfig> {
    const result = await this.db.prepare(`
      INSERT INTO base_config (username, password, bot_token, chat_id, bound_user_name, bound_user_username, stop_push, only_title)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      config.username,
      config.password,
      config.bot_token || null,
      config.chat_id,
      config.bound_user_name || null,
      config.bound_user_username || null,
      config.stop_push,
      config.only_title
    ).first();
    
    // 清理相关缓存
    this.clearCacheByPattern('BaseConfig');
    
    return result as unknown as BaseConfig;
  }

  async updateBaseConfig(config: Partial<BaseConfig>): Promise<BaseConfig | null> {
    const updates: string[] = [];
    const values: any[] = [];

    if (config.username !== undefined) {
      updates.push('username = ?');
      values.push(config.username);
    }
    if (config.password !== undefined) {
      updates.push('password = ?');
      values.push(config.password);
    }
    if (config.bot_token !== undefined) {
      updates.push('bot_token = ?');
      values.push(config.bot_token);
    }
    if (config.chat_id !== undefined) {
      updates.push('chat_id = ?');
      values.push(config.chat_id);
    }
    if (config.bound_user_name !== undefined) {
      updates.push('bound_user_name = ?');
      values.push(config.bound_user_name);
    }
    if (config.bound_user_username !== undefined) {
      updates.push('bound_user_username = ?');
      values.push(config.bound_user_username);
    }
    if (config.stop_push !== undefined) {
      updates.push('stop_push = ?');
      values.push(config.stop_push);
    }
    if (config.only_title !== undefined) {
      updates.push('only_title = ?');
      values.push(config.only_title);
    }

    if (updates.length === 0) {
      return this.getBaseConfig();
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const result = await this.db.prepare(`
      UPDATE base_config 
      SET ${updates.join(', ')}
      WHERE id = (SELECT id FROM base_config LIMIT 1)
      RETURNING *
    `).bind(...values).first();

    // 清理相关缓存
    this.clearCacheByPattern('BaseConfig');

    return result as BaseConfig | null;
  }

  // 文章相关操作
  async createPost(post: Omit<Post, 'id' | 'created_at'>): Promise<Post> {
    const result = await this.db.prepare(`
      INSERT INTO posts (post_id, title, memo, category, creator, push_status, sub_id, pub_date, push_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      post.post_id,
      post.title,
      post.memo,
      post.category,
      post.creator,
      post.push_status,
      post.sub_id || null,
      post.pub_date,
      post.push_date || null
    ).first();

    // 清除相关缓存
    this.clearCacheByPattern('posts');
    this.clearCacheByPattern('Stats');

    return result as unknown as Post;
  }

  /**
   * 批量创建文章
   */
  async batchCreatePosts(posts: Array<Omit<Post, 'id' | 'created_at'>>): Promise<number> {
    if (posts.length === 0) {
      return 0;
    }

    // 使用事务进行批量插入
    const statements = posts.map(post => 
      this.db.prepare(`
        INSERT INTO posts (post_id, title, memo, category, creator, push_status, sub_id, pub_date, push_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        post.post_id,
        post.title,
        post.memo,
        post.category,
        post.creator,
        post.push_status,
        post.sub_id || null,
        post.pub_date,
        post.push_date || null
      )
    );

    const results = await this.db.batch(statements);
    
    // 清除相关缓存
    this.clearCacheByPattern('posts');
    this.clearCacheByPattern('Stats');
    
    // 统计成功插入的数量
    return results.filter(result => result.success).length;
  }

  async getPostByPostId(postId: number): Promise<Post | null> {
    const result = await this.db.prepare('SELECT * FROM posts WHERE post_id = ?').bind(postId).first();
    return result as Post | null;
  }

  /**
   * 批量查询文章，根据 post_id 数组
   */
  async getPostsByPostIds(postIds: number[]): Promise<Map<number, Post>> {
    if (postIds.length === 0) {
      return new Map();
    }

    // 构建 IN 查询的占位符
    const placeholders = postIds.map(() => '?').join(',');
    const query = `SELECT * FROM posts WHERE post_id IN (${placeholders})`;
    
    const result = await this.db.prepare(query).bind(...postIds).all();
    
    // 将结果转换为 Map，以 post_id 为键
    const postMap = new Map<number, Post>();
    (result.results as unknown as Post[]).forEach(post => {
      postMap.set(post.post_id, post);
    });
    
    return postMap;
  }

  async updatePostPushStatus(postId: number, pushStatus: number, subId?: number, pushDate?: string): Promise<void> {
    await this.db.prepare(`
      UPDATE posts 
      SET push_status = ?, sub_id = ?, push_date = ?
      WHERE post_id = ?
    `).bind(pushStatus, subId || null, pushDate || null, postId).run();
  }

  async getRecentPosts(limit: number = 10): Promise<Post[]> {
    const result = await this.db.prepare(`
      SELECT * FROM posts 
      ORDER BY pub_date DESC 
      LIMIT ?
    `).bind(limit).all();
    
    return result.results as unknown as Post[];
  }

  async getUnpushedPosts(): Promise<Post[]> {
    const result = await this.db.prepare(`
      SELECT * FROM posts 
      WHERE push_status = 0 
      ORDER BY pub_date ASC
    `).all();
    
    return result.results as unknown as Post[];
  }

  // 新增：带分页的文章查询
  async getPostsWithPagination(
    page: number = 1, 
    limit: number = 30, 
    filters?: {
      pushStatus?: number;
      creator?: string;
      category?: string;
    }
  ): Promise<{
    posts: Post[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * limit;
    
    // 构建查询条件
    const conditions: string[] = [];
    const params: any[] = [];
    
    // 始终查询最近24小时的数据
    conditions.push("created_at >= datetime('now', '-24 hours')");

    if (filters) {
      if (filters.pushStatus !== undefined && filters.pushStatus !== null && filters.pushStatus.toString() !== '') {
        conditions.push('push_status = ?');
        params.push(filters.pushStatus);
      }
      
      if (filters.creator) {
        conditions.push('creator LIKE ?');
        params.push(`%${filters.creator}%`);
      }
      
      if (filters.category) {
        conditions.push('category LIKE ?');
        params.push(`%${filters.category}%`);
      }
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // 执行并发查询
    const [postsResult, countResult] = await Promise.all([
      this.db.prepare(`
        SELECT * FROM posts 
        ${whereClause}
        ORDER BY pub_date DESC 
        LIMIT ? OFFSET ?
      `).bind(...params, limit, offset).all(),
      
      this.db.prepare(`
        SELECT COUNT(*) as count FROM posts 
        ${whereClause}
      `).bind(...params).first()
    ]);
    
    const total = (countResult as any)?.count || 0;
    const totalPages = Math.ceil(total / limit);
    
    return {
      posts: postsResult.results as unknown as Post[],
      total,
      page,
      totalPages
    };
  }

  // 新增：批量更新文章推送状态
  async batchUpdatePostPushStatus(updates: Array<{
    postId: number;
    pushStatus: number;
    subId?: number;
    pushDate?: string;
  }>): Promise<void> {
    if (updates.length === 0) return;
    
    // 使用事务进行批量更新
    const statements = updates.map(update => ({
      sql: `
        UPDATE posts 
        SET push_status = ?, sub_id = ?, push_date = ?
        WHERE post_id = ?
      `,
      params: [
        update.pushStatus,
        update.subId || null,
        update.pushDate || null,
        update.postId
      ]
    }));
    
    await this.db.batch(statements.map(stmt => 
      this.db.prepare(stmt.sql).bind(...stmt.params)
    ));
  }

  // 关键词订阅相关操作
  async createKeywordSub(sub: Omit<KeywordSub, 'id' | 'created_at' | 'updated_at'>): Promise<KeywordSub> {
    const result = await this.db.prepare(`
      INSERT INTO keywords_sub (keyword1, keyword2, keyword3, creator, category)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      sub.keyword1 || null,
      sub.keyword2 || null,
      sub.keyword3 || null,
      sub.creator || null,
      sub.category || null
    ).first();

    // 清理相关缓存
    this.clearCacheByPattern('KeywordSubs');
    this.clearCacheByPattern('Subscriptions');

    return result as unknown as KeywordSub;
  }

  async getAllKeywordSubs(): Promise<KeywordSub[]> {
    const cacheKey = this.getCacheKey('getAllKeywordSubs', []);
    const cached = this.getFromCache<KeywordSub[]>(cacheKey);
    if (cached !== null) return cached;

    const result = await this.db.prepare('SELECT * FROM keywords_sub ORDER BY created_at DESC').all();
    const subscriptions = result.results as unknown as KeywordSub[];
    
    // 缓存60秒，因为订阅变化不频繁
    this.setCache(cacheKey, subscriptions, 60000);
    return subscriptions;
  }

  async deleteKeywordSub(id: number): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM keywords_sub WHERE id = ?').bind(id).run();
    
    // 清理相关缓存
    this.clearCacheByPattern('KeywordSubs');
    this.clearCacheByPattern('Subscriptions');
    
    return result.meta.changes > 0;
  }

  async updateKeywordSub(id: number, sub: Partial<Omit<KeywordSub, 'id' | 'created_at' | 'updated_at'>>): Promise<KeywordSub | null> {
    const updates: string[] = [];
    const values: any[] = [];

    if (sub.keyword1 !== undefined) {
      updates.push('keyword1 = ?');
      values.push(sub.keyword1 || null);
    }
    if (sub.keyword2 !== undefined) {
      updates.push('keyword2 = ?');
      values.push(sub.keyword2 || null);
    }
    if (sub.keyword3 !== undefined) {
      updates.push('keyword3 = ?');
      values.push(sub.keyword3 || null);
    }
    if (sub.creator !== undefined) {
      updates.push('creator = ?');
      values.push(sub.creator || null);
    }
    if (sub.category !== undefined) {
      updates.push('category = ?');
      values.push(sub.category || null);
    }

    if (updates.length === 0) {
      return this.getKeywordSubById(id);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await this.db.prepare(`
      UPDATE keywords_sub 
      SET ${updates.join(', ')}
      WHERE id = ?
      RETURNING *
    `).bind(...values).first();

    return result as KeywordSub | null;
  }

  async getKeywordSubById(id: number): Promise<KeywordSub | null> {
    const result = await this.db.prepare('SELECT * FROM keywords_sub WHERE id = ?').bind(id).first();
    return result as KeywordSub | null;
  }

  // 数据库初始化检查
  async isInitialized(): Promise<boolean> {
    try {
      const config = await this.getBaseConfig();
      return config !== null;
    } catch (error) {
      return false;
    }
  }

  // 统计查询方法（使用 COUNT 提高效率和缓存）- 改为查询最近24小时数据
  async getPostsCount(): Promise<number> {
    const cacheKey = this.getCacheKey('getPostsCount', []);
    const cached = this.getFromCache<number>(cacheKey);
    if (cached !== null) return cached;

    const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM posts 
      WHERE created_at >= datetime('now', '-24 hours')
    `).first();
    const count = (result as any)?.count || 0;
    this.setCache(cacheKey, count, 30000); // 30秒缓存
    return count;
  }

  async getPostsCountByStatus(pushStatus: number): Promise<number> {
    const cacheKey = this.getCacheKey('getPostsCountByStatus', [pushStatus]);
    const cached = this.getFromCache<number>(cacheKey);
    if (cached !== null) return cached;

    const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM posts 
      WHERE push_status = ? AND created_at >= datetime('now', '-24 hours')
    `).bind(pushStatus).first();
    const count = (result as any)?.count || 0;
    this.setCache(cacheKey, count, 30000); // 30秒缓存
    return count;
  }

  async getSubscriptionsCount(): Promise<number> {
    const cacheKey = this.getCacheKey('getSubscriptionsCount', []);
    const cached = this.getFromCache<number>(cacheKey);
    if (cached !== null) return cached;

    const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM keywords_sub
    `).first();
    const count = (result as any)?.count || 0;
    this.setCache(cacheKey, count, 60000); // 1分钟缓存（关键词变化较少）
    return count;
  }

  async getTodayPostsCount(): Promise<number> {
    const cacheKey = this.getCacheKey('getTodayPostsCount', []);
    const cached = this.getFromCache<number>(cacheKey);
    if (cached !== null) return cached;
    const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM posts 
      WHERE created_at >= datetime('now', '-24 hours')
    `).first();
    const count = (result as any)?.count || 0;
    this.setCache(cacheKey, count, 60000); // 1分钟缓存
    return count;
  }

  async getTodayMessagesCount(): Promise<number> {
    const cacheKey = this.getCacheKey('getTodayMessagesCount', []);
    const cached = this.getFromCache<number>(cacheKey);
    if (cached !== null) return cached;
    const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM posts 
      WHERE push_status = 1 AND push_date >= datetime('now', '-24 hours')
    `).first();
    const count = (result as any)?.count || 0;
    this.setCache(cacheKey, count, 60000); // 1分钟缓存
    return count;
  }

  async getPostsCountByDateRange(startDate: string, endDate: string): Promise<number> {
    const cacheKey = this.getCacheKey('getPostsCountByDateRange', [startDate, endDate]);
    const cached = this.getFromCache<number>(cacheKey);
    if (cached !== null) return cached;
    const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM posts 
      WHERE DATE(pub_date) BETWEEN ? AND ?
    `).bind(startDate, endDate).first();
    const count = (result as any)?.count || 0;
    this.setCache(cacheKey, count, 60000); // 1分钟缓存
    return count;
  }

  async getLastUpdateTime(): Promise<string | null> {
    const result = await this.db.prepare(`
      SELECT created_at as last_update FROM posts order by id desc limit 1
    `).first();
    return (result as any)?.last_update || null; // 返回最后更新时间
  }

  // 获取综合统计信息
  async getComprehensiveStats(): Promise<{
    total_posts: number;
    unpushed_posts: number;
    pushed_posts: number;
    skipped_posts: number;
    total_subscriptions: number;
    today_posts: number;
    today_messages: number;
    last_update: string | null;
  }> {
    try {
      const [
        totalPosts,
        unpushedPosts,
        pushedPosts,
        skippedPosts,
        totalSubscriptions,
        todayPosts,
        todayMessages,
        lastUpdate
      ] = await Promise.all([
        this.getPostsCount(),
        this.getPostsCountByStatus(0), // 未推送
        this.getPostsCountByStatus(1), // 已推送
        this.getPostsCountByStatus(2), // 无需推送
        this.getSubscriptionsCount(),
        this.getTodayPostsCount(),
        this.getTodayMessagesCount(),
        this.getLastUpdateTime()
      ]);

      return {
        total_posts: totalPosts,
        unpushed_posts: unpushedPosts,
        pushed_posts: pushedPosts,
        skipped_posts: skippedPosts,
        total_subscriptions: totalSubscriptions,
        today_posts: todayPosts,
        today_messages: todayMessages,
        last_update: lastUpdate
      };
    } catch (error) {
      console.error('获取综合统计信息失败:', error);
      return {
        total_posts: 0,
        unpushed_posts: 0,
        pushed_posts: 0,
        skipped_posts: 0,
        total_subscriptions: 0,
        today_posts: 0,
        today_messages: 0,
        last_update: null
      };
    }
  }

  /**
   * 清理24小时以外的所有post数据
   */
  async cleanupOldPosts(): Promise<{ deletedCount: number }> {
    try {
      // 计算24小时前的时间戳
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      console.log(`开始清理 ${twentyFourHoursAgo} 之前的post数据...`);
      
      // 先查询要删除的记录数量
      const countResult = await this.db.prepare(`
        SELECT COUNT(*) as count FROM posts 
        WHERE created_at < datetime('now', '-24 hours')
      `).first<{ count: number }>();
      
      const deletedCount = countResult?.count || 0;
      
      if (deletedCount === 0) {
        console.log('没有需要清理的过期post数据');
        return { deletedCount: 0 };
      }
      
      // 执行删除操作
      await this.db.prepare(`
        DELETE FROM posts 
        WHERE created_at < datetime('now', '-24 hours')
      `).run();
      
      // 清理相关缓存
      this.clearCacheByPattern('posts');
      this.clearCacheByPattern('getPostsCount');
      this.clearCacheByPattern('getComprehensiveStats');
      
      console.log(`成功清理了 ${deletedCount} 条过期的post数据`);
      
      return { deletedCount };
    } catch (error) {
      console.error('清理过期post数据失败:', error);
      throw error;
    }
  }

}
