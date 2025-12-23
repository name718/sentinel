import express, { Express } from 'express';
import cors from 'cors';
import { initDB } from './db';
import reportRouter from './routes/report';
import errorsRouter from './routes/errors';
import performanceRouter from './routes/performance';
import sourcemapRouter from './routes/sourcemap';
import authRouter from './routes/auth';
import { authMiddleware } from './middleware/auth';

const app: Express = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// 公开路由（无需认证）
app.use('/api/auth', authRouter);
app.use('/api', reportRouter); // SDK 上报接口保持公开

// 受保护路由（需要认证）
app.use('/api', authMiddleware, errorsRouter);
app.use('/api', authMiddleware, performanceRouter);
app.use('/api', authMiddleware, sourcemapRouter);

const PORT = process.env.PORT || 3000;

// 初始化数据库后启动服务
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('[Server] Failed to initialize database:', err);
  process.exit(1);
});

export { app };
