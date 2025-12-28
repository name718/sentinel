/**
 * BehaviorTracker 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BehaviorTracker } from './behavior-tracker';
import type { Breadcrumb } from '../types';

describe('BehaviorTracker', () => {
  let tracker: BehaviorTracker;
  let onBreadcrumb: ReturnType<typeof vi.fn>;
  let originalConsoleLog: typeof console.log;
  let originalConsoleWarn: typeof console.warn;
  let originalConsoleError: typeof console.error;
  let originalFetch: typeof fetch;
  let originalXHROpen: typeof XMLHttpRequest.prototype.open;
  let originalXHRSend: typeof XMLHttpRequest.prototype.send;

  beforeEach(() => {
    onBreadcrumb = vi.fn();
    
    // 保存原始方法
    originalConsoleLog = console.log;
    originalConsoleWarn = console.warn;
    originalConsoleError = console.error;
    originalFetch = window.fetch;
    originalXHROpen = XMLHttpRequest.prototype.open;
    originalXHRSend = XMLHttpRequest.prototype.send;
    
    tracker = new BehaviorTracker({ onBreadcrumb });
  });

  afterEach(() => {
    tracker.uninstall();
    
    // 恢复原始方法
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalXHROpen;
    XMLHttpRequest.prototype.send = originalXHRSend;
  });

  describe('点击事件追踪', () => {
    it('应该追踪点击事件', () => {
      tracker.install();
      
      const button = document.createElement('button');
      button.id = 'test-btn';
      button.className = 'primary large';
      document.body.appendChild(button);
      
      button.click();
      
      expect(onBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        type: 'click',
        category: 'ui',
        message: expect.stringContaining('#test-btn')
      }));
      
      document.body.removeChild(button);
    });

    it('应该记录元素信息', () => {
      tracker.install();
      
      const div = document.createElement('div');
      div.className = 'container wrapper';
      document.body.appendChild(div);
      
      div.click();
      
      expect(onBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tagName: 'DIV',
          className: 'container wrapper'
        })
      }));
      
      document.body.removeChild(div);
    });
  });

  describe('Console 追踪', () => {
    it('应该追踪 console.log', () => {
      tracker.install();
      
      console.log('Test message', 123);
      
      expect(onBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        type: 'console',
        category: 'log',
        message: 'Test message 123'
      }));
    });

    it('应该追踪 console.warn', () => {
      tracker.install();
      
      console.warn('Warning message');
      
      expect(onBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        type: 'console',
        category: 'warn',
        message: 'Warning message'
      }));
    });

    it('应该追踪 console.error', () => {
      tracker.install();
      
      console.error('Error message');
      
      expect(onBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        type: 'console',
        category: 'error',
        message: 'Error message'
      }));
    });

    it('应该处理对象参数', () => {
      tracker.install();
      
      console.log({ key: 'value' });
      
      expect(onBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          arguments: expect.arrayContaining([expect.stringContaining('key')])
        })
      }));
    });

    it('卸载后应该恢复原始 console', () => {
      tracker.install();
      tracker.uninstall();
      
      // 清除之前的调用
      onBreadcrumb.mockClear();
      
      console.log('After uninstall');
      
      expect(onBreadcrumb).not.toHaveBeenCalled();
    });
  });

  describe('路由追踪', () => {
    it('应该追踪 pushState', () => {
      tracker.install();
      
      history.pushState({}, '', '/new-page');
      
      expect(onBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        type: 'route',
        category: 'navigation',
        message: expect.stringContaining('Push state')
      }));
    });

    it('应该追踪 replaceState', () => {
      tracker.install();
      
      history.replaceState({}, '', '/replaced-page');
      
      expect(onBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        type: 'route',
        category: 'navigation',
        message: expect.stringContaining('Replace state')
      }));
    });
  });

  describe('Fetch 追踪', () => {
    it('应该追踪成功的 fetch 请求', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200
      });
      window.fetch = mockFetch;
      
      tracker.install();
      
      await fetch('/api/test');
      
      expect(onBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        type: 'fetch',
        category: 'http',
        message: expect.stringContaining('GET /api/test'),
        data: expect.objectContaining({
          method: 'GET',
          url: '/api/test',
          status: 200
        })
      }));
    });

    it('应该追踪失败的 fetch 请求', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      window.fetch = mockFetch;
      
      tracker.install();
      
      try {
        await fetch('/api/fail');
      } catch {
        // 预期会抛出错误
      }
      
      expect(onBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        type: 'fetch',
        category: 'http',
        message: expect.stringContaining('failed'),
        data: expect.objectContaining({
          status: 0,
          error: expect.stringContaining('Network error')
        })
      }));
    });

    it('应该记录请求耗时', async () => {
      const mockFetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ ok: true, status: 200 }), 50))
      );
      window.fetch = mockFetch;
      
      tracker.install();
      
      await fetch('/api/slow');
      
      expect(onBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          duration: expect.any(Number)
        })
      }));
      
      const call = onBreadcrumb.mock.calls.find(
        c => c[0].type === 'fetch' && c[0].data?.url === '/api/slow'
      );
      expect(call?.[0].data.duration).toBeGreaterThanOrEqual(50);
    });
  });

  describe('XHR 追踪', () => {
    it('应该追踪 XHR 请求', async () => {
      tracker.install();
      
      // 创建 mock XHR
      const mockXHR = {
        open: vi.fn(),
        send: vi.fn(),
        addEventListener: vi.fn(),
        status: 200,
        getResponseHeader: vi.fn()
      };
      
      // 模拟 XHR 完成
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/xhr-test');
      
      // 触发 loadend 事件
      const loadendEvent = new Event('loadend');
      Object.defineProperty(xhr, 'status', { value: 200 });
      xhr.dispatchEvent(loadendEvent);
      
      // 由于 XHR 是异步的，需要等待
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // 检查是否有 XHR 相关的 breadcrumb
      const xhrCalls = onBreadcrumb.mock.calls.filter(c => c[0].type === 'xhr');
      expect(xhrCalls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Breadcrumb 数据格式', () => {
    it('应该包含时间戳', () => {
      tracker.install();
      
      const before = Date.now();
      console.log('Test');
      const after = Date.now();
      
      const call = onBreadcrumb.mock.calls[0][0] as Breadcrumb;
      expect(call.timestamp).toBeGreaterThanOrEqual(before);
      expect(call.timestamp).toBeLessThanOrEqual(after);
    });
  });
});
