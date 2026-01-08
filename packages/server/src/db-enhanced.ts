/**
 * PostgreSQL 数据库连接模块 - 增强版
 * 使用 Neon 云数据库
 */
import { config } from 'dotenv';
import { Pool, PoolClient, QueryResult, PoolConfig } from 'pg';
import { createModuleLogger } from './utils/logger';

// 加载环境变量
config({ path: '.env.local' });

const logger = createModuleLogger('Database');

// 数据库连接池
let pool: Pool | null = null;
let isShuttingDown = false;

// 数据库连接字符串（从环境变量读取）
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// 连接池配置
const poolConfig: PoolConfig = {
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: parseInt(process.env.DB_POOL_MAX || '20'), // 最大连接数
  min: parseInt(process.env.DB_POOL_MIN || '2'),  // 最小连接数
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 空闲超时
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'), // 连接超时
  acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'), // 获取连接超时
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000'), // 语句超时
  query_timeout: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'), // 查询超时
};

/** 初始化数据库连接 */
export async function initDB(): Promise<Pool> {
  if (pool && !isShuttingDown) {
    logger.debug('Database pool already exists');
    return pool;
  }

  try {
    logger.info('Initializing database connection pool', { config: { ...poolConfig, connectionString: '[HIDDEN]' } });
    
    pool = new Pool(poolConfig);

    // 连接池事件监听
    pool.on('connect', (client) => {
      logger.debug('New client connected to database');
    });

    pool.on('acquire', (client) => {
      logger.debug('Client acquired from pool');
    });

    pool.on('remove', (client) => {
      logger.debug('Client removed from pool');
    });

    pool.on('error', (err, client) => {
      logger.error('Database pool error', { error: err.message }, err);
      
      // 如果是连接错误，尝试重新初始化
      if (err.message.includes('Connection terminated') || err.message.includes('ECONNRESET')) {
        logger.warn('Connection lost, will attempt to reconnect on next query');
      }
    });

    // 测试连接（带重试）
    await testConnection();
    
    // 创建表
    await createTables();
    
    logger.info('Database initialized successfully');
    return pool;
  } catch (error) {
    logger.error('Failed to initialize database', {}, error as Error);
    throw error;
  }
}

/** 测试数据库连接 */
async function testConnection(): Promise<void> {
  const maxRetries = 3;
  const retryDelay = 2000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!pool) throw new Error('Pool not initialized');
      
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();
      
      logger.info('Database connection test successful', { 
        serverTime: result.rows[0].current_time,
        attempt 
      });
      return;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.warn(`Connection test failed (attempt ${attempt}/${maxRetries})`, { 
        error: errorMsg,
        willRetry: attempt < maxRetries 
      });
      
      if (attempt === maxRetries) {
        throw new Error(`Database connection failed after ${maxRetries} attempts: ${errorMsg}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
}

/** 创建表 */
async function createTables(): Promise<void> {
  if (!pool) throw new Error('Database pool not initialized');
  
  const client = await pool.connect();
  
  try {
    logger.info('Creating/verifying database tables');
    
    // 开始事务
    await client.query('BEGIN');
    
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
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_errors_dsn_timestamp ON errors(dsn, timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_errors_fingerprint ON errors(fingerprint)',
      'CREATE INDEX IF NOT EXISTS idx_errors_status ON errors(status)',
      'CREATE INDEX IF NOT EXISTS idx_errors_dsn_status ON errors(dsn, status)',
      'CREATE INDEX IF NOT EXISTS idx_performance_dsn_timestamp ON performance(dsn, timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_projects_dsn ON projects(dsn)',
      'CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id)',
      'CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id)'
    ];

    for (const indexQuery of indexes) {
      await client.query(indexQuery);
    }
    
    // 提交事务
    await client.query('COMMIT');
    
    logger.info('Database tables and indexes created/verified successfully');
  } catch (error) {
    // 回滚事务
    await client.query('ROLLBACK');
    logger.error('Failed to create database tables', {}, error as Error);
    throw error;
  } finally {
    client.release();
  }
}

/** 获取数据库连接池 */
export function getDB(): Pool | null {
  if (isShuttingDown) {
    logger.warn('Database is shutting down, returning null');
    return null;
  }
  return pool;
}

/** 执行查询（带重试和错误处理） */
export async function query(
  sql: string, 
  params?: (string | number | boolean | null | string[])[]
): Promise<QueryResult> {
  if (!pool || isShuttingDown) {
    throw new Error('Database not available');
  }
  
  const startTime = Date.now();
  const maxRetries = 2;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await pool.query(sql, params);
      const duration = Date.now() - startTime;
      
      if (duration > 1000) {
        logger.warn('Slow query detected', { 
          sql: sql.substring(0, 100) + '...', 
          duration,
          rowCount: result.rowCount 
        });
      } else {
        logger.debug('Query executed', { 
          duration,
          rowCount: result.rowCount,
          attempt: attempt > 0 ? attempt + 1 : undefined
        });
      }
      
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const isRetryableError = errorMsg.includes('Connection terminated') || 
                              errorMsg.includes('ECONNRESET') ||
                              errorMsg.includes('connection is closed');
      
      if (attempt < maxRetries && isRetryableError) {
        logger.warn(`Query failed, retrying (attempt ${attempt + 1}/${maxRetries + 1})`, { 
          error: errorMsg,
          sql: sql.substring(0, 100) + '...'
        });
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        continue;
      }
      
      logger.error('Query failed', { 
        sql: sql.substring(0, 100) + '...',
        params: params?.length,
        attempt: attempt + 1,
        error: errorMsg
      }, error as Error);
      
      throw error;
    }
  }
  
  throw new Error('Query failed after all retries');
}

/** 执行事务 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  if (!pool || isShuttingDown) {
    throw new Error('Database not available');
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    logger.debug('Transaction started');
    
    const result = await callback(client);
    
    await client.query('COMMIT');
    logger.debug('Transaction committed');
    
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.warn('Transaction rolled back', { error: (error as Error).message });
    throw error;
  } finally {
    client.release();
  }
}

/** 健康检查 */
export async function healthCheck(): Promise<{ 
  status: 'healthy' | 'unhealthy', 
  details: any 
}> {
  try {
    if (!pool || isShuttingDown) {
      return { 
        status: 'unhealthy', 
        details: { error: 'Database not available' } 
      };
    }
    
    const startTime = Date.now();
    const result = await pool.query('SELECT 1 as health_check');
    const responseTime = Date.now() - startTime;
    
    const poolStats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };
    
    return {
      status: 'healthy',
      details: {
        responseTime,
        poolStats,
        serverTime: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error('Database health check failed', {}, error as Error);
    return {
      status: 'unhealthy',
      details: { 
        error: (error as Error).message 
      }
    };
  }
}

/** 优雅关闭数据库连接 */
export async function closeDB(): Promise<void> {
  if (!pool) {
    logger.info('Database already closed');
    return;
  }
  
  logger.info('Closing database connections...');
  isShuttingDown = true;
  
  try {
    // 等待所有活跃查询完成（最多等待10秒）
    const timeout = setTimeout(() => {
      logger.warn('Force closing database connections due to timeout');
    }, 10000);
    
    await pool.end();
    clearTimeout(timeout);
    
    pool = null;
    isShuttingDown = false;
    
    logger.info('Database connections closed successfully');
  } catch (error) {
    logger.error('Error closing database connections', {}, error as Error);
    throw error;
  }
}

// 兼容旧代码的空函数
export function saveDB(): void {
  // PostgreSQL 自动持久化，无需手动保存
}