/**
 * 订阅路由 - 官网邮箱收集
 */
import { Router, Request, Response } from 'express';
import { query } from '../db';

const router: Router = Router();

/** 邮箱格式验证 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/** 订阅 */
router.post('/subscribe', async (req: Request, res: Response) => {
  const { email, source = 'website' } = req.body;

  if (!email) {
    return res.status(400).json({ error: '请输入邮箱地址' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: '邮箱格式不正确' });
  }

  try {
    await query(
      `INSERT INTO subscribers (email, source) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING`,
      [email.toLowerCase().trim(), source]
    );

    res.json({ success: true, message: '订阅成功，我们会尽快联系你！' });
  } catch (error) {
    console.error('[Subscribe] Failed:', error);
    res.status(500).json({ error: '订阅失败，请稍后重试' });
  }
});

export default router;
