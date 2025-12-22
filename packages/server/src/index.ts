import express from 'express';
import cors from 'cors';
import { initDB } from './db';
import reportRouter from './routes/report';
import errorsRouter from './routes/errors';
import performanceRouter from './routes/performance';
import sourcemapRouter from './routes/sourcemap';

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 路由
app.use('/api', reportRouter);
app.use('/api', errorsRouter);
app.use('/api', performanceRouter);
app.use('/api', sourcemapRouter);

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
