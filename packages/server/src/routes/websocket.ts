import { Router } from 'express';
import { websocketService } from '../services/websocket';

const router = Router();

// 获取 WebSocket 连接统计
router.get('/websocket/stats', (req, res) => {
  try {
    const stats = websocketService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[WebSocket] Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WebSocket stats'
    });
  }
});

export default router;