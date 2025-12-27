/**
 * @file PerformanceMonitor 性能监控模块
 * @description 采集页面性能指标，包括加载时间和运行时性能
 * 
 * ## 功能职责
 * - 采集 Web Vitals 核心指标（FP、FCP、LCP、INP、CLS）
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
 * ### 4. INP (Interaction to Next Paint) - 交互到下一次绘制
 * 衡量页面整体交互响应性的指标（2024年3月起替代 FID 成为 Core Web Vitals）
 * - 测量从用户交互到下一帧绘制的延迟
 * - 考虑页面生命周期内所有交互，取第 98 百分位值
 * - 比 FID 更全面：FID 只测量首次交互，INP 测量所有交互
 * - 建议值：< 200ms (Good), 200-500ms (Needs Improvement), > 500ms (Poor)
 * 
 * ### 5. FID (First Input Delay) - 首次输入延迟 [已废弃]
 * @deprecated 2024年3月起被 INP 替代
 * 用户首次交互到浏览器响应的延迟
 * - 只测量首次交互
 * - 建议值：< 100ms
 * 
 * ### 6. CLS (Cumulative Layout Shift) - 累积布局偏移
 * 页面生命周期内所有意外布局偏移的累积分数
 * - 建议值：< 0.1
 * 
 * ### 7. TTFB (Time To First Byte) - 首字节时间
 * 从请求发出到收到第一个字节的时间
 * - 反映服务器响应速度
 * - 包含 DNS、TCP、SSL、服务器处理时间
 * - 建议值：< 800ms
 * 
 * ### 8. DOM Ready
 * DOMContentLoaded 事件触发时间
 * - HTML 解析完成，DOM 树构建完成
 * - 不包含样式表、图片、子框架
 * 
 * ### 9. Load
 * load 事件触发时间
 * - 所有资源（图片、样式等）加载完成
 * 
 * ### 10. Long Task - 长任务
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
 * // 监听 INP (需要 event timing API)
 * new PerformanceObserver((list) => {
 *   list.getEntries().forEach(entry => {
 *     // INP = processingEnd - startTime (包含输入延迟 + 处理时间)
 *     // 或使用 duration 字段（包含呈现延迟）
 *     const inp = entry.duration;
 *     console.log('Interaction duration:', inp);
 *   });
 * }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
 * 
 * // 监听 Long Task
 * new PerformanceObserver((list) => {
 *   list.getEntries().forEach(entry => {
 *     console.log('Long Task:', entry.duration);
 *   });
 * }).observe({ type: 'longtask', buffered: true });
 * ```
 * 
 * ## INP 计算方法
 * INP 取页面生命周期内所有交互延迟的第 98 百分位值：
 * 1. 收集所有交互事件（click, keydown, pointerdown 等）
 * 2. 对于每个交互，计算 duration（从事件触发到下一帧绘制）
 * 3. 按 duration 排序，取 P98 值作为 INP
 * 4. 如果交互次数 < 50，取最大值
 * 
 * ## 采集时机
 * - 页面 load 事件后延迟 3 秒采集
 * - 等待 LCP 稳定（LCP 可能多次更新）
 * - INP 持续监控直到页面卸载
 * - 只采集一次，避免重复上报
 * 
 * ## 浏览器兼容性
 * - Paint Timing: Chrome 60+, Firefox 84+
 * - LCP: Chrome 77+, Edge 79+
 * - INP (Event Timing): Chrome 96+, Edge 96+
 * - Long Task: Chrome 58+
 * - Safari 对部分 API 支持有限
 */

import type { PerformanceData, LongTask, ResourceTiming, WebVitalsScore, VitalsRating } from '../types';

export interface PerformanceMonitorOptions {
  onPerformance: (data: PerformanceData) => void;
}

/** 交互事件条目（用于 INP 计算） */
interface InteractionEntry {
  /** 交互 ID */
  interactionId: number;
  /** 交互延迟（duration） */
  duration: number;
}

/** 性能监控器 */
export class PerformanceMonitor {
  private options: PerformanceMonitorOptions;
  private longTasks: LongTask[] = [];
  private resources: ResourceTiming[] = [];
  private lcpValue: number | undefined;
  private fidValue: number | undefined;
  private clsValue: number = 0;
  /** INP 相关：存储所有交互的延迟 */
  private interactionEntries: Map<number, InteractionEntry> = new Map();
  private lcpObserver: PerformanceObserver | null = null;
  private longTaskObserver: PerformanceObserver | null = null;
  private clsObserver: PerformanceObserver | null = null;
  private inpObserver: PerformanceObserver | null = null;
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
    this.observeINP();
    
    // 页面加载完成后收集数据
    if (document.readyState === 'complete') {
      this.scheduleCollect();
    } else {
      window.addEventListener('load', () => this.scheduleCollect());
    }

    // 备用：如果 load 事件迟迟不触发（慢网络），也要收集数据
    // 最多等待 30 秒
    setTimeout(() => {
      if (!this.collected) {
        console.log('[PerformanceMonitor] Fallback collect after 30s timeout');
        this.collect();
      }
    }, 30000);
  }

  /** 停止监控 */
  stop(): void {
    this.lcpObserver?.disconnect();
    this.longTaskObserver?.disconnect();
    this.clsObserver?.disconnect();
    this.inpObserver?.disconnect();
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
      // loadEventEnd 可能还是 0，使用 performance.now() 作为备用
      const loadTime = nav.loadEventEnd > 0 
        ? nav.loadEventEnd - nav.fetchStart 
        : performance.now();
      data.load = Math.round(loadTime);
    }

    // LCP
    if (this.lcpValue !== undefined) {
      data.lcp = Math.round(this.lcpValue);
    }

    // FID
    if (this.fidValue !== undefined) {
      data.fid = Math.round(this.fidValue);
    }

    // INP (Interaction to Next Paint)
    const inpValue = this.calculateINP();
    if (inpValue !== undefined) {
      data.inp = Math.round(inpValue);
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
    
    console.log('[PerformanceMonitor] Collected:', data);
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

  /**
   * 监控 INP (Interaction to Next Paint)
   * 
   * INP 通过 Event Timing API 收集所有交互事件的延迟，
   * 然后取第 98 百分位值作为最终 INP 值。
   * 
   * 交互事件包括：
   * - pointerdown/pointerup (点击)
   * - keydown/keyup (键盘)
   * - 其他用户交互
   * 
   * 每个交互可能产生多个事件条目（如 pointerdown + pointerup），
   * 使用 interactionId 将它们分组，取最大 duration 作为该交互的延迟。
   */
  private observeINP(): void {
    try {
      this.inpObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          // 只处理有 interactionId 的条目（表示用户交互）
          // interactionId 为 0 表示非交互事件
          if (entry.interactionId && entry.interactionId > 0) {
            const existingEntry = this.interactionEntries.get(entry.interactionId);
            
            // 同一个交互可能有多个事件（如 pointerdown + pointerup）
            // 取最大的 duration 作为该交互的延迟
            if (!existingEntry || entry.duration > existingEntry.duration) {
              this.interactionEntries.set(entry.interactionId, {
                interactionId: entry.interactionId,
                duration: entry.duration
              });
            }
          }
        });
      });
      
      // 使用 event 类型监听，设置 durationThreshold 为 16ms（约 1 帧）
      // 这样可以过滤掉非常快的交互，减少数据量
      this.inpObserver.observe({ 
        type: 'event', 
        buffered: true,
        // @ts-expect-error - durationThreshold 是有效选项但 TypeScript 类型定义可能不完整
        durationThreshold: 16 
      });
    } catch (e) {
      // Event Timing API 不支持（Safari 等）
      console.log('[PerformanceMonitor] INP observation not supported');
    }
  }

  /**
   * 计算 INP 值
   * 
   * INP 计算规则（根据 Google 官方定义）：
   * 1. 收集页面生命周期内所有交互的延迟
   * 2. 如果交互次数 >= 50，取第 98 百分位值
   * 3. 如果交互次数 < 50，取最大值
   * 
   * 这样可以排除极端异常值，同时反映用户的真实体验。
   */
  private calculateINP(): number | undefined {
    if (this.interactionEntries.size === 0) {
      return undefined;
    }

    // 获取所有交互的 duration 并排序
    const durations = Array.from(this.interactionEntries.values())
      .map(entry => entry.duration)
      .sort((a, b) => a - b);

    const count = durations.length;
    
    if (count < 1) {
      return undefined;
    }

    // 根据交互次数选择计算方式
    if (count >= 50) {
      // 取第 98 百分位值
      const index = Math.floor(count * 0.98) - 1;
      return durations[Math.max(0, index)];
    } else {
      // 交互次数少于 50，取最大值
      return durations[count - 1];
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
      inp: this.scoreINP(data.inp),
      cls: this.scoreCLS(data.cls),
      ttfb: this.scoreTTFB(data.ttfb)
    };
  }

  /** FCP 评分 (Good: <1.8s, Needs Improvement: 1.8-3s, Poor: >3s) */
  private scoreFCP(value?: number): VitalsRating {
    if (value === undefined) return null;
    if (value < 1800) return 'good';
    if (value < 3000) return 'needs-improvement';
    return 'poor';
  }

  /** LCP 评分 (Good: <2.5s, Needs Improvement: 2.5-4s, Poor: >4s) */
  private scoreLCP(value?: number): VitalsRating {
    if (value === undefined) return null;
    if (value < 2500) return 'good';
    if (value < 4000) return 'needs-improvement';
    return 'poor';
  }

  /** FID 评分 (Good: <100ms, Needs Improvement: 100-300ms, Poor: >300ms) */
  private scoreFID(value?: number): VitalsRating {
    if (value === undefined) return null;
    if (value < 100) return 'good';
    if (value < 300) return 'needs-improvement';
    return 'poor';
  }

  /** 
   * INP 评分 (Good: <200ms, Needs Improvement: 200-500ms, Poor: >500ms)
   * 
   * INP 阈值说明（Google 官方标准）：
   * - Good: < 200ms - 用户感觉响应即时
   * - Needs Improvement: 200-500ms - 用户能感知到延迟
   * - Poor: > 500ms - 用户体验明显受损
   */
  private scoreINP(value?: number): VitalsRating {
    if (value === undefined) return null;
    if (value < 200) return 'good';
    if (value < 500) return 'needs-improvement';
    return 'poor';
  }

  /** CLS 评分 (Good: <0.1, Needs Improvement: 0.1-0.25, Poor: >0.25) */
  private scoreCLS(value?: number): VitalsRating {
    if (value === undefined) return null;
    if (value < 0.1) return 'good';
    if (value < 0.25) return 'needs-improvement';
    return 'poor';
  }

  /** TTFB 评分 (Good: <800ms, Needs Improvement: 800-1800ms, Poor: >1800ms) */
  private scoreTTFB(value?: number): VitalsRating {
    if (value === undefined) return null;
    if (value < 800) return 'good';
    if (value < 1800) return 'needs-improvement';
    return 'poor';
  }

  /** 获取长任务列表（用于测试） */
  getLongTasks(): LongTask[] {
    return [...this.longTasks];
  }

  /** 获取当前 INP 值（用于测试和调试） */
  getINP(): number | undefined {
    return this.calculateINP();
  }

  /** 获取交互次数（用于测试和调试） */
  getInteractionCount(): number {
    return this.interactionEntries.size;
  }
}
