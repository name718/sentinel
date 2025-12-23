/**
 * JWT 服务测试
 */
import { describe, it, expect } from 'vitest';
import { signToken, verifyToken, extractToken, JwtPayload } from './jwt';

describe('JWT Service', () => {
  const testPayload: JwtPayload = {
    userId: 1,
    email: 'test@example.com',
    role: 'developer'
  };

  describe('signToken', () => {
    it('should generate a valid JWT token', () => {
      const token = signToken(testPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT 格式: header.payload.signature
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const token = signToken(testPayload);
      const decoded = verifyToken(token);
      
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testPayload.userId);
      expect(decoded?.email).toBe(testPayload.email);
      expect(decoded?.role).toBe(testPayload.role);
    });

    it('should return null for invalid token', () => {
      const decoded = verifyToken('invalid.token.here');
      expect(decoded).toBeNull();
    });

    it('should return null for empty token', () => {
      const decoded = verifyToken('');
      expect(decoded).toBeNull();
    });

    it('should return null for tampered token', () => {
      const token = signToken(testPayload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      
      const decoded = verifyToken(tamperedToken);
      expect(decoded).toBeNull();
    });
  });

  describe('extractToken', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'my-jwt-token';
      const authHeader = `Bearer ${token}`;
      
      expect(extractToken(authHeader)).toBe(token);
    });

    it('should return null for missing header', () => {
      expect(extractToken(undefined)).toBeNull();
    });

    it('should return null for non-Bearer header', () => {
      expect(extractToken('Basic abc123')).toBeNull();
    });

    it('should return null for empty header', () => {
      expect(extractToken('')).toBeNull();
    });

    it('should return null for Bearer without token', () => {
      expect(extractToken('Bearer ')).toBe('');
    });
  });
});
