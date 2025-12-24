/**
 * 告警管理路由
 */
import { Router, Request, Response } from 'express';
import { 
  createAlertRule, 
  getAlertRules, 
  updateAlertRule, 
  deleteAlertRule,
  getAlertHistory,
  AlertRule
} from '../services/alert';
import { sendTestEmail, verifyConnection, isEmailConfigured } from '../services/email';

const router: Router = Router();

/**
 * 获取邮件服务状态
 */
router.get('/alerts/email-status', async (_req: Request, res: Response) => {
  try {
    const configured = isEmailConfigured();
    let connected = false;
    
    if (configured) {
      connected = await verifyConnection();
    }
    
    res.json({ configured, connected });
  } catch (error) {
    console.error('[Alerts] Email status check failed:', error);
    res.json({ configured: false, connected: false });
  }
});

/**
 * 发送测试邮件
 */
router.post('/alerts/test-email', async (req: Request, res: Response) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!isEmailConfigured()) {
    return res.status(400).json({ error: 'Email service not configured' });
  }

  const success = await sendTestEmail(email);
  
  if (success) {
    res.json({ success: true, message: '测试邮件已发送' });
  } else {
    res.status(500).json({ error: '发送失败，请检查 SMTP 配置' });
  }
});

/**
 * 获取告警规则列表
 */
router.get('/alerts/rules', async (req: Request, res: Response) => {
  const { dsn } = req.query;
  
  if (!dsn) {
    return res.status(400).json({ error: 'dsn is required' });
  }

  const rules = await getAlertRules(dsn as string);
  res.json({ rules });
});

/**
 * 创建告警规则
 */
router.post('/alerts/rules', async (req: Request, res: Response) => {
  const { dsn, name, type, threshold, timeWindow, recipients, cooldown, enabled } = req.body;
  
  if (!dsn || !name || !type || !recipients || recipients.length === 0) {
    return res.status(400).json({ error: 'Missing required fields: dsn, name, type, recipients' });
  }

  const validTypes = ['new_error', 'error_threshold', 'error_spike'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
  }

  const rule: AlertRule = {
    dsn,
    name,
    type,
    enabled: enabled !== false,
    threshold,
    timeWindow,
    recipients,
    cooldown: cooldown || 30
  };

  const created = await createAlertRule(rule);
  
  if (created) {
    res.status(201).json(created);
  } else {
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

/**
 * 更新告警规则
 */
router.patch('/alerts/rules/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  
  const updated = await updateAlertRule(Number(id), updates);
  
  if (updated) {
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Rule not found' });
  }
});

/**
 * 删除告警规则
 */
router.delete('/alerts/rules/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const deleted = await deleteAlertRule(Number(id));
  
  if (deleted) {
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Rule not found' });
  }
});

/**
 * 获取告警历史
 */
router.get('/alerts/history', async (req: Request, res: Response) => {
  const { dsn, limit = '50' } = req.query;
  
  if (!dsn) {
    return res.status(400).json({ error: 'dsn is required' });
  }

  const history = await getAlertHistory(dsn as string, Number(limit));
  res.json({ history });
});

export default router;
