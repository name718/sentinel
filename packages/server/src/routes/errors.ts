import { Router } from 'express';
import { getDB } from '../db';
import { parseStack } from '../services/sourcemap';

const router = Router();

/** 错误列表查询 */
router.get('/errors', (req, res) => {
  const { dsn, startTime, endTime, type, page = '1', pageSize = '20' } = req.query;
  
  if (!dsn) {
    return res.status(400).json({ error: 'dsn is required' });
  }

  const db = getDB();
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    let sql = 'SELECT * FROM errors WHERE dsn = ?';
    const params: (string | number)[] = [dsn as string];

    if (startTime) {
      sql += ' AND timestamp >= ?';
      params.push(Number(startTime));
    }
    if (endTime) {
      sql += ' AND timestamp <= ?';
      params.push(Number(endTime));
    }
    if (type) {
      sql += ' AND type = ?';
      params.push(type as string);
    }

    // 获取总数
    const countResult = db.exec(sql.replace('SELECT *', 'SELECT COUNT(*) as total'), params);
    const total = countResult.length > 0 ? (countResult[0].values[0][0] as number) : 0;

    // 分页
    const offset = (Number(page) - 1) * Number(pageSize);
    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    const result = db.exec(sql, params);
    
    const list = result.length > 0 ? result[0].values.map((row) => ({
      id: row[0],
      dsn: row[1],
      type: row[2],
      message: row[3],
      stack: row[4],
      filename: row[5],
      lineno: row[6],
      colno: row[7],
      url: row[8],
      breadcrumbs: row[9] ? JSON.parse(row[9] as string) : [],
      timestamp: row[10],
      fingerprint: row[11],
      count: row[12],
      createdAt: row[13]
    })) : [];

    res.json({ total, list, page: Number(page), pageSize: Number(pageSize) });
  } catch (error) {
    console.error('[Errors] Query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

/** 错误详情 */
router.get('/errors/:id', async (req, res) => {
  const { id } = req.params;
  const { version } = req.query; // 可选的版本号参数
  
  const db = getDB();
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    const result = db.exec('SELECT * FROM errors WHERE id = ?', [Number(id)]);
    
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ error: 'Error not found' });
    }

    const row = result[0].values[0];
    const error = {
      id: row[0],
      dsn: row[1] as string,
      type: row[2],
      message: row[3],
      stack: row[4] as string | null,
      filename: row[5],
      lineno: row[6],
      colno: row[7],
      url: row[8],
      breadcrumbs: row[9] ? JSON.parse(row[9] as string) : [],
      timestamp: row[10],
      fingerprint: row[11],
      count: row[12],
      createdAt: row[13],
      parsedStack: null as unknown
    };

    // 如果有堆栈信息，尝试解析 SourceMap
    if (error.stack) {
      try {
        error.parsedStack = await parseStack(
          error.stack,
          error.dsn,
          version as string | undefined
        );
      } catch (parseError) {
        console.error('[Errors] SourceMap parse failed:', parseError);
        // 解析失败不影响返回原始数据
      }
    }

    res.json(error);
  } catch (error) {
    console.error('[Errors] Query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

/** 错误趋势统计 */
router.get('/errors/stats/trend', (req, res) => {
  const { dsn, startTime, endTime, interval = 'hour' } = req.query;
  
  if (!dsn) {
    return res.status(400).json({ error: 'dsn is required' });
  }

  const db = getDB();
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    // 简化的趋势统计
    let sql = `
      SELECT 
        strftime('%Y-%m-%d %H:00:00', datetime(timestamp/1000, 'unixepoch')) as time_bucket,
        COUNT(*) as count
      FROM errors 
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

    sql += ' GROUP BY time_bucket ORDER BY time_bucket';

    const result = db.exec(sql, params);
    
    const trend = result.length > 0 ? result[0].values.map((row) => ({
      time: row[0],
      count: row[1]
    })) : [];

    res.json({ trend });
  } catch (error) {
    console.error('[Errors] Stats query failed:', error);
    res.status(500).json({ error: 'Query failed' });
  }
});

export default router;
