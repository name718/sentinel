/**
 * Vercel Serverless Function 入口
 */
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { initDB } from '../src/db';
import reportRouter from '../src/routes/report';
import errorsRouter from '../src/routes/errors';
import performanceRouter from '../src/routes/performance';
import sourcemapRouter from '../src/routes/sourcemap';
import authRouter from '../src/routes/auth';
import alertsRouter from '../src/routes/alerts';
import projectsRouter from '../src/routes/projects';
import subscribeRouter from '../src/routes/subscribe';
import { authMiddleware } from '../src/middleware/auth';
import { initEmailFromEnv } from '../src/services/email';
import { initAlertTables } from '../src/services/alert';

const app: Express = express();

// 中间件
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '5mb' }));

// 健康检查
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 公开路由（无需认证）
app.use('/api/auth', authRouter);
app.use('/api', reportRouter);
app.use('/api', sourcemapRouter);
app.use('/api', subscribeRouter);

// 受保护路由（需要认证）
app.use('/api', authMiddleware, errorsRouter);
app.use('/api', authMiddleware, performanceRouter);
app.use('/api', authMiddleware, alertsRouter);
app.use('/api', projectsRouter);

// 初始化标志
let initialized = false;

async function initialize() {
  if (initialized) return;
  
  try {
    await initDB();
    await initAlertTables();
    initEmailFromEnv();
    initialized = true;
    console.log('[Vercel] Server initialized');
  } catch (err) {
    console.error('[Vercel] Init failed:', err);
    throw err;
  }
}

// Vercel handler
export default async function handler(req: Request, res: Response) {
  await initialize();
  return app(req, res);
}

// 导出 app 供本地开发使用
export { app };
