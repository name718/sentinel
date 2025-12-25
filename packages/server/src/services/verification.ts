/**
 * 邮箱验证码服务
 */
import { isEmailConfigured } from './email';
import nodemailer from 'nodemailer';

// 验证码缓存 (生产环境应该用 Redis)
const codeCache = new Map<string, { code: string; expires: number }>();

// 验证码配置
const CODE_LENGTH = 6;
const CODE_EXPIRES = 10 * 60 * 1000; // 10分钟
const RESEND_INTERVAL = 60 * 1000; // 60秒内不能重发

// 发送频率限制
const sendTimeCache = new Map<string, number>();

/**
 * 生成随机验证码
 */
function generateCode(): string {
  return Math.random().toString().slice(2, 2 + CODE_LENGTH);
}

/**
 * 发送验证码邮件
 */
export async function sendVerificationCode(email: string): Promise<{ success: boolean; message: string }> {
  // 检查发送频率
  const lastSendTime = sendTimeCache.get(email);
  if (lastSendTime && Date.now() - lastSendTime < RESEND_INTERVAL) {
    const waitSeconds = Math.ceil((RESEND_INTERVAL - (Date.now() - lastSendTime)) / 1000);
    return { success: false, message: `请${waitSeconds}秒后再试` };
  }

  // 检查邮件服务是否配置
  if (!isEmailConfigured()) {
    // 开发模式：直接返回验证码（仅用于测试）
    const code = generateCode();
    codeCache.set(email, { code, expires: Date.now() + CODE_EXPIRES });
    sendTimeCache.set(email, Date.now());
    console.log(`[Verification] Dev mode - Code for ${email}: ${code}`);
    return { success: true, message: `验证码已发送（开发模式：${code}）` };
  }

  const code = generateCode();
  
  // 发送邮件
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_PORT !== '587',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  try {
    await transporter.sendMail({
      from: `"Sentinel" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: '【Sentinel】邮箱验证码',
      html: generateVerificationEmailHtml(code)
    });

    // 保存验证码
    codeCache.set(email, { code, expires: Date.now() + CODE_EXPIRES });
    sendTimeCache.set(email, Date.now());
    
    console.log(`[Verification] Code sent to ${email}`);
    return { success: true, message: '验证码已发送到你的邮箱' };
  } catch (error) {
    console.error('[Verification] Send failed:', error);
    return { success: false, message: '发送失败，请稍后重试' };
  }
}

/**
 * 验证验证码
 */
export function verifyCode(email: string, code: string): boolean {
  const cached = codeCache.get(email);
  
  if (!cached) {
    return false;
  }

  if (Date.now() > cached.expires) {
    codeCache.delete(email);
    return false;
  }

  if (cached.code !== code) {
    return false;
  }

  // 验证成功后删除
  codeCache.delete(email);
  return true;
}

/**
 * 生成验证码邮件 HTML
 */
function generateVerificationEmailHtml(code: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; margin: 0; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; color: white; }
    .content { padding: 32px; text-align: center; }
    .content p { color: #94a3b8; font-size: 15px; margin: 0 0 24px; }
    .code-box { background: #0f172a; border-radius: 12px; padding: 24px; margin: 24px 0; }
    .code { font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #6366f1; font-family: Monaco, monospace; }
    .tip { font-size: 13px; color: #64748b; margin-top: 24px; }
    .footer { padding: 20px; background: #0f172a; text-align: center; font-size: 12px; color: #475569; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ Sentinel</h1>
    </div>
    <div class="content">
      <p>你正在注册 Sentinel 账户，请使用以下验证码完成验证：</p>
      <div class="code-box">
        <div class="code">${code}</div>
      </div>
      <p class="tip">验证码 10 分钟内有效，请勿泄露给他人</p>
    </div>
    <div class="footer">
      如果这不是你的操作，请忽略此邮件
    </div>
  </div>
</body>
</html>`;
}
