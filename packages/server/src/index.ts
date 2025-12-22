import express from 'express';
import cors from 'cors';

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// TODO: 添加路由
// - POST /api/report
// - GET /api/errors
// - GET /api/errors/:id
// - POST /api/sourcemap
// - GET /api/performance

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
});

export { app };
