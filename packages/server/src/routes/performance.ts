import { Router } from 'express';
import { getDB } from '../db';

const router = Router();

/** 性能数据列表 */
router.get('/performance', (req, res) => {
  const { dsn, page = '1', pageSize = '20', startTime, endTime } = req.query;
  
  if (!dsn) {
    return res.status(400).json({ error: 'dsn is required' });
  }

  const db = getDB();
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    let countSql = 'SELECT COUNT(*) FROM performance WHERE dsn = ?';
    let listSql = 'SELECT * FROM performance WHERE dsn = ?';
    const params: (string | number)[] = [dsn as string];

    // 添加时间范围过滤
    if (startTime) {
      countSql += ' AND timestamp >= ?';
      listSql += ' AND timestamp >= ?';
      params.push(Number(startTime));
    }
    if (endTime) {
      countSql += ' AND timestamp <= ?';
      listSql += ' AND timestamp <= ?';
      params.push(Number(endTime));
    }

    const countResult = db.exec(countSql, params);
    const total = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;

    const offset = (Number(page) - 1) * Number(pageSize);
    listSql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    const listParams = [...params, Number(pageSize), offset];
    
    const result = db.exec(listSql, listParams);

    const list = result.length > 0 ? result[0].values.map((row) => ({
      id: row[0],
      dsn: row[1],
      fp: row[2],
      fcp: row[3],
      lcp: row[4],
      fid: row[5],
      cls: row[6],
      ttfb: row[7],
      domReady: row[8],
      load: row[9],
      longTasks: row[10] ? JSON.parse(row[10] as string) : [],
      resources: row[11] ? JSON.parse(row[11] as string) : [],
      webVitalsScore: row[12] ? JSON.parse(row[12] as string) : null,
      url: row[13],
      timestamp: row[14],
      createdAt: row[15]
    })) : [];

    res.json({ total, list, page: Number(page), pageSize: Number(pageSize) });
  } catch (error) {
    console.error('[Performance] Query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

/** 性能数据统计 */
router.get('/performance/stats', (req, res) => {
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
        AVG(fp) as avgFp,
        AVG(fcp) as avgFcp,
        AVG(lcp) as avgLcp,
        AVG(ttfb) as avgTtfb,
        AVG(dom_ready) as avgDomReady,
        AVG(load) as avgLoad,
        COUNT(*) as count
      FROM performance 
      WHERE dsn = ?
    `;
    const params: (string | number)[] = [dsn as string];

    if (startTime) {
      sql += ' AND timestamp >= ?';
      params.push(Number(startTime));
    }
    if (endTime) {
      sql += ' AND timestamp <= ?';
      params.push(Number(endTime));
    }

    const result = db.exec(sql, params);
    
    if (result.length === 0 || result[0].values.length === 0) {
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

    const row = result[0].values[0];
    res.json({
      avgFp: row[0] ? Math.round(row[0] as number) : null,
      avgFcp: row[1] ? Math.round(row[1] as number) : null,
      avgLcp: row[2] ? Math.round(row[2] as number) : null,
      avgTtfb: row[3] ? Math.round(row[3] as number) : null,
      avgDomReady: row[4] ? Math.round(row[4] as number) : null,
      avgLoad: row[5] ? Math.round(row[5] as number) : null,
      count: row[6]
    });
  } catch (error) {
    console.error('[Performance] Query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

export default router;
