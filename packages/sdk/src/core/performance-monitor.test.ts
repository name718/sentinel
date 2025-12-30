/**
 * PerformanceMonitor 单元测试
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor } from './performance-monitor';
import type { PerformanceData } from '../types';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let onPerformance: ReturnType<typeof vi.fn>;
  let mockPerformanceObserver: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onPerformance = vi.fn();
    
    // Mock PerformanceObserver
    mockPerformanceObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn().mockReturnValue([])
    }));
    vi.stubGlobal('PerformanceObserver', mockPerformanceObserver);
    
    // Mock performance API
    vi.stubGlobal('performance', {
      getEntriesByType: vi.fn().mockReturnValue([]),
      now: vi.fn().mockReturnValue(1000)
    });

    monitor = new PerformanceMonitor({ onPerformance });
  });

  afterEach(() => {
    monitor.stop();
    vi.unstubAllGlobals();
  });

  describe('INP 计算', () => {
    it('交互次数少于 50 时应返回最大值', () => {
      // 模拟少量交互
      const interactions = [
        { interactionId: 1, duration: 100 },
        { interactionId: 2, duration: 200 },
        { interactionId: 3, duration: 150 }
      ];
      
      // 直接设置 interactionEntries
      const interactionEntries = (monitor as any).interactionEntries as Map<number, any>;
      interactions.forEach(i => interactionEntries.set(i.interactionId, i));
      
      const inp = monitor.getINP();
      expect(inp).toBe(200); // 最大值
    });

    it('交互次数 >= 50 时应返回 P98 值', () => {
      const interactionEntries = (monitor as any).interactionEntries as Map<number, any>;
      
      // 创建 100 个交互，duration 从 10 到 1000
      for (let i = 1; i <= 100; i++) {
        interactionEntries.set(i, { interactionId: i, duration: i * 10 });
      }
      
      const inp = monitor.getINP();
      // P98 = 第 98 个值 = 980
      expect(inp).toBe(980);
    });

    it('没有交互时应返回 undefined', () => {
      const inp = monitor.getINP();
      expect(inp).toBeUndefined();
    });

    it('同一交互的多个事件应取最大 duration', () => {
      const interactionEntries = (monitor as any).interactionEntries as Map<number, any>;
      
      // 模拟同一交互的多个事件（如 pointerdown + pointerup）
      interactionEntries.set(1, { interactionId: 1, duration: 50 });
      // 更新为更大的值
      interactionEntries.set(1, { interactionId: 1, duration: 100 });
      
      expect(monitor.getInteractionCount()).toBe(1);
      expect(monitor.getINP()).toBe(100);
    });
  });

  describe('INP 评分', () => {
    it('INP < 200ms 应评为 good', () => {
      const interactionEntries = (monitor as any).interactionEntries as Map<number, any>;
      interactionEntries.set(1, { interactionId: 1, duration: 150 });
      
      const data = monitor.collect();
      expect(data?.webVitalsScore?.inp).toBe('good');
    });

    it('INP 200-500ms 应评为 needs-improvement', () => {
      const interactionEntries = (monitor as any).interactionEntries as Map<number, any>;
      interactionEntries.set(1, { interactionId: 1, duration: 350 });
      
      const data = monitor.collect();
      expect(data?.webVitalsScore?.inp).toBe('needs-improvement');
    });

    it('INP > 500ms 应评为 poor', () => {
      const interactionEntries = (monitor as any).interactionEntries as Map<number, any>;
      interactionEntries.set(1, { interactionId: 1, duration: 600 });
      
      const data = monitor.collect();
      expect(data?.webVitalsScore?.inp).toBe('poor');
    });
  });

  describe('其他 Web Vitals 评分', () => {
    it('FCP 评分阈值正确', () => {
      const scoreMethod = (monitor as any).scoreFCP.bind(monitor);
      
      expect(scoreMethod(1000)).toBe('good');      // < 1800
      expect(scoreMethod(2000)).toBe('needs-improvement'); // 1800-3000
      expect(scoreMethod(4000)).toBe('poor');      // > 3000
      expect(scoreMethod(undefined)).toBeNull();
    });

    it('LCP 评分阈值正确', () => {
      const scoreMethod = (monitor as any).scoreLCP.bind(monitor);
      
      expect(scoreMethod(2000)).toBe('good');      // < 2500
      expect(scoreMethod(3000)).toBe('needs-improvement'); // 2500-4000
      expect(scoreMethod(5000)).toBe('poor');      // > 4000
    });

    it('CLS 评分阈值正确', () => {
      const scoreMethod = (monitor as any).scoreCLS.bind(monitor);
      
      expect(scoreMethod(0.05)).toBe('good');      // < 0.1
      expect(scoreMethod(0.15)).toBe('needs-improvement'); // 0.1-0.25
      expect(scoreMethod(0.3)).toBe('poor');       // > 0.25
    });

    it('TTFB 评分阈值正确', () => {
      const scoreMethod = (monitor as any).scoreTTFB.bind(monitor);
      
      expect(scoreMethod(500)).toBe('good');       // < 800
      expect(scoreMethod(1000)).toBe('needs-improvement'); // 800-1800
      expect(scoreMethod(2000)).toBe('poor');      // > 1800
    });

    it('FID 评分阈值正确（向后兼容）', () => {
      const scoreMethod = (monitor as any).scoreFID.bind(monitor);
      
      expect(scoreMethod(50)).toBe('good');        // < 100
      expect(scoreMethod(200)).toBe('needs-improvement'); // 100-300
      expect(scoreMethod(400)).toBe('poor');       // > 300
    });
  });

  describe('数据收集', () => {
    it('collect 应该只执行一次', () => {
      const data1 = monitor.collect();
      const data2 = monitor.collect();
      
      expect(data1).not.toBeNull();
      expect(data2).toBeNull(); // 第二次应返回 null
    });

    it('收集的数据应包含必要字段', () => {
      const data = monitor.collect();
      
      expect(data).toHaveProperty('url');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('webVitalsScore');
    });

    it('应该调用 onPerformance 回调', () => {
      monitor.collect();
      
      expect(onPerformance).toHaveBeenCalledTimes(1);
      expect(onPerformance).toHaveBeenCalledWith(expect.objectContaining({
        url: expect.any(String),
        timestamp: expect.any(Number)
      }));
    });
  });

  describe('长任务监控', () => {
    it('getLongTasks 应返回长任务列表', () => {
      const longTasks = (monitor as any).longTasks;
      longTasks.push({ startTime: 100, duration: 80, attribution: 'script' });
      longTasks.push({ startTime: 200, duration: 120, attribution: 'unknown' });
      
      const result = monitor.getLongTasks();
      expect(result).toHaveLength(2);
      expect(result[0].duration).toBe(80);
    });
  });
});
