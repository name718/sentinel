import { Router } from 'express';
import { getDB, saveDB, generateFingerprint } from '../db';

const router = Router();

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

interface ReportBody {
  dsn: string;
  events: (ErrorEvent | PerformanceData)[];
}

/** 数据上报接口 */
router.post('/report', (req, res) => {
  const body = req.body as ReportBody;
  
  // 验证必填字段
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
    for (const event of body.events) {
      if (isErrorEvent(event)) {
        saveErrorEvent(db, body.dsn, event);
      } else if (isPerformanceData(event)) {
        savePerformanceData(db, body.dsn, event);
      }
    }
    
    saveDB();
    res.json({ success: true, count: body.events.length });
  } catch (error) {
    console.error('[Report] Error saving data:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

/** 判断是否为错误事件 */
function isErrorEvent(event: unknown): event is ErrorEvent {
  return typeof event === 'object' && event !== null && 'type' in event && 'message' in event;
}

/** 判断是否为性能数据 */
function isPerformanceData(event: unknown): event is PerformanceData {
  return typeof event === 'object' && event !== null && 'url' in event && !('type' in event);
}

/** 保存错误事件 */
function saveErrorEvent(db: ReturnType<typeof getDB>, dsn: string, event: ErrorEvent): void {
  if (!db) return;
  
  const fingerprint = generateFingerprint(event);
  
  // 检查是否已存在相同指纹的错误
  const existing = db.exec(
    `SELECT id, count FROM errors WHERE dsn = ? AND fingerprint = ?`,
    [dsn, fingerprint]
  );
  
  if (existing.length > 0 && existing[0].values.length > 0) {
    // 更新计数
    const id = existing[0].values[0][0];
    const count = (existing[0].values[0][1] as number) + 1;
    db.run(`UPDATE errors SET count = ?, timestamp = ? WHERE id = ?`, [count, event.timestamp, id]);
  } else {
    // 插入新记录
    db.run(`
      INSERT INTO errors (dsn, type, message, stack, filename, lineno, colno, url, breadcrumbs, timestamp, fingerprint)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      fingerprint
    ]);
  }
}

/** 保存性能数据 */
function savePerformanceData(db: ReturnType<typeof getDB>, dsn: string, data: PerformanceData): void {
  if (!db) return;
  
  db.run(`
    INSERT INTO performance (dsn, fp, fcp, lcp, ttfb, dom_ready, load, long_tasks, url, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    dsn,
    data.fp || null,
    data.fcp || null,
    data.lcp || null,
    data.ttfb || null,
    data.domReady || null,
    data.load || null,
    data.longTasks ? JSON.stringify(data.longTasks) : null,
    data.url,
    data.timestamp
  ]);
}

export default router;
