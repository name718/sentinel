/**
 * 性能数据路由
 */
import { Router } from 'express';
import { getDB } from '../db';

const router: Router = Router();

/** 解析性能记录 */
function parsePerformanceRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    dsn: row.dsn,
    fp: row.fp,
    fcp: row.fcp,
    lcp: row.lcp,
    fid: row.fid,
    cls: row.cls,
    ttfb: row.ttfb,
    domReady: row.dom_ready,
    load: row.load,
    longTasks: row.long_tasks || [],
    resources: row.resources || [],
    webVitalsScore: row.web_vitals_score || null,
    url: row.url,
    timestamp: Number(row.timestamp),
    createdAt: row.created_at
  };
}

/** 性能数据列表 */
router.get('/performance', async (req, res) => {
  const { dsn, page = '1', pageSize = '20', startTime, endTime } = req.query;
  
  if (!dsn) {
    return res.status(400).json({ error: 'dsn is required' });
  }

  const db = getDB();
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    let countSql = 'SELECT COUNT(*) FROM performance WHERE dsn = $1';
    let listSql = 'SELECT * FROM performance WHERE dsn = $1';
    const params: (string | number)[] = [dsn as string];
    let paramIndex = 2;

    if (startTime) {
      countSql += ` AND timestamp >= $${paramIndex}`;
      listSql += ` AND timestamp >= $${paramIndex}`;
      params.push(Number(startTime));
      paramIndex++;
    }
    if (endTime) {
      countSql += ` AND timestamp <= $${paramIndex}`;
      listSql += ` AND timestamp <= $${paramIndex}`;
      params.push(Number(endTime));
      paramIndex++;
    }

    const countResult = await db.query(countSql, params);
    const total = parseInt(countResult.rows[0].count, 10);

    const offset = (Number(page) - 1) * Number(pageSize);
    listSql += ` ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const listParams = [...params, Number(pageSize), offset];
    
    const result = await db.query(listSql, listParams);
    const list = result.rows.map(parsePerformanceRow);

    res.json({ total, list, page: Number(page), pageSize: Number(pageSize) });
  } catch (error) {
    console.error('[Performance] Query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

/** 性能数据统计 */
router.get('/performance/stats', async (req, res) => {
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
        AVG(fp) as avg_fp,
        AVG(fcp) as avg_fcp,
        AVG(lcp) as avg_lcp,
        AVG(ttfb) as avg_ttfb,
        AVG(dom_ready) as avg_dom_ready,
        AVG(load) as avg_load,
        COUNT(*) as count
      FROM performance 
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

    const result = await db.query(sql, params);
    
    if (result.rows.length === 0) {
      return res.json({
        avgFp: null,
        avgFcp: null,
        avgLcp: null,
        avgTtfb: null,
        avgDomReady: null,
        avgLoad: null,
        count: 0
      });
    }

    const row = result.rows[0];
    res.json({
      avgFp: row.avg_fp ? Math.round(parseFloat(row.avg_fp)) : null,
      avgFcp: row.avg_fcp ? Math.round(parseFloat(row.avg_fcp)) : null,
      avgLcp: row.avg_lcp ? Math.round(parseFloat(row.avg_lcp)) : null,
      avgTtfb: row.avg_ttfb ? Math.round(parseFloat(row.avg_ttfb)) : null,
      avgDomReady: row.avg_dom_ready ? Math.round(parseFloat(row.avg_dom_ready)) : null,
      avgLoad: row.avg_load ? Math.round(parseFloat(row.avg_load)) : null,
      count: parseInt(row.count, 10)
    });
  } catch (error) {
    console.error('[Performance] Query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

export default router;
