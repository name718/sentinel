/**
 * 邮件服务模块
 * 使用 nodemailer 发送 SMTP 邮件
 */
import nodemailer, { Transporter } from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface AlertEmailData {
  to: string | string[];
  subject: string;
  errorMessage: string;
  errorType: string;
  errorCount: number;
  url: string;
  timestamp: number;
  fingerprint?: string;
  dashboardUrl?: string;
}

let transporter: Transporter | null = null;
let emailConfig: EmailConfig | null = null;

/**
 * 初始化邮件服务
 */
export function initEmailService(config: EmailConfig): void {
  emailConfig = config;
  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    }
  });
  console.log('[Email] Service initialized');
}

/**
 * 从环境变量初始化
 */
export function initEmailFromEnv(): boolean {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !user || !pass) {
    console.log('[Email] SMTP not configured, email alerts disabled');
    return false;
  }

  initEmailService({
    host,
    port: parseInt(port || '465', 10),
    secure: port !== '587',
    user,
    pass,
    from: from || user
  });
  return true;
}

/**
 * 验证 SMTP 连接
 */
export async function verifyConnection(): Promise<boolean> {
  if (!transporter) return false;
  try {
    await transporter.verify();
    console.log('[Email] SMTP connection verified');
    return true;
  } catch (error) {
    console.error('[Email] SMTP verification failed:', error);
    return false;
  }
}

/**
 * 发送告警邮件
 */
export async function sendAlertEmail(data: AlertEmailData): Promise<boolean> {
  if (!transporter || !emailConfig) {
    console.warn('[Email] Service not initialized');
    return false;
  }

  const html = generateAlertEmailHtml(data);
  const recipients = Array.isArray(data.to) ? data.to.join(', ') : data.to;

  try {
    const info = await transporter.sendMail({
      from: `"Sentinel 监控" <${emailConfig.from}>`,
      to: recipients,
      subject: data.subject,
      html
    });
    console.log('[Email] Alert sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send alert:', error);
    return false;
  }
}

/**
 * 生成告警邮件 HTML
 */
function generateAlertEmailHtml(data: AlertEmailData): string {
  const time = new Date(data.timestamp).toLocaleString('zh-CN');
  const dashboardLink = data.dashboardUrl 
    ? `<a href="${data.dashboardUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:white;text-decoration:none;border-radius:6px;margin-top:16px;">查看详情</a>`
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 24px; }
    .header h1 { margin: 0; font-size: 20px; }
    .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 24px; }
    .error-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .error-message { color: #991b1b; font-family: Monaco, monospace; font-size: 14px; word-break: break-all; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .info-item { background: #f9fafb; padding: 12px; border-radius: 6px; }
    .info-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
    .info-value { font-size: 14px; color: #111827; font-weight: 500; }
    .footer { padding: 16px 24px; background: #f9fafb; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 错误告警</h1>
      <p>检测到新的错误需要关注</p>
    </div>
    <div class="content">
      <div class="error-box">
        <div class="error-message">${escapeHtml(data.errorMessage)}</div>
      </div>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-label">错误类型</div>
          <div class="info-value">${escapeHtml(data.errorType)}</div>
        </div>
        <div class="info-item">
          <div class="info-label">发生次数</div>
          <div class="info-value" style="color:#ef4444;">${data.errorCount} 次</div>
        </div>
        <div class="info-item">
          <div class="info-label">发生时间</div>
          <div class="info-value">${time}</div>
        </div>
        <div class="info-item">
          <div class="info-label">页面 URL</div>
          <div class="info-value" style="word-break:break-all;font-size:12px;">${escapeHtml(data.url)}</div>
        </div>
      </div>
      ${dashboardLink}
    </div>
    <div class="footer">
      此邮件由 Sentinel 监控系统自动发送
    </div>
  </div>
</body>
</html>`;
}

/**
 * HTML 转义
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 发送测试邮件
 */
export async function sendTestEmail(to: string): Promise<boolean> {
  return sendAlertEmail({
    to,
    subject: '🧪 Sentinel 告警测试',
    errorMessage: '这是一封测试邮件，用于验证告警系统配置是否正确。',
    errorType: 'test',
    errorCount: 1,
    url: 'https://example.com/test',
    timestamp: Date.now()
  });
}

export function isEmailConfigured(): boolean {
  return transporter !== null;
}

/**
 * 发送欢迎邮件给新订阅者
 */
export async function sendWelcomeEmail(to: string): Promise<boolean> {
  if (!transporter || !emailConfig) {
    console.warn('[Email] Service not initialized');
    return false;
  }

  const html = generateWelcomeEmailHtml();

  try {
    const info = await transporter.sendMail({
      from: `"Sentinel" <${emailConfig.from}>`,
      to,
      subject: '🎉 欢迎订阅 Sentinel！',
      html
    });
    console.log('[Email] Welcome email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('[Email] Failed to send welcome email:', error);
    return false;
  }
}

/**
 * 生成欢迎邮件 HTML
 */
function generateWelcomeEmailHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.3); }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; color: white; }
    .header p { margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 16px; }
    .content { padding: 32px 24px; color: #e2e8f0; }
    .content h2 { color: white; font-size: 20px; margin: 0 0 16px; }
    .content p { line-height: 1.7; margin: 0 0 16px; }
    .features { background: #334155; border-radius: 12px; padding: 20px; margin: 24px 0; }
    .feature { display: flex; align-items: flex-start; margin-bottom: 16px; }
    .feature:last-child { margin-bottom: 0; }
    .feature-icon { font-size: 20px; margin-right: 12px; }
    .feature-text { flex: 1; }
    .feature-title { color: white; font-weight: 600; margin-bottom: 4px; }
    .feature-desc { font-size: 14px; color: #94a3b8; }
    .cta { text-align: center; margin: 32px 0; }
    .cta a { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { padding: 24px; background: #0f172a; text-align: center; font-size: 13px; color: #64748b; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ Sentinel</h1>
      <p>感谢订阅，欢迎加入！</p>
    </div>
    <div class="content">
      <h2>你已成功订阅 Sentinel 更新</h2>
      <p>我们会在以下情况通知你：</p>
      
      <div class="features">
        <div class="feature">
          <span class="feature-icon">🚀</span>
          <div class="feature-text">
            <div class="feature-title">新版本发布</div>
            <div class="feature-desc">第一时间获取 SDK 和平台的最新功能</div>
          </div>
        </div>
        <div class="feature">
          <span class="feature-icon">📚</span>
          <div class="feature-text">
            <div class="feature-title">技术文章</div>
            <div class="feature-desc">前端监控最佳实践和技术分享</div>
          </div>
        </div>
        <div class="feature">
          <span class="feature-icon">🎁</span>
          <div class="feature-text">
            <div class="feature-title">专属福利</div>
            <div class="feature-desc">订阅用户专享优惠和早期体验资格</div>
          </div>
        </div>
      </div>

      <div class="cta">
        <a href="https://github.com/name718/sentinel">访问 GitHub 仓库</a>
      </div>
    </div>
    <div class="footer">
      <p>此邮件由 Sentinel 自动发送</p>
      <p>如有问题，请访问 <a href="https://github.com/name718/sentinel">GitHub</a> 提交 Issue</p>
    </div>
  </div>
</body>
</html>`;
}
