/**
 * 认证中间件
 * 验证 JWT token 并注入用户信息到 request
 */
import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractToken, JwtPayload } from '../services/jwt';

// 扩展 Request 类型 - 使用 interface merging
export interface AuthRequest extends Request {
  user?: JwtPayload;
}

/**
 * 认证中间件
 * 验证 Authorization header 中的 Bearer token
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = extractToken(authHeader);

  if (!token) {
    res.status(401).json({ error: '未提供认证令牌' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: '认证令牌无效或已过期' });
    return;
  }

  // 注入用户信息到 request
  req.user = payload;
  next();
}

/**
 * 可选认证中间件
 * 如果有 token 则验证，没有也放行
 */
export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = extractToken(authHeader);

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }

  next();
}

/**
 * 角色验证中间件
 * 检查用户是否具有指定角色
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: '未认证' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: '权限不足' });
      return;
    }

    next();
  };
}
