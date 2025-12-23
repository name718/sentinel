/**
 * 认证路由
 * 处理用户注册、登录、获取当前用户
 */
import { Router, Request, Response } from 'express';
import { getDB } from '../db';
import { hashPassword, verifyPassword } from '../services/password';
import { signToken, JwtPayload } from '../services/jwt';
import { authMiddleware, AuthRequest } from '../middleware/auth';

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
 * 注册接口
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  // 参数验证
  if (!email || !password || !name) {
    return res.status(400).json({ error: '邮箱、密码和姓名都是必填项' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: '邮箱格式不正确' });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ error: '密码至少需要8位' });
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
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const row = result.rows[0];

    // 验证密码
    const isValid = await verifyPassword(password, row.password_hash as string);
    if (!isValid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

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

export default router;
