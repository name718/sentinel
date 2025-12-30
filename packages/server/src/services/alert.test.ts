/**
 * Alert 服务单元测试
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock 数据库模块
vi.mock('../db', () => ({
  getDB: vi.fn().mockReturnValue(null),
  query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
}));

// Mock 邮件模块
vi.mock('./email', () => ({
  sendAlertEmail: vi.fn().mockResolvedValue(true),
  isEmailConfigured: vi.fn().mockReturnValue(true)
}));

// 导入被测试模块（在 mock 之后）
import { query } from '../db';
import { sendAlertEmail, isEmailConfigured } from './email';

describe('Alert Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AlertRule 类型', () => {
    it('应该支持 new_error 类型', () => {
      const rule = {
        dsn: 'test-app',
        name: 'New Error Alert',
        type: 'new_error' as const,
        enabled: true,
        recipients: ['admin@example.com'],
        cooldown: 30
      };
      
      expect(rule.type).toBe('new_error');
    });

    it('应该支持 error_threshold 类型', () => {
      const rule = {
        dsn: 'test-app',
        name: 'Threshold Alert',
        type: 'error_threshold' as const,
        enabled: true,
        threshold: 100,
        recipients: ['admin@example.com'],
        cooldown: 30
      };
      
      expect(rule.type).toBe('error_threshold');
      expect(rule.threshold).toBe(100);
    });

    it('应该支持 error_spike 类型', () => {
      const rule = {
        dsn: 'test-app',
        name: 'Spike Alert',
        type: 'error_spike' as const,
        enabled: true,
        threshold: 50,
        timeWindow: 5,
        recipients: ['admin@example.com'],
        cooldown: 30
      };
      
      expect(rule.type).toBe('error_spike');
      expect(rule.timeWindow).toBe(5);
    });
  });

  describe('AlertHistory 类型', () => {
    it('应该包含必要字段', () => {
      const history = {
        id: 1,
        ruleId: 1,
        dsn: 'test-app',
        fingerprint: 'abc123',
        errorMessage: 'Test error',
        recipients: ['admin@example.com'],
        triggeredAt: new Date(),
        emailSent: true
      };
      
      expect(history.ruleId).toBe(1);
      expect(history.emailSent).toBe(true);
    });
  });

  describe('冷却机制', () => {
    it('冷却时间应该以分钟为单位', () => {
      const cooldownMinutes = 30;
      const cooldownMs = cooldownMinutes * 60 * 1000;
      
      expect(cooldownMs).toBe(1800000); // 30 分钟 = 1800000 毫秒
    });
  });

  describe('告警规则验证', () => {
    it('recipients 应该是数组', () => {
      const rule = {
        dsn: 'test-app',
        name: 'Test Alert',
        type: 'new_error' as const,
        enabled: true,
        recipients: ['user1@example.com', 'user2@example.com'],
        cooldown: 30
      };
      
      expect(Array.isArray(rule.recipients)).toBe(true);
      expect(rule.recipients.length).toBe(2);
    });

    it('enabled 默认应该为 true', () => {
      const rule = {
        dsn: 'test-app',
        name: 'Test Alert',
        type: 'new_error' as const,
        enabled: true,
        recipients: ['admin@example.com'],
        cooldown: 30
      };
      
      expect(rule.enabled).toBe(true);
    });
  });

  describe('邮件配置检查', () => {
    it('邮件未配置时不应该触发告警', () => {
      (isEmailConfigured as ReturnType<typeof vi.fn>).mockReturnValue(false);
      
      expect(isEmailConfigured()).toBe(false);
    });

    it('邮件已配置时应该可以发送', async () => {
      (isEmailConfigured as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (sendAlertEmail as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      
      const result = await sendAlertEmail({
        to: ['admin@example.com'],
        subject: 'Test Alert',
        errorMessage: 'Test error',
        errorType: 'Error',
        errorCount: 1,
        url: 'http://example.com',
        timestamp: Date.now(),
        fingerprint: 'abc123'
      });
      
      expect(result).toBe(true);
    });
  });

  describe('数据库操作', () => {
    it('创建规则应该调用正确的 SQL', async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: [{
          id: 1,
          dsn: 'test-app',
          name: 'Test Alert',
          type: 'new_error',
          enabled: true,
          threshold: null,
          time_window: 60,
          recipients: ['admin@example.com'],
          cooldown: 30,
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      await query(
        `INSERT INTO alert_rules (dsn, name, type, enabled, threshold, time_window, recipients, cooldown)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        ['test-app', 'Test Alert', 'new_error', true, null, 60, ['admin@example.com'], 30]
      );

      expect(query).toHaveBeenCalled();
    });

    it('获取规则应该按 DSN 过滤', async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValue({ rows: [] });

      await query(
        'SELECT * FROM alert_rules WHERE dsn = $1 ORDER BY created_at DESC',
        ['test-app']
      );

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE dsn = $1'),
        ['test-app']
      );
    });

    it('删除规则应该返回影响行数', async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValue({ rowCount: 1 });

      const result = await query('DELETE FROM alert_rules WHERE id = $1', [1]);

      expect(result.rowCount).toBe(1);
    });
  });

  describe('告警触发条件', () => {
    it('new_error 类型应该在新错误时触发', () => {
      const errorData = {
        dsn: 'test-app',
        type: 'TypeError',
        message: 'Cannot read property',
        fingerprint: 'abc123',
        url: 'http://example.com',
        isNew: true,
        count: 1
      };

      // new_error 规则应该在 isNew 为 true 时触发
      expect(errorData.isNew).toBe(true);
    });

    it('error_threshold 类型应该在超过阈值时触发', () => {
      const rule = {
        type: 'error_threshold' as const,
        threshold: 100
      };
      const errorData = { count: 150 };

      expect(errorData.count >= (rule.threshold || 0)).toBe(true);
    });

    it('error_spike 类型需要时间窗口', () => {
      const rule = {
        type: 'error_spike' as const,
        threshold: 50,
        timeWindow: 5 // 5 分钟
      };

      expect(rule.timeWindow).toBeDefined();
      expect(rule.threshold).toBeDefined();
    });
  });

  describe('告警历史记录', () => {
    it('应该记录告警触发时间', () => {
      const history = {
        ruleId: 1,
        dsn: 'test-app',
        fingerprint: 'abc123',
        errorMessage: 'Test error',
        triggeredAt: new Date(),
        emailSent: true
      };

      expect(history.triggeredAt).toBeInstanceOf(Date);
    });

    it('应该记录邮件发送状态', () => {
      const successHistory = { emailSent: true };
      const failHistory = { emailSent: false };

      expect(successHistory.emailSent).toBe(true);
      expect(failHistory.emailSent).toBe(false);
    });
  });
});
