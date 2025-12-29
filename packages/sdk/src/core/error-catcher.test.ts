/**
 * ErrorCatcher 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorCatcher } from './error-catcher';
import type { ErrorEvent } from '../types';

describe('ErrorCatcher', () => {
  let errorCatcher: ErrorCatcher;
  let onError: ReturnType<typeof vi.fn>;
  let getBreadcrumbs: ReturnType<typeof vi.fn>;
  let originalOnerror: OnErrorEventHandler;
  let originalOnunhandledrejection: ((event: PromiseRejectionEvent) => void) | null;

  beforeEach(() => {
    onError = vi.fn();
    getBreadcrumbs = vi.fn().mockReturnValue([]);
    
    // 保存原始处理器
    originalOnerror = window.onerror;
    originalOnunhandledrejection = window.onunhandledrejection;
    
    errorCatcher = new ErrorCatcher({ onError, getBreadcrumbs });
  });

  afterEach(() => {
    errorCatcher.uninstall();
    // 恢复原始处理器
    window.onerror = originalOnerror;
    window.onunhandledrejection = originalOnunhandledrejection;
  });

  describe('安装和卸载', () => {
    it('install 应该设置 window.onerror', () => {
      const originalHandler = window.onerror;
      errorCatcher.install();
      
      expect(window.onerror).not.toBe(originalHandler);
    });

    it('install 应该设置 window.onunhandledrejection', () => {
      const originalHandler = window.onunhandledrejection;
      errorCatcher.install();
      
      expect(window.onunhandledrejection).not.toBe(originalHandler);
    });

    it('uninstall 应该恢复原始处理器', () => {
      const originalHandler = window.onerror;
      errorCatcher.install();
      errorCatcher.uninstall();
      
      expect(window.onerror).toBe(originalHandler);
    });

    it('重复 install 不应该有副作用', () => {
      errorCatcher.install();
      const handler1 = window.onerror;
      errorCatcher.install();
      const handler2 = window.onerror;
      
      expect(handler1).toBe(handler2);
    });
  });

  describe('JS 错误捕获', () => {
    it('应该捕获 window.onerror 事件', () => {
      errorCatcher.install();
      
      // 模拟错误
      const error = new Error('Test error');
      window.onerror?.('Test error', 'test.js', 10, 5, error);
      
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        message: 'Test error',
        filename: 'test.js',
        lineno: 10,
        colno: 5
      }));
    });

    it('应该包含错误堆栈', () => {
      errorCatcher.install();
      
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:10:5';
      window.onerror?.('Test error', 'test.js', 10, 5, error);
      
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        stack: expect.stringContaining('Error: Test error')
      }));
    });

    it('应该包含 breadcrumbs', () => {
      const mockBreadcrumbs = [
        { type: 'click' as const, category: 'ui', message: 'Click', timestamp: Date.now() }
      ];
      getBreadcrumbs.mockReturnValue(mockBreadcrumbs);
      
      errorCatcher.install();
      window.onerror?.('Test error', 'test.js', 10, 5, new Error('Test'));
      
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        breadcrumbs: mockBreadcrumbs
      }));
    });

    it('应该调用原有的 onerror 处理器', () => {
      const originalHandler = vi.fn();
      window.onerror = originalHandler;
      
      errorCatcher.install();
      window.onerror?.('Test error', 'test.js', 10, 5, new Error('Test'));
      
      expect(originalHandler).toHaveBeenCalled();
    });
  });

  describe('Promise rejection 捕获', () => {
    it('应该捕获 Error 类型的 rejection', () => {
      errorCatcher.install();
      
      const error = new Error('Promise rejected');
      const event = new PromiseRejectionEvent('unhandledrejection', {
        reason: error,
        promise: Promise.reject(error).catch(() => {})
      });
      
      window.onunhandledrejection?.(event);
      
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        type: 'unhandledrejection',
        message: 'Promise rejected'
      }));
    });

    it('应该捕获字符串类型的 rejection', () => {
      errorCatcher.install();
      
      const event = new PromiseRejectionEvent('unhandledrejection', {
        reason: 'String rejection',
        promise: Promise.reject('String rejection').catch(() => {})
      });
      
      window.onunhandledrejection?.(event);
      
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        type: 'unhandledrejection',
        message: 'String rejection'
      }));
    });

    it('应该捕获对象类型的 rejection', () => {
      errorCatcher.install();
      
      const reason = { code: 500, message: 'Server error' };
      const event = new PromiseRejectionEvent('unhandledrejection', {
        reason,
        promise: Promise.reject(reason).catch(() => {})
      });
      
      window.onunhandledrejection?.(event);
      
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        type: 'unhandledrejection',
        message: expect.stringContaining('500')
      }));
    });

    it('应该处理 undefined/null rejection', () => {
      errorCatcher.install();
      
      const event = new PromiseRejectionEvent('unhandledrejection', {
        reason: undefined,
        promise: Promise.reject(undefined).catch(() => {})
      });
      
      window.onunhandledrejection?.(event);
      
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        type: 'unhandledrejection',
        message: 'Unhandled Promise Rejection'
      }));
    });
  });

  describe('手动捕获错误', () => {
    it('captureError 应该正确格式化错误', () => {
      errorCatcher.install();
      
      const error = new Error('Manual error');
      error.stack = 'Error: Manual error\n    at manual.js:1:1';
      
      errorCatcher.captureError(error);
      
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        message: 'Manual error',
        stack: expect.stringContaining('Manual error')
      }));
    });
  });

  describe('错误数据格式', () => {
    it('应该包含时间戳', () => {
      errorCatcher.install();
      
      const before = Date.now();
      window.onerror?.('Test', 'test.js', 1, 1, new Error('Test'));
      const after = Date.now();
      
      const call = onError.mock.calls[0][0] as ErrorEvent;
      expect(call.timestamp).toBeGreaterThanOrEqual(before);
      expect(call.timestamp).toBeLessThanOrEqual(after);
    });

    it('应该包含页面 URL', () => {
      errorCatcher.install();
      window.onerror?.('Test', 'test.js', 1, 1, new Error('Test'));
      
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({
        url: expect.any(String)
      }));
    });
  });
});
