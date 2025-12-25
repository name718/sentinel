/**
 * 认证路由
 * 处理用户注册、登录、获取当前用户
 */
import { Router, Request, Response } from 'express';
import { getDB } from '../db';
import { hashPassword, verifyPassword } from '../services/password';
import { signToken, JwtPayload } from '../services/jwt';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { sendVerificationCode, verifyCode } from '../services/verification';
import { isLocked, recordFailure, clearAttempts } from '../services/login-limiter';

const router: Router = Router();

/** 用户类型 */
interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

/** 验证邮箱格式 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/** 验证密码强度 (至少8位) */
function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/** 格式化用户响应 (不含密码) */
function formatUser(row: Record<string, unknown>): User {
  return {
    id: row.id as number,
    email: row.email as string,
    name: row.name as string,
    role: row.role as string,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  };
}

/**
 * 发送验证码
 * POST /api/auth/send-code
 */
router.post('/send-code', async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: '请输入邮箱' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: '邮箱格式不正确' });
  }

  const db = getDB();
  if (db) {
    // 检查邮箱是否已注册
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: '该邮箱已被注册' });
    }
  }

  const result = await sendVerificationCode(email);
  
  if (result.success) {
    res.json({ message: result.message });
  } else {
    res.status(400).json({ error: result.message });
  }
});

/**
 * 注册接口
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name, code } = req.body;

  // 参数验证
  if (!email || !password || !name) {
    return res.status(400).json({ error: '邮箱、密码和姓名都是必填项' });
  }

  if (!code) {
    return res.status(400).json({ error: '请输入验证码' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: '邮箱格式不正确' });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ error: '密码至少需要8位' });
  }

  // 验证验证码
  if (!verifyCode(email, code)) {
    return res.status(400).json({ error: '验证码错误或已过期' });
  }

  const db = getDB();
  if (!db) {
    return res.status(500).json({ error: '数据库未初始化' });
  }

  try {
    // 检查邮箱是否已存在
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: '该邮箱已被注册' });
    }

    // 加密密码
    const passwordHash = await hashPassword(password);

    // 创建用户
    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, name, role, created_at, updated_at`,
      [email, passwordHash, name, 'developer']
    );

    const user = formatUser(result.rows[0]);

    // 生成 token
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    const token = signToken(payload);

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

/**
 * 登录接口
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // 参数验证
  if (!email || !password) {
    return res.status(400).json({ error: '邮箱和密码都是必填项' });
  }

  // 检查是否被锁定
  const lockStatus = isLocked(email);
  if (lockStatus.locked) {
    const minutes = Math.ceil((lockStatus.remainingMs || 0) / 60000);
    return res.status(429).json({ 
      error: `账户已被锁定，请${minutes}分钟后再试`,
      locked: true,
      remainingMinutes: minutes
    });
  }

  const db = getDB();
  if (!db) {
    return res.status(500).json({ error: '数据库未初始化' });
  }

  try {
    // 查找用户
    const result = await db.query(
      'SELECT id, email, password_hash, name, role, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      const failResult = recordFailure(email);
      if (failResult.locked) {
        return res.status(429).json({ 
          error: `登录失败次数过多，账户已被锁定${failResult.lockMinutes}分钟`,
          locked: true
        });
      }
      return res.status(401).json({ 
        error: '邮箱或密码错误',
        attemptsLeft: failResult.attemptsLeft
      });
    }

    const row = result.rows[0];

    // 验证密码
    const isValid = await verifyPassword(password, row.password_hash as string);
    if (!isValid) {
      const failResult = recordFailure(email);
      if (failResult.locked) {
        return res.status(429).json({ 
          error: `登录失败次数过多，账户已被锁定${failResult.lockMinutes}分钟`,
          locked: true
        });
      }
      return res.status(401).json({ 
        error: '邮箱或密码错误',
        attemptsLeft: failResult.attemptsLeft
      });
    }

    // 登录成功，清除失败记录
    clearAttempts(email);

    const user = formatUser(row);

    // 生成 token
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    const token = signToken(payload);

    res.json({ user, token });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

/**
 * 获取当前用户
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const db = getDB();
  if (!db) {
    return res.status(500).json({ error: '数据库未初始化' });
  }

  try {
    const userId = req.user?.userId;
    
    const result = await db.query(
      'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = formatUser(result.rows[0]);
    res.json({ user });
  } catch (error) {
    console.error('[Auth] Get me error:', error);
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

/**
 * 发送重置密码验证码
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: '请输入邮箱' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: '邮箱格式不正确' });
  }

  const db = getDB();
  if (db) {
    // 检查邮箱是否存在
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length === 0) {
      // 为了安全，不提示邮箱不存在
      return res.json({ message: '如果该邮箱已注册，验证码将发送到你的邮箱' });
    }
  }

  const result = await sendVerificationCode(email, 'reset-password');
  
  if (result.success) {
    res.json({ message: result.message });
  } else {
    res.status(400).json({ error: result.message });
  }
});

/**
 * 重置密码
 * POST /api/auth/reset-password
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: '请填写所有字段' });
  }

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ error: '密码至少需要8位' });
  }

  // 验证验证码
  if (!verifyCode(email, code, 'reset-password')) {
    return res.status(400).json({ error: '验证码错误或已过期' });
  }

  const db = getDB();
  if (!db) {
    return res.status(500).json({ error: '数据库未初始化' });
  }

  try {
    // 检查用户是否存在
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 更新密码
    const passwordHash = await hashPassword(newPassword);
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [passwordHash, email]
    );

    // 清除登录失败记录
    clearAttempts(email);

    res.json({ message: '密码重置成功，请使用新密码登录' });
  } catch (error) {
    console.error('[Auth] Reset password error:', error);
    res.status(500).json({ error: '重置密码失败' });
  }
});

export default router;
