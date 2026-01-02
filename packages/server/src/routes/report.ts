/**
 * 数据上报路由
 */
import { Router, Request, Response } from 'express';
import { getDB } from '../db';
import { generateFingerprint } from '../services/error-aggregation';
import { checkAndTriggerAlerts } from '../services/alert';
import { websocketService } from '../services/websocket';
import { Pool } from 'pg';

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
  sessionReplay?: unknown;
}

/** 性能数据 */
interface PerformanceData {
  fp?: number;
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  domReady?: number;
  load?: number;
  longTasks?: unknown[];
  resources?: unknown[];
  webVitalsScore?: unknown;
  url: string;
  timestamp: number;
}

/** 上报请求体 */
interface ReportBody {
  dsn: string;
  events: (ErrorEvent | PerformanceData)[];
}

/** 数据上报接口 */
router.post('/report', async (req: Request, res: Response) => {
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
        await saveErrorEvent(db, body.dsn, event);
        errorCount++;
      } else if (isPerformanceData(event)) {
        await savePerformanceData(db, body.dsn, event);
        perfCount++;
      }
    }
    
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
async function saveErrorEvent(db: Pool, dsn: string, event: ErrorEvent): Promise<void> {
  const { fingerprint, normalizedMessage } = generateFingerprint(event);
  
  // 检查是否已存在相同指纹的错误
  const existing = await db.query(
    'SELECT id, count FROM errors WHERE dsn = $1 AND fingerprint = $2',
    [dsn, fingerprint]
  );
  
  const isNew = existing.rows.length === 0;
  let count = 1;
  let errorId: number;
  
  if (!isNew) {
    // 更新计数和最后出现时间
    const { id, count: existingCount } = existing.rows[0];
    count = existingCount + 1;
    errorId = id;
    await db.query(
      'UPDATE errors SET count = $1, timestamp = $2, breadcrumbs = $3, session_replay = $4 WHERE id = $5',
      [
        count, 
        event.timestamp, 
        event.breadcrumbs ? JSON.stringify(event.breadcrumbs) : null,
        event.sessionReplay ? JSON.stringify(event.sessionReplay) : null,
        id
      ]
    );
    console.log(`[Report] 错误聚合: fingerprint=${fingerprint}, count=${count}`);
  } else {
    // 插入新记录
    const result = await db.query(`
      INSERT INTO errors (dsn, type, message, stack, filename, lineno, colno, url, breadcrumbs, session_replay, timestamp, fingerprint, normalized_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
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
      event.sessionReplay ? JSON.stringify(event.sessionReplay) : null,
      event.timestamp,
      fingerprint,
      normalizedMessage
    ]);
    errorId = result.rows[0].id;
    console.log(`[Report] 新错误: fingerprint=${fingerprint}, type=${event.type}`);
  }

  // 🚀 WebSocket 实时推送
  try {
    const websocketMessage = {
      type: 'error' as const,
      data: {
        id: errorId,
        type: event.type,
        message: event.message,
        stack: event.stack,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        url: event.url,
        fingerprint,
        normalizedMessage,
        count,
        isNew,
        timestamp: event.timestamp,
        breadcrumbs: event.breadcrumbs,
        sessionReplay: event.sessionReplay
      },
      dsn,
      timestamp: Date.now()
    };
    
    websocketService.broadcast(dsn, websocketMessage);
    console.log(`[Report] WebSocket 推送: ${isNew ? '新错误' : '错误更新'} - ${event.type}`);
  } catch (wsError) {
    console.error('[Report] WebSocket 推送失败:', wsError);
    // WebSocket 推送失败不影响数据保存
  }

  // 检查并触发告警
  checkAndTriggerAlerts({
    dsn,
    type: event.type,
    message: event.message,
    fingerprint,
    url: event.url,
    isNew,
    count
  }).catch(err => console.error('[Report] Alert check failed:', err));
}

/** 保存性能数据 */
async function savePerformanceData(db: Pool, dsn: string, data: PerformanceData): Promise<void> {
  const result = await db.query(`
    INSERT INTO performance (dsn, fp, fcp, lcp, fid, cls, ttfb, dom_ready, load, long_tasks, resources, web_vitals_score, url, timestamp)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id
  `, [
    dsn,
    data.fp ?? null,
    data.fcp ?? null,
    data.lcp ?? null,
    data.fid ?? null,
    data.cls ?? null,
    data.ttfb ?? null,
    data.domReady ?? null,
    data.load ?? null,
    data.longTasks ? JSON.stringify(data.longTasks) : null,
    data.resources ? JSON.stringify(data.resources) : null,
    data.webVitalsScore ? JSON.stringify(data.webVitalsScore) : null,
    data.url,
    data.timestamp
  ]);

  const performanceId = result.rows[0].id;

  // 🚀 WebSocket 实时推送性能数据
  try {
    const websocketMessage = {
      type: 'performance' as const,
      data: {
        id: performanceId,
        fp: data.fp,
        fcp: data.fcp,
        lcp: data.lcp,
        fid: data.fid,
        cls: data.cls,
        ttfb: data.ttfb,
        domReady: data.domReady,
        load: data.load,
        longTasks: data.longTasks,
        resources: data.resources,
        webVitalsScore: data.webVitalsScore,
        url: data.url,
        timestamp: data.timestamp
      },
      dsn,
      timestamp: Date.now()
    };
    
    websocketService.broadcast(dsn, websocketMessage);
    console.log(`[Report] WebSocket 推送: 性能数据 - ${data.url}`);
  } catch (wsError) {
    console.error('[Report] WebSocket 推送失败:', wsError);
    // WebSocket 推送失败不影响数据保存
  }
}

export default router;
