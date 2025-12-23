/**
 * SourceMap 管理路由
 */
import { Router, Request, Response, RequestHandler } from 'express';
import multer from 'multer';
import { saveSourceMap, listSourceMaps } from '../services/sourcemap';
import { getDB } from '../db';

const router: Router = Router();

// 配置 multer 用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB 限制
  },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith('.map') || file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Only .map files are allowed'));
    }
  }
});

/** 上传单个 SourceMap */
const uploadSingle: RequestHandler = async (req: Request, res: Response) => {
  const { dsn, version } = req.body;
  const file = req.file;

  if (!dsn) {
    res.status(400).json({ error: 'dsn is required' });
    return;
  }
  if (!version) {
    res.status(400).json({ error: 'version is required' });
    return;
  }
  if (!file) {
    res.status(400).json({ error: 'file is required' });
    return;
  }

  try {
    const content = file.buffer.toString('utf-8');
    JSON.parse(content); // 验证 JSON

    const success = await saveSourceMap(dsn, version, file.originalname, content);
    
    if (success) {
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
};

/** 批量上传 SourceMap */
const uploadBatch: RequestHandler = async (req: Request, res: Response) => {
  const { dsn, version } = req.body;
  const files = req.files as Express.Multer.File[];

  if (!dsn) {
    res.status(400).json({ error: 'dsn is required' });
    return;
  }
  if (!version) {
    res.status(400).json({ error: 'version is required' });
    return;
  }
  if (!files || files.length === 0) {
    res.status(400).json({ error: 'files are required' });
    return;
  }

  const results: Array<{ filename: string; success: boolean; error?: string }> = [];

  for (const file of files) {
    try {
      const content = file.buffer.toString('utf-8');
      JSON.parse(content);
      
      const success = await saveSourceMap(dsn, version, file.originalname, content);
      results.push({ filename: file.originalname, success });
    } catch {
      results.push({
        filename: file.originalname,
        success: false,
        error: 'Invalid JSON'
      });
    }
  }

  const successCount = results.filter(r => r.success).length;
  res.json({
    success: true,
    total: files.length,
    uploaded: successCount,
    results
  });
};

// 路由定义
router.post('/sourcemap', upload.single('file') as RequestHandler, uploadSingle);
router.post('/sourcemap/batch', upload.array('files', 20) as RequestHandler, uploadBatch);

/** 获取 SourceMap 列表 */
router.get('/sourcemap', async (req: Request, res: Response) => {
  const { dsn } = req.query;

  if (!dsn) {
    res.status(400).json({ error: 'dsn is required' });
    return;
  }

  const list = await listSourceMaps(dsn as string);
  res.json({ list });
});

/** 删除 SourceMap */
router.delete('/sourcemap', async (req: Request, res: Response) => {
  const { dsn, version, filename } = req.query;

  if (!dsn || !version || !filename) {
    res.status(400).json({ error: 'dsn, version and filename are required' });
    return;
  }

  const db = getDB();
  if (!db) {
    res.status(500).json({ error: 'Database not initialized' });
    return;
  }

  try {
    await db.query(
      'DELETE FROM sourcemaps WHERE dsn = $1 AND version = $2 AND filename = $3',
      [dsn, version, filename]
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete SourceMap' });
  }
});

export default router;
