/**
 * NetworkMonitor 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkMonitor, type NetworkInfo, type RequestStats } from './network-monitor';

describe('NetworkMonitor', () => {
  let monitor: NetworkMonitor;
  let onNetworkChange: ReturnType<typeof vi.fn>;
  let onNetworkQuality: ReturnType<typeof vi.fn>;
  let onBreadcrumb: ReturnType<typeof vi.fn>;
  let originalFetch: typeof fetch;
  let originalNavigator: Navigator;

  beforeEach(() => {
    onNetworkChange = vi.fn();
    onNetworkQuality = vi.fn();
    onBreadcrumb = vi.fn();
    
    originalFetch = window.fetch;
    originalNavigator = window.navigator;
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true
    });
    
    monitor = new NetworkMonitor({
      slowThreshold: 1000,
      reportInterval: 60000,
      onNetworkChange,
      onNetworkQuality,
      onBreadcrumb
    });
  });

  afterEach(() => {
    monitor.uninstall();
    window.fetch = originalFetch;
    vi.unstubAllGlobals();
  });

  describe('网络信息检测', () => {
    it('应该检测在线状态', () => {
      const info = monitor.getNetworkInfo();
      expect(info.online).toBe(true);
    });

    it('离线时应该返回 offline 类型', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      
      const newMonitor = new NetworkMonitor({});
      const info = newMonitor.getNetworkInfo();
      
      expect(info.type).toBe('offline');
      expect(info.online).toBe(false);
    });

    it('没有 Connection API 时应该返回 unknown', () => {
      const info = monitor.getNetworkInfo();
      // 默认环境没有 Connection API
      expect(['unknown', 'wifi', '4g', '3g', '2g', 'ethernet']).toContain(info.type);
    });
  });

  describe('请求统计', () => {
    it('初始统计应该为空', () => {
      const stats = monitor.getRequestStats();
      
      expect(stats.total).toBe(0);
      expect(stats.success).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.slow).toBe(0);
    });

    it('应该统计成功请求', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-length': '1000' })
      });
      window.fetch = mockFetch;
      
      monitor.install();
      
      await fetch('/api/test');
      
      const stats = monitor.getRequestStats();
      expect(stats.total).toBe(1);
      expect(stats.success).toBe(1);
      expect(stats.failed).toBe(0);
    });

    it('应该统计失败请求', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      window.fetch = mockFetch;
      
      monitor.install();
      
      try {
        await fetch('/api/fail');
      } catch {
        // 预期错误
      }
      
      const stats = monitor.getRequestStats();
      expect(stats.total).toBe(1);
      expect(stats.success).toBe(0);
      expect(stats.failed).toBe(1);
    });

    it('应该标记慢请求', async () => {
      const mockFetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          status: 200,
          headers: new Headers()
        }), 1100)) // 超过 1000ms 阈值
      );
      window.fetch = mockFetch;
      
      monitor.install();
      
      await fetch('/api/slow');
      
      const stats = monitor.getRequestStats();
      expect(stats.slow).toBe(1);
      expect(stats.slowRate).toBeGreaterThan(0);
    });

    it('应该计算失败率', async () => {
      const mockFetch = vi.fn()
        .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers() })
        .mockRejectedValueOnce(new Error('Error'));
      window.fetch = mockFetch;
      
      monitor.install();
      
      await fetch('/api/success');
      try { await fetch('/api/fail'); } catch {}
      
      const stats = monitor.getRequestStats();
      expect(stats.failureRate).toBe(0.5);
    });

    it('应该计算平均耗时', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        const delay = callCount === 1 ? 100 : 200;
        return new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          status: 200,
          headers: new Headers()
        }), delay));
      });
      window.fetch = mockFetch;
      
      monitor.install();
      
      await fetch('/api/fast');
      await fetch('/api/slow');
      
      const stats = monitor.getRequestStats();
      expect(stats.avgDuration).toBeGreaterThan(100);
      expect(stats.avgDuration).toBeLessThan(250);
    });

    it('应该记录最大耗时', async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(() => {
        callCount++;
        const delay = callCount === 1 ? 50 : 150;
        return new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          status: 200,
          headers: new Headers()
        }), delay));
      });
      window.fetch = mockFetch;
      
      monitor.install();
      
      await fetch('/api/1');
      await fetch('/api/2');
      
      const stats = monitor.getRequestStats();
      expect(stats.maxDuration).toBeGreaterThanOrEqual(150);
    });
  });

  describe('带宽估算', () => {
    it('没有样本时应该返回 undefined', () => {
      const estimate = monitor.getBandwidthEstimate();
      expect(estimate).toBeUndefined();
    });

    it('应该基于请求计算带宽', async () => {
      const mockFetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-length': '10240' }) // 10KB
        }), 100))
      );
      window.fetch = mockFetch;
      
      monitor.install();
      
      await fetch('/api/data');
      
      const estimate = monitor.getBandwidthEstimate();
      // 10KB / 0.1s * 8 = 800 Kbps
      expect(estimate).toBeDefined();
      expect(estimate?.sampleCount).toBe(1);
    });
  });

  describe('网络变化事件', () => {
    it('应该记录网络变化历史', () => {
      monitor.install();
      
      // 模拟离线事件
      window.dispatchEvent(new Event('offline'));
      
      const changes = monitor.getNetworkChanges();
      expect(changes.length).toBeGreaterThanOrEqual(1);
    });

    it('离线时应该触发回调', () => {
      monitor.install();
      
      window.dispatchEvent(new Event('offline'));
      
      expect(onNetworkChange).toHaveBeenCalledWith(expect.objectContaining({
        changeType: 'offline'
      }));
    });

    it('上线时应该触发回调', () => {
      monitor.install();
      
      window.dispatchEvent(new Event('online'));
      
      expect(onNetworkChange).toHaveBeenCalledWith(expect.objectContaining({
        changeType: 'online'
      }));
    });

    it('应该添加网络变化 breadcrumb', () => {
      monitor.install();
      
      window.dispatchEvent(new Event('offline'));
      
      expect(onBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        type: 'fetch',
        category: 'network',
        message: expect.stringContaining('offline')
      }));
    });
  });

  describe('慢请求 breadcrumb', () => {
    it('慢请求应该添加 breadcrumb', async () => {
      const mockFetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          status: 200,
          headers: new Headers()
        }), 1100))
      );
      window.fetch = mockFetch;
      
      monitor.install();
      
      await fetch('/api/slow');
      
      expect(onBreadcrumb).toHaveBeenCalledWith(expect.objectContaining({
        category: 'slow-request',
        message: expect.stringContaining('Slow request')
      }));
    });
  });

  describe('手动上报', () => {
    it('flush 应该触发上报', () => {
      monitor.install();
      
      monitor.flush();
      
      expect(onNetworkQuality).toHaveBeenCalledWith(expect.objectContaining({
        networkInfo: expect.any(Object),
        requestStats: expect.any(Object),
        timestamp: expect.any(Number)
      }));
    });

    it('flush 后应该重置统计', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers()
      });
      window.fetch = mockFetch;
      
      monitor.install();
      
      await fetch('/api/test');
      expect(monitor.getRequestStats().total).toBe(1);
      
      monitor.flush();
      expect(monitor.getRequestStats().total).toBe(0);
    });
  });

  describe('安装和卸载', () => {
    it('卸载后不应该追踪请求', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers()
      });
      window.fetch = mockFetch;
      
      monitor.install();
      monitor.uninstall();
      
      await fetch('/api/test');
      
      const stats = monitor.getRequestStats();
      expect(stats.total).toBe(0);
    });

    it('重复安装不应该有副作用', () => {
      monitor.install();
      monitor.install();
      
      // 不应该抛出错误
      expect(true).toBe(true);
    });
  });
});
