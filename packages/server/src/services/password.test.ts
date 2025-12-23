/**
 * 密码服务测试
 */
import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './password';

describe('Password Service', () => {
  it('should hash password', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(0);
  });

  it('should verify correct password', async () => {
    const password = 'testPassword123';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const password = 'testPassword123';
    const wrongPassword = 'wrongPassword456';
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(wrongPassword, hash);
    expect(isValid).toBe(false);
  });

  it('should generate different hashes for same password', async () => {
    const password = 'testPassword123';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    expect(hash1).not.toBe(hash2);
    // 但两个 hash 都应该能验证通过
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });
});
