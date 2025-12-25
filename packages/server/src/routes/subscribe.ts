/**
 * 订阅路由 - 官网邮箱收集
 */
import { Router, Request, Response } from 'express';
import { query } from '../db';
import { sendWelcomeEmail, isEmailConfigured } from '../services/email';

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

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // 检查是否已订阅
    const existing = await query('SELECT id FROM subscribers WHERE email = $1', [normalizedEmail]);
    
    if (existing.rows.length > 0) {
      return res.json({ success: true, message: '你已经订阅过了，感谢关注！' });
    }

    // 保存订阅
    await query(
      `INSERT INTO subscribers (email, source) VALUES ($1, $2)`,
      [normalizedEmail, source]
    );

    // 发送欢迎邮件（异步，不阻塞响应）
    if (isEmailConfigured()) {
      sendWelcomeEmail(normalizedEmail).catch((err: Error) => {
        console.error('[Subscribe] Failed to send welcome email:', err);
      });
    }

    res.json({ success: true, message: '订阅成功！我们已发送确认邮件到你的邮箱' });
  } catch (error) {
    console.error('[Subscribe] Failed:', error);
    res.status(500).json({ error: '订阅失败，请稍后重试' });
  }
});

export default router;
