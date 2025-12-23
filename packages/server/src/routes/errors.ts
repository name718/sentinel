/**
 * 错误查询路由
 */
import { Router, Request, Response } from 'express';
import { getDB } from '../db';
import { parseStack } from '../services/sourcemap';
import { normalizeMessage, extractStackSignature } from '../services/error-aggregation';

const router: Router = Router();

/** 解析错误记录 */
function parseErrorRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    dsn: row.dsn,
    type: row.type,
    message: row.message,
    normalizedMessage: row.normalized_message,
    stack: row.stack,
    filename: row.filename,
    lineno: row.lineno,
    colno: row.colno,
    url: row.url,
    breadcrumbs: row.breadcrumbs || [],
    sessionReplay: row.session_replay || null,
    timestamp: Number(row.timestamp),
    firstSeen: row.first_seen ? Number(row.first_seen) : null,
    fingerprint: row.fingerprint,
    count: row.count,
    createdAt: row.created_at
  };
}

/** 错误列表查询 */
router.get('/errors', async (req: Request, res: Response) => {
  const { dsn, startTime, endTime, type, page = '1', pageSize = '20' } = req.query;
  
  if (!dsn) {
    return res.status(400).json({ error: 'dsn is required' });
  }

  const db = getDB();
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    let sql = 'SELECT * FROM errors WHERE dsn = $1';
    let countSql = 'SELECT COUNT(*) FROM errors WHERE dsn = $1';
    const params: (string | number)[] = [dsn as string];
    let paramIndex = 2;

    if (startTime) {
      sql += ` AND timestamp >= $${paramIndex}`;
      countSql += ` AND timestamp >= $${paramIndex}`;
      params.push(Number(startTime));
      paramIndex++;
    }
    if (endTime) {
      sql += ` AND timestamp <= $${paramIndex}`;
      countSql += ` AND timestamp <= $${paramIndex}`;
      params.push(Number(endTime));
      paramIndex++;
    }
    if (type) {
      sql += ` AND type = $${paramIndex}`;
      countSql += ` AND type = $${paramIndex}`;
      params.push(type as string);
      paramIndex++;
    }

    // 获取总数
    const countResult = await db.query(countSql, params);
    const total = parseInt(countResult.rows[0].count, 10);

    // 分页
    const offset = (Number(page) - 1) * Number(pageSize);
    sql += ` ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(pageSize), offset);

    const result = await db.query(sql, params);
    const list = result.rows.map(parseErrorRow);

    res.json({ total, list, page: Number(page), pageSize: Number(pageSize) });
  } catch (error) {
    console.error('[Errors] Query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

/** 错误详情 */
router.get('/errors/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { version } = req.query;
  
  const db = getDB();
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    const result = await db.query('SELECT * FROM errors WHERE id = $1', [Number(id)]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Error not found' });
    }

    const errorRecord = parseErrorRow(result.rows[0]);
    const responseData: Record<string, unknown> = { ...errorRecord, parsedStack: null };

    // 如果有堆栈信息，尝试解析 SourceMap
    if (errorRecord.stack) {
      try {
        responseData.parsedStack = await parseStack(
          errorRecord.stack,
          errorRecord.dsn,
          version as string | undefined
        );
      } catch (parseError) {
        console.error('[Errors] SourceMap parse failed:', parseError);
      }
    }

    res.json(responseData);
  } catch (error) {
    console.error('[Errors] Query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

/** 错误趋势统计 */
router.get('/errors/stats/trend', async (req: Request, res: Response) => {
  const { dsn, startTime, endTime } = req.query;
  
  if (!dsn) {
    return res.status(400).json({ error: 'dsn is required' });
  }

  const db = getDB();
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    let sql = `
      SELECT 
        TO_CHAR(TO_TIMESTAMP(timestamp / 1000), 'YYYY-MM-DD HH24:00:00') as time_bucket,
        COUNT(*) as count
      FROM errors 
      WHERE dsn = $1
    `;
    const params: (string | number)[] = [dsn as string];
    let paramIndex = 2;

    if (startTime) {
      sql += ` AND timestamp >= $${paramIndex}`;
      params.push(Number(startTime));
      paramIndex++;
    }
    if (endTime) {
      sql += ` AND timestamp <= $${paramIndex}`;
      params.push(Number(endTime));
      paramIndex++;
    }

    sql += ' GROUP BY time_bucket ORDER BY time_bucket';

    const result = await db.query(sql, params);
    const trend = result.rows.map(row => ({ 
      time: row.time_bucket, 
      count: parseInt(row.count, 10) 
    }));

    res.json({ trend });
  } catch (error) {
    console.error('[Errors] Stats query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

/** 错误分组统计 */
router.get('/errors/stats/groups', async (req: Request, res: Response) => {
  const { dsn, startTime, endTime, limit = '20' } = req.query;
  
  if (!dsn) {
    return res.status(400).json({ error: 'dsn is required' });
  }

  const db = getDB();
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    let sql = `
      SELECT 
        fingerprint, type, message,
        SUM(count) as total_count,
        MIN(timestamp) as first_seen,
        MAX(timestamp) as last_seen,
        COUNT(DISTINCT url) as affected_urls
      FROM errors 
      WHERE dsn = $1
    `;
    const params: (string | number)[] = [dsn as string];
    let paramIndex = 2;

    if (startTime) {
      sql += ` AND timestamp >= $${paramIndex}`;
      params.push(Number(startTime));
      paramIndex++;
    }
    if (endTime) {
      sql += ` AND timestamp <= $${paramIndex}`;
      params.push(Number(endTime));
      paramIndex++;
    }

    sql += ` GROUP BY fingerprint, type, message ORDER BY total_count DESC LIMIT $${paramIndex}`;
    params.push(Number(limit));

    const result = await db.query(sql, params);
    const groups = result.rows.map(row => ({
      fingerprint: row.fingerprint,
      type: row.type,
      message: row.message,
      normalizedMessage: normalizeMessage(row.message),
      totalCount: parseInt(row.total_count, 10),
      firstSeen: Number(row.first_seen),
      lastSeen: Number(row.last_seen),
      affectedUrls: parseInt(row.affected_urls, 10)
    }));

    res.json({ groups });
  } catch (error) {
    console.error('[Errors] Groups query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

/** 获取错误堆栈签名 */
router.get('/errors/:id/signature', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const db = getDB();
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    const result = await db.query('SELECT stack FROM errors WHERE id = $1', [Number(id)]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Error not found' });
    }

    const stack = result.rows[0].stack;
    const signature = stack ? extractStackSignature(stack) : null;
    
    res.json({ signature });
  } catch (error) {
    console.error('[Errors] Signature query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

/** 获取同一指纹的所有错误实例（用于 Session 对比） */
router.get('/errors/group/:fingerprint/sessions', async (req: Request, res: Response) => {
  const { fingerprint } = req.params;
  const { dsn, limit = '10' } = req.query;
  
  if (!dsn) {
    return res.status(400).json({ error: 'dsn is required' });
  }

  const db = getDB();
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    const result = await db.query(
      `SELECT * FROM errors WHERE dsn = $1 AND fingerprint = $2 ORDER BY timestamp DESC LIMIT $3`,
      [dsn as string, fingerprint, Number(limit)]
    );
    
    const sessions = result.rows.map(parseErrorRow);
    res.json({ sessions });
  } catch (error) {
    console.error('[Errors] Sessions query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

export default router;
