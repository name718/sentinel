/**
 * 错误聚合算法单元测试
 */
import { describe, it, expect } from 'vitest';
import { 
  normalizeMessage, 
  extractStackSignature, 
  generateFingerprint,
  calculateSimilarity 
} from './error-aggregation';

describe('normalizeMessage', () => {
  it('应该替换 UUID', () => {
    const msg = 'User 550e8400-e29b-41d4-a716-446655440000 not found';
    expect(normalizeMessage(msg)).toBe('User <uuid> not found');
  });

  it('应该替换邮箱', () => {
    const msg = 'Invalid email: test@example.com';
    expect(normalizeMessage(msg)).toBe('Invalid email: <email>');
  });

  it('应该替换 IP 地址', () => {
    const msg = 'Connection from 192.168.1.100 refused';
    expect(normalizeMessage(msg)).toBe('Connection from <ip> refused');
  });

  it('应该替换时间戳', () => {
    const msg = 'Request at 1703145600000 failed';
    expect(normalizeMessage(msg)).toBe('Request at <timestamp> failed');
  });

  it('应该替换数字 ID', () => {
    const msg = 'Order 12345678 not found';
    expect(normalizeMessage(msg)).toBe('Order <id> not found');
  });

  it('应该替换文件名中的哈希', () => {
    const msg = 'Error in main-abc123def.js';
    expect(normalizeMessage(msg)).toBe('Error in main-<hash>.js');
  });

  it('应该处理空字符串', () => {
    expect(normalizeMessage('')).toBe('');
  });
});

describe('extractStackSignature', () => {
  it('应该解析 Chrome 格式堆栈', () => {
    const stack = `Error: test
    at functionA (http://example.com/app.js:10:20)
    at functionB (http://example.com/app.js:20:30)
    at functionC (http://example.com/app.js:30:40)`;
    
    const signature = extractStackSignature(stack);
    expect(signature).toContain('functionA');
    expect(signature).toContain('functionB');
  });

  it('应该过滤 node_modules', () => {
    const stack = `Error: test
    at userCode (http://example.com/app.js:10:20)
    at libCode (http://example.com/node_modules/lib.js:20:30)`;
    
    const signature = extractStackSignature(stack);
    expect(signature).toContain('userCode');
    expect(signature).not.toContain('libCode');
  });

  it('应该处理空堆栈', () => {
    expect(extractStackSignature('')).toBe('unknown');
  });
});

describe('generateFingerprint', () => {
  it('应该为相同错误生成相同指纹', () => {
    const error1 = {
      type: 'TypeError',
      message: 'Cannot read property of undefined',
      url: 'http://example.com',
      timestamp: Date.now()
    };
    const error2 = { ...error1, timestamp: Date.now() + 1000 };

    const fp1 = generateFingerprint(error1);
    const fp2 = generateFingerprint(error2);

    expect(fp1.fingerprint).toBe(fp2.fingerprint);
  });

  it('应该为不同错误生成不同指纹', () => {
    const error1 = {
      type: 'TypeError',
      message: 'Error A',
      url: 'http://example.com',
      timestamp: Date.now()
    };
    const error2 = {
      type: 'ReferenceError',
      message: 'Error B',
      url: 'http://example.com',
      timestamp: Date.now()
    };

    const fp1 = generateFingerprint(error1);
    const fp2 = generateFingerprint(error2);

    expect(fp1.fingerprint).not.toBe(fp2.fingerprint);
  });

  it('应该返回规范化的消息', () => {
    const error = {
      type: 'Error',
      message: 'User 12345678 not found',
      url: 'http://example.com',
      timestamp: Date.now()
    };

    const result = generateFingerprint(error);
    expect(result.normalizedMessage).toBe('User <id> not found');
  });
});

describe('calculateSimilarity', () => {
  it('相同错误应该返回高相似度', () => {
    const error1 = {
      type: 'TypeError',
      message: 'Cannot read property of undefined',
      url: 'http://example.com',
      timestamp: Date.now()
    };
    const error2 = { ...error1 };

    const similarity = calculateSimilarity(error1, error2);
    expect(similarity).toBeGreaterThan(0.6); // 相同错误至少 60% 相似
  });

  it('完全不同的错误应该返回低相似度', () => {
    const error1 = {
      type: 'TypeError',
      message: 'Cannot read property of undefined',
      url: 'http://example.com',
      timestamp: Date.now()
    };
    const error2 = {
      type: 'SyntaxError',
      message: 'Unexpected token',
      url: 'http://other.com',
      timestamp: Date.now()
    };

    const similarity = calculateSimilarity(error1, error2);
    expect(similarity).toBeLessThan(0.5);
  });
});
