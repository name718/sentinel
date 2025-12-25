/**
 * PostgreSQL 数据库连接模块
 * 使用 Neon 云数据库
 */
import { config } from 'dotenv';
import { Pool, PoolClient, QueryResult } from 'pg';

// 加载环境变量
config({ path: '.env.local' });

// 数据库连接池
let pool: Pool | null = null;

// 数据库连接字符串（从环境变量读取）
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

/** 初始化数据库连接 */
export async function initDB(): Promise<Pool> {
  if (pool) return pool;

  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  });

  // 处理连接错误，自动重连
  pool.on('error', (err) => {
    console.error('[DB] Pool error:', err.message);
  });

  // 测试连接（带重试）
  let retries = 3;
  while (retries > 0) {
    try {
      const client = await pool.connect();
      console.log('[DB] Connected to PostgreSQL (Neon)');
      
      // 创建表
      await createTables(client);
      client.release();
      
      return pool;
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error('[DB] Connection failed after 3 attempts:', error);
        throw error;
      }
      console.log(`[DB] Connection failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  throw new Error('Database connection failed');
}

/** 创建表 */
async function createTables(client: PoolClient): Promise<void> {
  // 错误表
  await client.query(`
    CREATE TABLE IF NOT EXISTS errors (
      id SERIAL PRIMARY KEY,
      dsn TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      normalized_message TEXT,
      stack TEXT,
      filename TEXT,
      lineno INTEGER,
      colno INTEGER,
      url TEXT NOT NULL,
      breadcrumbs JSONB,
      session_replay JSONB,
      timestamp BIGINT NOT NULL,
      first_seen BIGINT,
      fingerprint TEXT,
      count INTEGER DEFAULT 1,
      status VARCHAR(20) DEFAULT 'open',
      resolved_at TIMESTAMP,
      resolved_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 添加 status 字段（如果不存在）
  await client.query(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'errors' AND column_name = 'status') THEN
        ALTER TABLE errors ADD COLUMN status VARCHAR(20) DEFAULT 'open';
        ALTER TABLE errors ADD COLUMN resolved_at TIMESTAMP;
        ALTER TABLE errors ADD COLUMN resolved_by TEXT;
      END IF;
    END $$;
  `);

  // 性能表
  await client.query(`
    CREATE TABLE IF NOT EXISTS performance (
      id SERIAL PRIMARY KEY,
      dsn TEXT NOT NULL,
      fp INTEGER,
      fcp INTEGER,
      lcp INTEGER,
      fid INTEGER,
      cls REAL,
      ttfb INTEGER,
      dom_ready INTEGER,
      load INTEGER,
      long_tasks JSONB,
      resources JSONB,
      web_vitals_score JSONB,
      url TEXT NOT NULL,
      timestamp BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // SourceMap 表
  await client.query(`
    CREATE TABLE IF NOT EXISTS sourcemaps (
      id SERIAL PRIMARY KEY,
      dsn TEXT NOT NULL,
      version TEXT NOT NULL,
      filename TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(dsn, version, filename)
    )
  `);

  // 用户表
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(20) DEFAULT 'developer',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 项目表
  await client.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      dsn VARCHAR(100) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      platform VARCHAR(50) DEFAULT 'web',
      owner_id INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 项目成员表
  await client.query(`
    CREATE TABLE IF NOT EXISTS project_members (
      id SERIAL PRIMARY KEY,
      project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) DEFAULT 'member',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, user_id)
    )
  `);

  // 订阅者表（官网邮箱收集）
  await client.query(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      source VARCHAR(50) DEFAULT 'website',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建索引
  await client.query('CREATE INDEX IF NOT EXISTS idx_errors_dsn_timestamp ON errors(dsn, timestamp)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_errors_fingerprint ON errors(fingerprint)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_errors_status ON errors(status)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_performance_dsn_timestamp ON performance(dsn, timestamp)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_projects_dsn ON projects(dsn)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id)');
  
  console.log('[DB] Tables created/verified');
}

/** 获取数据库连接池 */
export function getDB(): Pool | null {
  return pool;
}

/** 执行查询（带重试） */
export async function query(sql: string, params?: (string | number | boolean | null | string[])[]): Promise<QueryResult> {
  if (!pool) throw new Error('Database not initialized');
  
  let retries = 2;
  while (retries >= 0) {
    try {
      return await pool.query(sql, params);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (retries > 0 && errorMessage.includes('Connection terminated')) {
        retries--;
        console.log('[DB] Connection lost, retrying query...');
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Query failed after retries');
}

/** 关闭数据库连接 */
export async function closeDB(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[DB] Connection closed');
  }
}

// 兼容旧代码的空函数
export function saveDB(): void {
  // PostgreSQL 自动持久化，无需手动保存
}
