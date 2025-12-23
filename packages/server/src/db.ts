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
    connectionTimeoutMillis: 10000,
  });

  // 测试连接
  try {
    const client = await pool.connect();
    console.log('[DB] Connected to PostgreSQL (Neon)');
    
    // 创建表
    await createTables(client);
    client.release();
    
    return pool;
  } catch (error) {
    console.error('[DB] Connection failed:', error);
    throw error;
  }
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
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

  // 创建索引
  await client.query('CREATE INDEX IF NOT EXISTS idx_errors_dsn_timestamp ON errors(dsn, timestamp)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_errors_fingerprint ON errors(fingerprint)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_performance_dsn_timestamp ON performance(dsn, timestamp)');
  
  console.log('[DB] Tables created/verified');
}

/** 获取数据库连接池 */
export function getDB(): Pool | null {
  return pool;
}

/** 执行查询 */
export async function query(sql: string, params?: (string | number | null)[]): Promise<QueryResult> {
  if (!pool) throw new Error('Database not initialized');
  return pool.query(sql, params);
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
