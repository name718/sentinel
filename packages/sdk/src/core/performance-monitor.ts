import type { PerformanceData, LongTask } from '../types';

export interface PerformanceMonitorOptions {
  onPerformance: (data: PerformanceData) => void;
}

/** 性能监控器 */
export class PerformanceMonitor {
  private options: PerformanceMonitorOptions;
  private longTasks: LongTask[] = [];
  private lcpValue: number | undefined;
  private lcpObserver: PerformanceObserver | null = null;
  private longTaskObserver: PerformanceObserver | null = null;
  private collected = false;

  constructor(options: PerformanceMonitorOptions) {
    this.options = options;
  }

  /** 开始监控 */
  start(): void {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;
    
    this.observeLCP();
    this.observeLongTasks();
    
    // 页面加载完成后收集数据
    if (document.readyState === 'complete') {
      this.scheduleCollect();
    } else {
      window.addEventListener('load', () => this.scheduleCollect());
    }
  }

  /** 停止监控 */
  stop(): void {
    this.lcpObserver?.disconnect();
    this.longTaskObserver?.disconnect();
  }

  /** 延迟收集（等待 LCP 稳定） */
  private scheduleCollect(): void {
    // 等待一段时间让 LCP 稳定
    setTimeout(() => {
      this.collect();
    }, 3000);
  }

  /** 收集性能数据 */
  collect(): PerformanceData | null {
    if (this.collected) return null;
    if (typeof window === 'undefined' || typeof performance === 'undefined') return null;
    
    const data: PerformanceData = {
      url: window.location.href,
      timestamp: Date.now()
    };

    // 获取 Paint Timing
    const paintEntries = performance.getEntriesByType('paint');
    paintEntries.forEach((entry) => {
      if (entry.name === 'first-paint') {
        data.fp = Math.round(entry.startTime);
      } else if (entry.name === 'first-contentful-paint') {
        data.fcp = Math.round(entry.startTime);
      }
    });

    // 获取 Navigation Timing
    const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      data.ttfb = Math.round(nav.responseStart - nav.requestStart);
      data.domReady = Math.round(nav.domContentLoadedEventEnd - nav.fetchStart);
      data.load = Math.round(nav.loadEventEnd - nav.fetchStart);
    }

    // LCP
    if (this.lcpValue !== undefined) {
      data.lcp = Math.round(this.lcpValue);
    }

    // Long Tasks
    if (this.longTasks.length > 0) {
      data.longTasks = [...this.longTasks];
    }

    this.collected = true;
    this.options.onPerformance(data);
    
    return data;
  }

  /** 监控 LCP */
  private observeLCP(): void {
    try {
      this.lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.lcpValue = lastEntry.startTime;
        }
      });
      
      this.lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (e) {
      // LCP 不支持
    }
  }

  /** 监控长任务 */
  private observeLongTasks(): void {
    try {
      this.longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          // 只记录超过 50ms 的任务
          if (entry.duration > 50) {
            this.longTasks.push({
              startTime: Math.round(entry.startTime),
              duration: Math.round(entry.duration)
            });
          }
        });
      });
      
      this.longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch (e) {
      // Long Task 不支持
    }
  }

  /** 获取长任务列表（用于测试） */
  getLongTasks(): LongTask[] {
    return [...this.longTasks];
  }
}
