import { DatabaseService, Post } from './database';

export interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  creator: string;
  category: string;
  contentSnippet: string;
  content: string;
  guid: string;
}

export interface ParsedPost {
  post_id: number;
  title: string;
  memo: string;
  category: string;
  creator: string;
  pub_date: string;
}

export class RSSService {
  private readonly RSS_URL = 'https://rss.nodeseek.com/';

  constructor(private dbService: DatabaseService) {}

  /**
   * 从 XML 文本中提取标签内容
   */
  private extractTagContent(xml: string, tagName: string): string {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
  }

  /**
   * 从 XML 文本中提取 CDATA 内容
   */
  private extractCDATA(text: string): string {
    const cdataMatch = text.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
    return cdataMatch ? cdataMatch[1] : text;
  }

  /**
   * 解析 RSS XML 数据
   */
  private parseRSSXML(xmlText: string): RSSItem[] {
    try {
      // 提取所有 <item> 元素
      const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
      const items: RSSItem[] = [];
      let match;

      while ((match = itemRegex.exec(xmlText)) !== null) {
        const itemXML = match[1];
        
        // 提取各个字段
        const title = this.extractCDATA(this.extractTagContent(itemXML, 'title'));
        const link = this.extractTagContent(itemXML, 'link');
        const pubDate = this.extractTagContent(itemXML, 'pubDate');
        const creator = this.extractCDATA(this.extractTagContent(itemXML, 'dc:creator'));
        const category = this.extractCDATA(this.extractTagContent(itemXML, 'category'));
        const description = this.extractCDATA(this.extractTagContent(itemXML, 'description'));
        const content = this.extractCDATA(this.extractTagContent(itemXML, 'content:encoded') || description);
        const guid = this.extractTagContent(itemXML, 'guid') || link;

        // 创建清理后的摘要
        let contentSnippet = description.replace(/<[^>]*>/g, '').trim();
        if (contentSnippet.length > 200) {
          contentSnippet = contentSnippet.substring(0, 200) + '...';
        }

        items.push({
          title,
          link,
          pubDate,
          creator,
          category,
          contentSnippet,
          content,
          guid
        });
      }

      return items;
    } catch (error) {
      console.error('RSS XML 解析失败:', error);
      throw new Error(`RSS XML 解析失败: ${error}`);
    }
  }

  /**
   * 抓取并解析 RSS 数据
   */
  async fetchAndParseRSS(): Promise<RSSItem[]> {
    try {
      console.log('开始抓取 RSS 数据...');
      
      const response = await fetch(this.RSS_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.nodeseek.com/',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const xmlText = await response.text();
      const items = this.parseRSSXML(xmlText);
      
      if (!items || items.length === 0) {
        console.log('RSS 数据为空');
        return [];
      }

      console.log(`成功抓取到 ${items.length} 条 RSS 数据`);
      return items;
    } catch (error) {
      console.error('RSS 抓取失败:', error);
      throw new Error(`RSS 抓取失败: ${error}`);
    }
  }

  /**
   * 从链接中提取 post_id
   */
  private extractPostId(link: string): number | null {
    try {
      // NodeSeek 的链接格式通常是 https://www.nodeseek.com/post-{id}-1
      const match = link.match(/post-(\d+)-/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
      
      // 备用方案：从 URL 参数中提取
      const url = new URL(link);
      const id = url.searchParams.get('id');
      if (id) {
        return parseInt(id, 10);
      }
      
      return null;
    } catch (error) {
      console.error('提取 post_id 失败:', error);
      return null;
    }
  }

  /**
   * 清洗和格式化数据
   */
  private cleanAndFormatData(item: RSSItem): ParsedPost | null {
    const postId = this.extractPostId(item.link);
    if (!postId) {
      console.warn('无法提取 post_id:', item.link);
      return null;
    }

    // 清洗标题
    const title = item.title.trim().replace(/\s+/g, ' ');
    
    // 清洗内容摘要
    let memo = item.contentSnippet || item.content || '';
    memo = memo.replace(/<[^>]*>/g, ''); // 移除 HTML 标签
    memo = memo.trim().replace(/\s+/g, ' ');
    memo = memo.substring(0, 500); // 限制长度

    // 清洗分类
    const category = item.category ? item.category.trim() : '';
    
    // 清洗创建者
    const creator = item.creator ? item.creator.trim() : '';

    // 格式化发布时间
    let pubDate: string;
    try {
      const date = new Date(item.pubDate);
      if (isNaN(date.getTime())) {
        pubDate = new Date().toISOString();
      } else {
        pubDate = date.toISOString();
      }
    } catch (error) {
      pubDate = new Date().toISOString();
    }

    return {
      post_id: postId,
      title,
      memo,
      category,
      creator,
      pub_date: pubDate
    };
  }

  /**
   * 处理新的 RSS 数据 - 优化版本，批量查询减少数据库访问
   */
  async processNewRSSData(): Promise<{ processed: number; new: number; errors: number }> {
    try {
      const rssItems = await this.fetchAndParseRSS();
      
      let processed = 0;
      let newPosts = 0;
      let errors = 0;

      // 第一步：批量解析所有RSS项目
      const parsedPosts: ParsedPost[] = [];
      const postIds: number[] = [];

      for (const item of rssItems) {
        try {
          processed++;
          
          const parsedPost = this.cleanAndFormatData(item);
          if (!parsedPost) {
            errors++;
            continue;
          }

          parsedPosts.push(parsedPost);
          postIds.push(parsedPost.post_id);
          
        } catch (error) {
          errors++;
          console.error('解析单条 RSS 数据失败:', error);
        }
      }

      // 第二步：批量查询已存在的文章
      const existingPosts = await this.dbService.getPostsByPostIds(postIds);
      console.log(`批量查询完成: 找到 ${existingPosts.size} 个已存在的文章`);

      // 第三步：筛选出需要创建的新文章
      const newPostsToCreate = parsedPosts.filter(parsedPost => {
        if (existingPosts.has(parsedPost.post_id)) {
          console.log(`文章已存在: ${parsedPost.post_id}`);
          return false;
        }
        return true;
      });

      // 第四步：批量创建新文章
      if (newPostsToCreate.length > 0) {
        try {
          const postsWithDefaults = newPostsToCreate.map(post => ({
            ...post,
            push_status: 0 // 默认未推送
          }));

          const createdCount = await this.dbService.batchCreatePosts(postsWithDefaults);
          newPosts = createdCount;

          console.log(`批量创建完成: 成功创建 ${createdCount} 篇新文章`);
          
          // 记录创建的文章详情
          newPostsToCreate.forEach(post => {
            console.log(`新增文章: ${post.title} (ID: ${post.post_id})`);
          });
          
        } catch (error) {
          errors += newPostsToCreate.length;
          console.error('批量创建文章失败:', error);
        }
      } else {
        console.log('没有新文章需要创建');
      }

      console.log(`RSS 处理完成: 处理 ${processed} 条，新增 ${newPosts} 条，错误 ${errors} 条`);
      
      return {
        processed,
        new: newPosts,
        errors
      };
    } catch (error) {
      console.error('处理 RSS 数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取最新的文章数据（用于测试）
   */
  async getLatestPosts(limit: number = 5): Promise<Post[]> {
    return await this.dbService.getRecentPosts(limit);
  }

  /**
   * 手动触发 RSS 更新
   */
  async manualUpdate(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const result = await this.processNewRSSData();
      return {
        success: true,
        message: `RSS 更新成功`,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: `RSS 更新失败: ${error}`
      };
    }
  }

  /**
   * 验证 RSS 源是否可访问
   */
  async validateRSSSource(): Promise<{ accessible: boolean; message: string }> {
    try {
      const response = await fetch(this.RSS_URL, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'NodeSeeker RSS Bot 1.0'
        }
      });

      if (response.ok) {
        return {
          accessible: true,
          message: 'RSS 源可正常访问'
        };
      } else {
        return {
          accessible: false,
          message: `RSS 源访问失败: HTTP ${response.status}`
        };
      }
    } catch (error) {
      return {
        accessible: false,
        message: `RSS 源访问失败: ${error}`
      };
    }
  }
}
