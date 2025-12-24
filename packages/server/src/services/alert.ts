/**
 * 告警服务模块
 * 管理告警规则和触发逻辑
 */
import { getDB, query } from '../db';
import { sendAlertEmail, isEmailConfigured } from './email';

export type AlertType = 'new_error' | 'error_threshold' | 'error_spike';

export interface AlertRule {
  id?: number;
  dsn: string;
  name: string;
  type: AlertType;
  enabled: boolean;
  threshold?: number;        // 阈值（用于 error_threshold）
  timeWindow?: number;       // 时间窗口（分钟）
  recipients: string[];      // 收件人列表
  cooldown: number;          // 冷却时间（分钟），避免重复告警
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AlertHistory {
  id?: number;
  ruleId: number;
  dsn: string;
  fingerprint?: string;
  errorMessage: string;
  triggeredAt: Date;
  emailSent: boolean;
}

// 内存缓存：记录最近告警时间，用于冷却判断
const alertCooldowns = new Map<string, number>();

/**
 * 初始化告警表
 */
export async function initAlertTables(): Promise<void> {
  const db = getDB();
  if (!db) return;

  // 告警规则表
  await db.query(`
    CREATE TABLE IF NOT EXISTS alert_rules (
      id SERIAL PRIMARY KEY,
      dsn TEXT NOT NULL,
      name VARCHAR(100) NOT NULL,
      type VARCHAR(20) NOT NULL,
      enabled BOOLEAN DEFAULT true,
      threshold INTEGER,
      time_window INTEGER DEFAULT 60,
      recipients TEXT[] NOT NULL,
      cooldown INTEGER DEFAULT 30,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 告警历史表
  await db.query(`
    CREATE TABLE IF NOT EXISTS alert_history (
      id SERIAL PRIMARY KEY,
      rule_id INTEGER REFERENCES alert_rules(id),
      dsn TEXT NOT NULL,
      fingerprint TEXT,
      error_message TEXT,
      triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      email_sent BOOLEAN DEFAULT false
    )
  `);

  await db.query('CREATE INDEX IF NOT EXISTS idx_alert_rules_dsn ON alert_rules(dsn)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_alert_history_dsn ON alert_history(dsn, triggered_at)');
  
  console.log('[Alert] Tables initialized');
}

/**
 * 创建告警规则
 */
export async function createAlertRule(rule: AlertRule): Promise<AlertRule | null> {
  try {
    const result = await query(
      `INSERT INTO alert_rules (dsn, name, type, enabled, threshold, time_window, recipients, cooldown)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [rule.dsn, rule.name, rule.type, rule.enabled, rule.threshold || null, 
       rule.timeWindow || 60, rule.recipients, rule.cooldown || 30]
    );
    return parseAlertRule(result.rows[0]);
  } catch (error) {
    console.error('[Alert] Failed to create rule:', error);
    return null;
  }
}

/**
 * 获取告警规则列表
 */
export async function getAlertRules(dsn: string): Promise<AlertRule[]> {
  try {
    const result = await query(
      'SELECT * FROM alert_rules WHERE dsn = $1 ORDER BY created_at DESC',
      [dsn]
    );
    return result.rows.map(parseAlertRule);
  } catch (error) {
    console.error('[Alert] Failed to get rules:', error);
    return [];
  }
}

/**
 * 更新告警规则
 */
export async function updateAlertRule(id: number, updates: Partial<AlertRule>): Promise<AlertRule | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.enabled !== undefined) {
    fields.push(`enabled = $${paramIndex++}`);
    values.push(updates.enabled);
  }
  if (updates.threshold !== undefined) {
    fields.push(`threshold = $${paramIndex++}`);
    values.push(updates.threshold);
  }
  if (updates.timeWindow !== undefined) {
    fields.push(`time_window = $${paramIndex++}`);
    values.push(updates.timeWindow);
  }
  if (updates.recipients !== undefined) {
    fields.push(`recipients = $${paramIndex++}`);
    values.push(updates.recipients);
  }
  if (updates.cooldown !== undefined) {
    fields.push(`cooldown = $${paramIndex++}`);
    values.push(updates.cooldown);
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  try {
    const result = await query(
      `UPDATE alert_rules SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] ? parseAlertRule(result.rows[0]) : null;
  } catch (error) {
    console.error('[Alert] Failed to update rule:', error);
    return null;
  }
}

/**
 * 删除告警规则
 */
export async function deleteAlertRule(id: number): Promise<boolean> {
  try {
    const result = await query('DELETE FROM alert_rules WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('[Alert] Failed to delete rule:', error);
    return false;
  }
}

/**
 * 获取告警历史
 */
export async function getAlertHistory(dsn: string, limit = 50): Promise<AlertHistory[]> {
  try {
    const result = await query(
      `SELECT * FROM alert_history WHERE dsn = $1 ORDER BY triggered_at DESC LIMIT $2`,
      [dsn, limit]
    );
    return result.rows.map(row => ({
      id: row.id,
      ruleId: row.rule_id,
      dsn: row.dsn,
      fingerprint: row.fingerprint,
      errorMessage: row.error_message,
      triggeredAt: row.triggered_at,
      emailSent: row.email_sent
    }));
  } catch (error) {
    console.error('[Alert] Failed to get history:', error);
    return [];
  }
}

/**
 * 检查并触发告警（在错误上报时调用）
 */
export async function checkAndTriggerAlerts(errorData: {
  dsn: string;
  type: string;
  message: string;
  fingerprint: string;
  url: string;
  isNew: boolean;
  count: number;
}): Promise<void> {
  if (!isEmailConfigured()) return;

  try {
    // 获取该 DSN 的所有启用规则
    const result = await query(
      'SELECT * FROM alert_rules WHERE dsn = $1 AND enabled = true',
      [errorData.dsn]
    );
    const rules = result.rows.map(parseAlertRule);

    for (const rule of rules) {
      const shouldTrigger = await evaluateRule(rule, errorData);
      if (shouldTrigger) {
        await triggerAlert(rule, errorData);
      }
    }
  } catch (error) {
    console.error('[Alert] Check failed:', error);
  }
}

/**
 * 评估规则是否应该触发
 */
async function evaluateRule(rule: AlertRule, errorData: {
  dsn: string;
  type: string;
  message: string;
  fingerprint: string;
  isNew: boolean;
  count: number;
}): Promise<boolean> {
  // 检查冷却时间
  const cooldownKey = `${rule.id}-${errorData.fingerprint}`;
  const lastAlert = alertCooldowns.get(cooldownKey);
  if (lastAlert && Date.now() - lastAlert < rule.cooldown * 60 * 1000) {
    return false;
  }

  switch (rule.type) {
    case 'new_error':
      // 新错误首次出现
      return errorData.isNew;

    case 'error_threshold':
      // 错误次数超过阈值
      return rule.threshold !== undefined && errorData.count >= rule.threshold;

    case 'error_spike': {
      // 错误激增（时间窗口内错误数超过阈值）
      if (!rule.threshold || !rule.timeWindow) return false;
      const windowStart = Date.now() - rule.timeWindow * 60 * 1000;
      const countResult = await query(
        `SELECT COUNT(*) FROM errors WHERE dsn = $1 AND fingerprint = $2 AND timestamp >= $3`,
        [errorData.dsn, errorData.fingerprint, windowStart]
      );
      const recentCount = parseInt(countResult.rows[0].count, 10);
      return recentCount >= rule.threshold;
    }

    default:
      return false;
  }
}

/**
 * 触发告警
 */
async function triggerAlert(rule: AlertRule, errorData: {
  dsn: string;
  type: string;
  message: string;
  fingerprint: string;
  url: string;
  count: number;
}): Promise<void> {
  const cooldownKey = `${rule.id}-${errorData.fingerprint}`;
  
  // 发送邮件
  const emailSent = await sendAlertEmail({
    to: rule.recipients,
    subject: `🚨 [${rule.name}] ${errorData.message.slice(0, 50)}`,
    errorMessage: errorData.message,
    errorType: errorData.type,
    errorCount: errorData.count,
    url: errorData.url,
    timestamp: Date.now(),
    fingerprint: errorData.fingerprint
  });

  // 记录告警历史
  await query(
    `INSERT INTO alert_history (rule_id, dsn, fingerprint, error_message, email_sent)
     VALUES ($1, $2, $3, $4, $5)`,
    [rule.id ?? null, errorData.dsn, errorData.fingerprint, errorData.message, emailSent]
  );

  // 更新冷却时间
  alertCooldowns.set(cooldownKey, Date.now());

  console.log(`[Alert] Triggered: ${rule.name}, email sent: ${emailSent}`);
}

function parseAlertRule(row: any): AlertRule {
  return {
    id: row.id,
    dsn: row.dsn,
    name: row.name,
    type: row.type,
    enabled: row.enabled,
    threshold: row.threshold,
    timeWindow: row.time_window,
    recipients: row.recipients,
    cooldown: row.cooldown,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
