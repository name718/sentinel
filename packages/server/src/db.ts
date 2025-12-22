import initSqlJs, { Database } from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

let db: Database | null = null;
const DB_PATH = path.join(process.cwd(), 'monitor.db');

/** 初始化数据库 */
export async function initDB(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();
  
  // 尝试加载已有数据库
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
    createTables(db);
  }

  return db;
}

/** 创建表 */
function createTables(db: Database): void {
  db.run(`
    CREATE TABLE IF NOT EXISTS errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dsn TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      normalized_message TEXT,
      stack TEXT,
      filename TEXT,
      lineno INTEGER,
      colno INTEGER,
      url TEXT NOT NULL,
      breadcrumbs TEXT,
      timestamp INTEGER NOT NULL,
      first_seen INTEGER,
      fingerprint TEXT,
      count INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS performance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dsn TEXT NOT NULL,
      fp INTEGER,
      fcp INTEGER,
      lcp INTEGER,
      fid INTEGER,
      cls REAL,
      ttfb INTEGER,
      dom_ready INTEGER,
      load INTEGER,
      long_tasks TEXT,
      resources TEXT,
      web_vitals_score TEXT,
      url TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sourcemaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dsn TEXT NOT NULL,
      version TEXT NOT NULL,
      filename TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(dsn, version, filename)
    )
  `);

  // 创建索引
  db.run('CREATE INDEX IF NOT EXISTS idx_errors_dsn_timestamp ON errors(dsn, timestamp)');
  db.run('CREATE INDEX IF NOT EXISTS idx_errors_fingerprint ON errors(fingerprint)');
  db.run('CREATE INDEX IF NOT EXISTS idx_performance_dsn_timestamp ON performance(dsn, timestamp)');
}

/** 保存数据库到文件 */
export function saveDB(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/** 获取数据库实例 */
export function getDB(): Database | null {
  return db;
}
