/**
 * @file PerformanceMonitor 性能监控模块
 * @description 采集页面性能指标，包括加载时间和运行时性能
 * 
 * ## 功能职责
 * - 采集 Web Vitals 核心指标（FP、FCP、LCP）
 * - 采集导航时间（TTFB、DOM Ready、Load）
 * - 监控长任务（Long Task）
 * 
 * ## 核心指标说明
 * 
 * ### 1. FP (First Paint) - 首次绘制
 * 浏览器首次将像素渲染到屏幕的时间点
 * - 可能只是背景色
 * - 表示页面开始有视觉反馈
 * 
 * ### 2. FCP (First Contentful Paint) - 首次内容绘制
 * 浏览器首次渲染 DOM 内容的时间点
 * - 文本、图片、SVG、非白色 canvas
 * - 用户开始看到实际内容
 * - 建议值：< 1.8s
 * 
 * ### 3. LCP (Largest Contentful Paint) - 最大内容绘制
 * 视口内最大内容元素渲染完成的时间点
 * - 通常是主图或主要文本块
 * - 代表主要内容加载完成
 * - 建议值：< 2.5s
 * 
 * ### 4. TTFB (Time To First Byte) - 首字节时间
 * 从请求发出到收到第一个字节的时间
 * - 反映服务器响应速度
 * - 包含 DNS、TCP、SSL、服务器处理时间
 * - 建议值：< 600ms
 * 
 * ### 5. DOM Ready
 * DOMContentLoaded 事件触发时间
 * - HTML 解析完成，DOM 树构建完成
 * - 不包含样式表、图片、子框架
 * 
 * ### 6. Load
 * load 事件触发时间
 * - 所有资源（图片、样式等）加载完成
 * 
 * ### 7. Long Task - 长任务
 * 执行时间超过 50ms 的任务
 * - 会阻塞主线程
 * - 导致页面卡顿、交互延迟
 * - 建议优化超过 50ms 的任务
 * 
 * ## 核心原理
 * 
 * ### Performance API
 * 使用浏览器原生 Performance API 获取数据：
 * 
 * ```javascript
 * // Paint Timing
 * performance.getEntriesByType('paint');
 * // → [{name: 'first-paint', startTime: 123}, {name: 'first-contentful-paint', startTime: 456}]
 * 
 * // Navigation Timing
 * performance.getEntriesByType('navigation');
 * // → [{responseStart, domContentLoadedEventEnd, loadEventEnd, ...}]
 * ```
 * 
 * ### PerformanceObserver
 * 用于监听性能条目的异步 API：
 * 
 * ```javascript
 * // 监听 LCP
 * new PerformanceObserver((list) => {
 *   const entries = list.getEntries();
 *   const lastEntry = entries[entries.length - 1];
 *   console.log('LCP:', lastEntry.startTime);
 * }).observe({ type: 'largest-contentful-paint', buffered: true });
 * 
 * // 监听 Long Task
 * new PerformanceObserver((list) => {
 *   list.getEntries().forEach(entry => {
 *     console.log('Long Task:', entry.duration);
 *   });
 * }).observe({ type: 'longtask', buffered: true });
 * ```
 * 
 * ## 采集时机
 * - 页面 load 事件后延迟 3 秒采集
 * - 等待 LCP 稳定（LCP 可能多次更新）
 * - 只采集一次，避免重复上报
 * 
 * ## 浏览器兼容性
 * - Paint Timing: Chrome 60+, Firefox 84+
 * - LCP: Chrome 77+, Edge 79+
 * - Long Task: Chrome 58+
 * - Safari 对部分 API 支持有限
 */

import type { PerformanceData, LongTask, ResourceTiming, WebVitalsScore } from '../types';

export interface PerformanceMonitorOptions {
  onPerformance: (data: PerformanceData) => void;
}

/** 性能监控器 */
export class PerformanceMonitor {
  private options: PerformanceMonitorOptions;
  private longTasks: LongTask[] = [];
  private resources: ResourceTiming[] = [];
  private lcpValue: number | undefined;
  private fidValue: number | undefined;
  private clsValue: number = 0;
  private lcpObserver: PerformanceObserver | null = null;
  private longTaskObserver: PerformanceObserver | null = null;
  private clsObserver: PerformanceObserver | null = null;
  private collected = false;

  constructor(options: PerformanceMonitorOptions) {
    this.options = options;
  }

  /** 开始监控 */
  start(): void {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;
    
    this.observeLCP();
    this.observeLongTasks();
    this.observeCLS();
    this.observeFID();
    
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
    this.clsObserver?.disconnect();
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

    // FID
    if (this.fidValue !== undefined) {
      data.fid = Math.round(this.fidValue);
    }

    // CLS
    data.cls = Math.round(this.clsValue * 1000) / 1000; // 保留3位小数

    // Long Tasks
    if (this.longTasks.length > 0) {
      data.longTasks = [...this.longTasks];
    }

    // 收集资源加载数据
    this.collectResources();
    if (this.resources.length > 0) {
      data.resources = [...this.resources];
    }

    // 计算 Web Vitals 评分
    data.webVitalsScore = this.calculateWebVitalsScore(data);

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
        list.getEntries().forEach((entry: any) => {
          // 只记录超过 50ms 的任务
          if (entry.duration > 50) {
            this.longTasks.push({
              startTime: Math.round(entry.startTime),
              duration: Math.round(entry.duration),
              attribution: entry.attribution?.[0]?.name || 'unknown'
            });
          }
        });
      });
      
      this.longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch (e) {
      // Long Task 不支持
    }
  }

  /** 监控 CLS (Cumulative Layout Shift) */
  private observeCLS(): void {
    try {
      this.clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            this.clsValue += entry.value;
          }
        });
      });
      
      this.clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      // CLS 不支持
    }
  }

  /** 监控 FID (First Input Delay) */
  private observeFID(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const firstInput = entries[0] as any;
          this.fidValue = firstInput.processingStart - firstInput.startTime;
          observer.disconnect();
        }
      });
      
      observer.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      // FID 不支持
    }
  }

  /** 收集资源加载数据 */
  private collectResources(): void {
    if (typeof performance === 'undefined') return;

    const resourceEntries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    this.resources = resourceEntries.map(entry => {
      const resource: ResourceTiming = {
        name: entry.name,
        type: this.getResourceType(entry.initiatorType),
        startTime: Math.round(entry.startTime),
        duration: Math.round(entry.duration),
        size: entry.transferSize || 0,
        protocol: (entry as any).nextHopProtocol || undefined,
        cached: entry.transferSize === 0 && entry.decodedBodySize > 0
      };
      return resource;
    });
  }

  /** 获取资源类型 */
  private getResourceType(initiatorType: string): string {
    const typeMap: Record<string, string> = {
      'link': 'css',
      'script': 'js',
      'img': 'image',
      'xmlhttprequest': 'xhr',
      'fetch': 'fetch',
      'other': 'other'
    };
    return typeMap[initiatorType] || initiatorType;
  }

  /** 计算 Web Vitals 评分 */
  private calculateWebVitalsScore(data: PerformanceData): WebVitalsScore {
    return {
      fcp: this.scoreFCP(data.fcp),
      lcp: this.scoreLCP(data.lcp),
      fid: this.scoreFID(data.fid),
      cls: this.scoreCLS(data.cls),
      ttfb: this.scoreTTFB(data.ttfb)
    };
  }

  /** FCP 评分 (Good: <1.8s, Needs Improvement: 1.8-3s, Poor: >3s) */
  private scoreFCP(value?: number): 'good' | 'needs-improvement' | 'poor' | null {
    if (value === undefined) return null;
    if (value < 1800) return 'good';
    if (value < 3000) return 'needs-improvement';
    return 'poor';
  }

  /** LCP 评分 (Good: <2.5s, Needs Improvement: 2.5-4s, Poor: >4s) */
  private scoreLCP(value?: number): 'good' | 'needs-improvement' | 'poor' | null {
    if (value === undefined) return null;
    if (value < 2500) return 'good';
    if (value < 4000) return 'needs-improvement';
    return 'poor';
  }

  /** FID 评分 (Good: <100ms, Needs Improvement: 100-300ms, Poor: >300ms) */
  private scoreFID(value?: number): 'good' | 'needs-improvement' | 'poor' | null {
    if (value === undefined) return null;
    if (value < 100) return 'good';
    if (value < 300) return 'needs-improvement';
    return 'poor';
  }

  /** CLS 评分 (Good: <0.1, Needs Improvement: 0.1-0.25, Poor: >0.25) */
  private scoreCLS(value?: number): 'good' | 'needs-improvement' | 'poor' | null {
    if (value === undefined) return null;
    if (value < 0.1) return 'good';
    if (value < 0.25) return 'needs-improvement';
    return 'poor';
  }

  /** TTFB 评分 (Good: <800ms, Needs Improvement: 800-1800ms, Poor: >1800ms) */
  private scoreTTFB(value?: number): 'good' | 'needs-improvement' | 'poor' | null {
    if (value === undefined) return null;
    if (value < 800) return 'good';
    if (value < 1800) return 'needs-improvement';
    return 'poor';
  }

  /** 获取长任务列表（用于测试） */
  getLongTasks(): LongTask[] {
    return [...this.longTasks];
  }
}
