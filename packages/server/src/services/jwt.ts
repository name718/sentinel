/**
 * JWT 服务
 * 用于生成和验证 JSON Web Token
 */
import jwt from 'jsonwebtoken';

// 从环境变量读取密钥，默认值仅用于开发
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/** 用户载荷 */
export interface JwtPayload {
  userId: number;
  email: string;
  role: string;
}

/**
 * 生成 JWT Token
 * @param payload 用户信息
 * @returns JWT token 字符串
 */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * 验证 JWT Token
 * @param token JWT token 字符串
 * @returns 解码后的载荷，验证失败返回 null
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * 从 Authorization header 提取 token
 * @param authHeader Authorization header 值
 * @returns token 字符串，无效返回 null
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}
