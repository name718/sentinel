/**
 * 数据上报路由
 */
import { Router, Request, Response } from 'express';
import { getDB, saveDB } from '../db';
import { generateFingerprint } from '../services/error-aggregation';
import type { Database } from 'sql.js';

const router: Router = Router();

/** 错误事件 */
interface ErrorEvent {
  type: string;
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  timestamp: number;
  url: string;
  breadcrumbs?: unknown[];
}

/** 性能数据 */
interface PerformanceData {
  fp?: number;
  fcp?: number;
  lcp?: number;
  ttfb?: number;
  domReady?: number;
  load?: number;
  longTasks?: unknown[];
  url: string;
  timestamp: number;
}

/** 上报请求体 */
interface ReportBody {
  dsn: string;
  events: (ErrorEvent | PerformanceData)[];
}

/** 数据上报接口 */
router.post('/report', (req: Request, res: Response) => {
  const body = req.body as ReportBody;
  
  if (!body.dsn) {
    return res.status(400).json({ error: 'dsn is required' });
  }
  if (!body.events || !Array.isArray(body.events)) {
    return res.status(400).json({ error: 'events must be an array' });
  }

  const db = getDB();
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    let errorCount = 0;
    let perfCount = 0;

    for (const event of body.events) {
      if (isErrorEvent(event)) {
        saveErrorEvent(db, body.dsn, event);
        errorCount++;
      } else if (isPerformanceData(event)) {
        savePerformanceData(db, body.dsn, event);
        perfCount++;
      }
    }
    
    saveDB();
    res.json({ 
      success: true, 
      count: body.events.length,
      errors: errorCount,
      performance: perfCount
    });
  } catch (error) {
    console.error('[Report] Error saving data:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

/** 判断是否为错误事件 */
function isErrorEvent(event: unknown): event is ErrorEvent {
  return typeof event === 'object' && 
         event !== null && 
         'type' in event && 
         'message' in event;
}

/** 判断是否为性能数据 */
function isPerformanceData(event: unknown): event is PerformanceData {
  return typeof event === 'object' && 
         event !== null && 
         'url' in event && 
         !('type' in event);
}

/** 保存错误事件 */
function saveErrorEvent(db: Database, dsn: string, event: ErrorEvent): void {
  const { fingerprint, normalizedMessage } = generateFingerprint(event);
  
  // 检查是否已存在相同指纹的错误
  const existing = db.exec(
    'SELECT id, count FROM errors WHERE dsn = ? AND fingerprint = ?',
    [dsn, fingerprint]
  );
  
  if (existing.length > 0 && existing[0].values.length > 0) {
    // 更新计数和最后出现时间
    const id = existing[0].values[0][0];
    const count = (existing[0].values[0][1] as number) + 1;
    db.run(
      'UPDATE errors SET count = ?, timestamp = ?, breadcrumbs = ? WHERE id = ?',
      [count, event.timestamp, event.breadcrumbs ? JSON.stringify(event.breadcrumbs) : null, id]
    );
    console.log(`[Report] 错误聚合: fingerprint=${fingerprint}, count=${count}`);
  } else {
    // 插入新记录
    db.run(`
      INSERT INTO errors (dsn, type, message, stack, filename, lineno, colno, url, breadcrumbs, timestamp, fingerprint, normalized_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      dsn,
      event.type,
      event.message,
      event.stack || null,
      event.filename || null,
      event.lineno || null,
      event.colno || null,
      event.url,
      event.breadcrumbs ? JSON.stringify(event.breadcrumbs) : null,
      event.timestamp,
      fingerprint,
      normalizedMessage
    ]);
    console.log(`[Report] 新错误: fingerprint=${fingerprint}, type=${event.type}`);
  }
}

/** 保存性能数据 */
function savePerformanceData(db: Database, dsn: string, data: PerformanceData): void {
  db.run(`
    INSERT INTO performance (dsn, fp, fcp, lcp, ttfb, dom_ready, load, long_tasks, url, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    dsn,
    data.fp ?? null,
    data.fcp ?? null,
    data.lcp ?? null,
    data.ttfb ?? null,
    data.domReady ?? null,
    data.load ?? null,
    data.longTasks ? JSON.stringify(data.longTasks) : null,
    data.url,
    data.timestamp
  ]);
}

export default router;
