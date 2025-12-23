/**
 * 密码加密服务
 * 使用 bcrypt 进行密码哈希和验证
 */
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * 加密密码
 * @param password 明文密码
 * @returns 哈希后的密码
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * 验证密码
 * @param password 明文密码
 * @param hash 哈希后的密码
 * @returns 是否匹配
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
