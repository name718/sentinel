import { Router, Request, Response } from 'express';
import multer from 'multer';
import { saveSourceMap, listSourceMaps } from '../services/sourcemap';
import { saveDB } from '../db';

const router = Router();

// 配置 multer 用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB 限制
  },
  fileFilter: (req, file, cb) => {
    // 只接受 .map 文件
    if (file.originalname.endsWith('.map') || file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Only .map files are allowed'));
    }
  }
});

/**
 * 上传 SourceMap 文件
 * POST /api/sourcemap
 * 
 * Body (multipart/form-data):
 * - file: SourceMap 文件
 * - dsn: 项目标识
 * - version: 版本号
 */
router.post('/sourcemap', upload.single('file'), (req: Request, res: Response) => {
  const { dsn, version } = req.body;
  const file = req.file;

  // 验证参数
  if (!dsn) {
    return res.status(400).json({ error: 'dsn is required' });
  }
  if (!version) {
    return res.status(400).json({ error: 'version is required' });
  }
  if (!file) {
    return res.status(400).json({ error: 'file is required' });
  }

  try {
    const content = file.buffer.toString('utf-8');
    
    // 验证是否为有效的 JSON
    JSON.parse(content);

    const success = saveSourceMap(dsn, version, file.originalname, content);
    
    if (success) {
      saveDB();
      res.json({
        success: true,
        message: 'SourceMap uploaded successfully',
        filename: file.originalname,
        version
      });
    } else {
      res.status(500).json({ error: 'Failed to save SourceMap' });
    }
  } catch (error) {
    console.error('[SourceMap] Upload error:', error);
    res.status(400).json({ error: 'Invalid SourceMap file' });
  }
});

/**
 * 批量上传 SourceMap 文件
 * POST /api/sourcemap/batch
 */
router.post('/sourcemap/batch', upload.array('files', 20), (req: Request, res: Response) => {
  const { dsn, version } = req.body;
  const files = req.files as Express.Multer.File[];

  if (!dsn) {
    return res.status(400).json({ error: 'dsn is required' });
  }
  if (!version) {
    return res.status(400).json({ error: 'version is required' });
  }
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'files are required' });
  }

  const results: Array<{ filename: string; success: boolean; error?: string }> = [];

  for (const file of files) {
    try {
      const content = file.buffer.toString('utf-8');
      JSON.parse(content); // 验证 JSON
      
      const success = saveSourceMap(dsn, version, file.originalname, content);
      results.push({ filename: file.originalname, success });
    } catch (error) {
      results.push({
        filename: file.originalname,
        success: false,
        error: 'Invalid JSON'
      });
    }
  }

  saveDB();

  const successCount = results.filter(r => r.success).length;
  res.json({
    success: true,
    total: files.length,
    uploaded: successCount,
    results
  });
});

/**
 * 获取 SourceMap 列表
 * GET /api/sourcemap
 */
router.get('/sourcemap', (req: Request, res: Response) => {
  const { dsn } = req.query;

  if (!dsn) {
    return res.status(400).json({ error: 'dsn is required' });
  }

  const list = listSourceMaps(dsn as string);
  res.json({ list });
});

/**
 * 删除 SourceMap
 * DELETE /api/sourcemap
 */
router.delete('/sourcemap', (req: Request, res: Response) => {
  const { dsn, version, filename } = req.query;

  if (!dsn || !version || !filename) {
    return res.status(400).json({ error: 'dsn, version and filename are required' });
  }

  const { getDB } = require('../db');
  const db = getDB();
  
  if (!db) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    db.run(
      'DELETE FROM sourcemaps WHERE dsn = ? AND version = ? AND filename = ?',
      [dsn, version, filename]
    );
    saveDB();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete SourceMap' });
  }
});

export default router;
