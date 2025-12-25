/**
 * 登录失败限制服务
 * 防止暴力破解攻击
 */

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

// 登录尝试记录 (生产环境应该用 Redis)
const attempts = new Map<string, LoginAttempt>();

// 配置
const MAX_ATTEMPTS = 5;           // 最大尝试次数
const WINDOW_MS = 15 * 60 * 1000; // 15分钟窗口期
const LOCK_MS = 30 * 60 * 1000;   // 锁定30分钟

/**
 * 检查是否被锁定
 */
export function isLocked(email: string): { locked: boolean; remainingMs?: number } {
  const record = attempts.get(email.toLowerCase());
  
  if (!record || !record.lockedUntil) {
    return { locked: false };
  }
  
  const now = Date.now();
  if (now >= record.lockedUntil) {
    // 锁定已过期，清除记录
    attempts.delete(email.toLowerCase());
    return { locked: false };
  }
  
  return { 
    locked: true, 
    remainingMs: record.lockedUntil - now 
  };
}

/**
 * 记录登录失败
 */
export function recordFailure(email: string): { locked: boolean; attemptsLeft: number; lockMinutes?: number } {
  const key = email.toLowerCase();
  const now = Date.now();
  
  let record = attempts.get(key);
  
  if (!record || (now - record.firstAttempt > WINDOW_MS)) {
    // 新记录或窗口期已过
    record = { count: 1, firstAttempt: now, lockedUntil: null };
  } else {
    record.count++;
  }
  
  // 检查是否需要锁定
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCK_MS;
    attempts.set(key, record);
    return { 
      locked: true, 
      attemptsLeft: 0, 
      lockMinutes: Math.ceil(LOCK_MS / 60000) 
    };
  }
  
  attempts.set(key, record);
  return { 
    locked: false, 
    attemptsLeft: MAX_ATTEMPTS - record.count 
  };
}

/**
 * 登录成功，清除记录
 */
export function clearAttempts(email: string): void {
  attempts.delete(email.toLowerCase());
}

/**
 * 获取剩余尝试次数
 */
export function getRemainingAttempts(email: string): number {
  const record = attempts.get(email.toLowerCase());
  if (!record) return MAX_ATTEMPTS;
  
  const now = Date.now();
  if (now - record.firstAttempt > WINDOW_MS) {
    return MAX_ATTEMPTS;
  }
  
  return Math.max(0, MAX_ATTEMPTS - record.count);
}
