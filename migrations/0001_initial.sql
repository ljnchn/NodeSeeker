-- 配置表
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
);

-- posts 表
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
);

-- 为 posts 表创建性能优化索引
CREATE INDEX IF NOT EXISTS idx_posts_post_id ON posts(post_id);
CREATE INDEX IF NOT EXISTS idx_posts_push_status ON posts(push_status);
CREATE INDEX IF NOT EXISTS idx_posts_pub_date ON posts(pub_date);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_push_date ON posts(push_date);
CREATE INDEX IF NOT EXISTS idx_posts_creator ON posts(creator);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

-- 复合索引用于常见查询模式
CREATE INDEX IF NOT EXISTS idx_posts_status_date ON posts(push_status, pub_date);
CREATE INDEX IF NOT EXISTS idx_posts_creator_category ON posts(creator, category);

-- keywords_sub 表
CREATE TABLE IF NOT EXISTS keywords_sub (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword1 TEXT DEFAULT NULL,
  keyword2 TEXT DEFAULT NULL,
  keyword3 TEXT DEFAULT NULL,
  creator TEXT NULL,
  category TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 为关键词订阅表添加索引
CREATE INDEX IF NOT EXISTS idx_keywords_sub_creator ON keywords_sub(creator);
CREATE INDEX IF NOT EXISTS idx_keywords_sub_category ON keywords_sub(category);
CREATE INDEX IF NOT EXISTS idx_keywords_sub_created_at ON keywords_sub(created_at);

