// D1Database 类型在 worker-configuration.d.ts 中已定义
import { D1Database } from '@cloudflare/workers-types';

export interface BaseConfig {
  id?: number;
  username: string;
  password: string;
  bot_token?: string;
  chat_id: string;
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
  keyword1: string;
  keyword2?: string;
  keyword3?: string;
  creator?: string;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

export class DatabaseService {
  constructor(private db: D1Database) {}

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

      // 创建关键词订阅表
      await this.db.prepare(`
        CREATE TABLE IF NOT EXISTS keywords_sub (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          keyword1 TEXT NOT NULL,
          keyword2 TEXT DEFAULT NULL,
          keyword3 TEXT DEFAULT NULL,
          creator TEXT NULL,
          category TEXT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      console.log('数据库表初始化完成');
    } catch (error) {
      console.error('数据库表初始化失败:', error);
      throw new Error(`数据库表初始化失败: ${error}`);
    }
  }

  // 基础配置相关操作
  async getBaseConfig(): Promise<BaseConfig | null> {
    const result = await this.db.prepare('SELECT * FROM base_config LIMIT 1').first();
    return result as BaseConfig | null;
  }

  async createBaseConfig(config: Omit<BaseConfig, 'id' | 'created_at' | 'updated_at'>): Promise<BaseConfig> {
    const result = await this.db.prepare(`
      INSERT INTO base_config (username, password, bot_token, chat_id, stop_push, only_title)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      config.username,
      config.password,
      config.bot_token || null,
      config.chat_id,
      config.stop_push,
      config.only_title
    ).first();
    
    return result as BaseConfig;
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

    return result as Post;
  }

  async getPostByPostId(postId: number): Promise<Post | null> {
    const result = await this.db.prepare('SELECT * FROM posts WHERE post_id = ?').bind(postId).first();
    return result as Post | null;
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
    
    return result.results as Post[];
  }

  async getUnpushedPosts(): Promise<Post[]> {
    const result = await this.db.prepare(`
      SELECT * FROM posts 
      WHERE push_status = 0 
      ORDER BY pub_date ASC
    `).all();
    
    return result.results as Post[];
  }

  // 关键词订阅相关操作
  async createKeywordSub(sub: Omit<KeywordSub, 'id' | 'created_at' | 'updated_at'>): Promise<KeywordSub> {
    const result = await this.db.prepare(`
      INSERT INTO keywords_sub (keyword1, keyword2, keyword3, creator, category)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `).bind(
      sub.keyword1,
      sub.keyword2 || null,
      sub.keyword3 || null,
      sub.creator || null,
      sub.category || null
    ).first();

    return result as KeywordSub;
  }

  async getAllKeywordSubs(): Promise<KeywordSub[]> {
    const result = await this.db.prepare('SELECT * FROM keywords_sub ORDER BY created_at DESC').all();
    return result.results as KeywordSub[];
  }

  async deleteKeywordSub(id: number): Promise<boolean> {
    const result = await this.db.prepare('DELETE FROM keywords_sub WHERE id = ?').bind(id).run();
    return result.changes > 0;
  }

  async updateKeywordSub(id: number, sub: Partial<Omit<KeywordSub, 'id' | 'created_at' | 'updated_at'>>): Promise<KeywordSub | null> {
    const updates: string[] = [];
    const values: any[] = [];

    if (sub.keyword1 !== undefined) {
      updates.push('keyword1 = ?');
      values.push(sub.keyword1);
    }
    if (sub.keyword2 !== undefined) {
      updates.push('keyword2 = ?');
      values.push(sub.keyword2);
    }
    if (sub.keyword3 !== undefined) {
      updates.push('keyword3 = ?');
      values.push(sub.keyword3);
    }
    if (sub.creator !== undefined) {
      updates.push('creator = ?');
      values.push(sub.creator);
    }
    if (sub.category !== undefined) {
      updates.push('category = ?');
      values.push(sub.category);
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
}
