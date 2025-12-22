/**
 * @file Reporter 数据上报模块
 * @description 负责将采集到的监控数据可靠地发送到服务端
 * 
 * ## 功能职责
 * - 数据队列管理
 * - 批量上报（合并多条数据为一次请求）
 * - 节流控制（限制上报频率）
 * - 离线缓存（网络不可用时暂存数据）
 * - 页面卸载时使用 sendBeacon 发送
 * 
 * ## 核心原理
 * 
 * ### 1. 批量上报
 * 将多条数据合并为一次 HTTP 请求，减少网络开销：
 * - 数据先进入队列
 * - 达到阈值（batchSize）或超时（reportInterval）时触发上报
 * - 合并为 { dsn, events: [...] } 格式发送
 * 
 * ### 2. 节流控制
 * 防止短时间内大量上报导致服务端压力：
 * - 记录上次上报时间
 * - 两次上报间隔不小于 minInterval（默认 1s）
 * 
 * ### 3. 离线缓存
 * 网络不可用时保证数据不丢失：
 * - 检测 navigator.onLine 状态
 * - 离线时将数据存入 localStorage
 * - 监听 online 事件，网络恢复后重传
 * - 限制缓存数据量（最多 100 条）
 * 
 * ### 4. sendBeacon
 * 页面卸载时确保数据发送：
 * - 监听 beforeunload 事件
 * - 使用 navigator.sendBeacon() 发送
 * - sendBeacon 是异步的，不会阻塞页面关闭
 * - 如果 sendBeacon 失败，降级到离线缓存
 * 
 * ## 上报流程
 * ```
 * push(data) → 队列 → 达到阈值? → flush() → 检查网络 → send() / saveOffline()
 *                         ↑
 *                    定时器触发
 * ```
 */

import type { ReportData } from '../types';

export interface ReporterConfig {
  reportUrl: string;
  dsn: string;
  batchSize: number;
  reportInterval: number;
  maxRetries?: number;
}

const STORAGE_KEY = 'monitor_offline_queue';

/** 数据上报器 */
export class Reporter {
  private queue: ReportData[] = [];
  private config: ReporterConfig;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastReportTime = 0;
  private minInterval = 1000; // 最小上报间隔 1s（节流）

  constructor(config: ReporterConfig) {
    this.config = config;
    this.loadOfflineData();
    this.startTimer();
    this.setupBeforeUnload();
    this.setupOnlineListener();
  }

  /** 添加数据到队列 */
  push(data: ReportData): void {
    this.queue.push(data);
    
    // 达到批量阈值时立即上报
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /** 立即上报队列中的数据 */
  flush(): void {
    if (this.queue.length === 0) return;
    
    // 节流控制
    const now = Date.now();
    if (now - this.lastReportTime < this.minInterval) {
      return;
    }
    
    const data = [...this.queue];
    this.queue = [];
    this.lastReportTime = now;
    
    this.send(data);
  }

  /** 发送数据到服务端 */
  private async send(data: ReportData[]): Promise<void> {
    // 检查网络状态
    if (!navigator.onLine) {
      this.saveOfflineData(data);
      return;
    }

    const payload = {
      dsn: this.config.dsn,
      events: data
    };

    try {
      const response = await fetch(this.config.reportUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('[Monitor] Report failed, saving to offline queue:', error);
      this.saveOfflineData(data);
    }
  }

  /** 使用 sendBeacon 发送（页面卸载时） */
  private sendBeacon(data: ReportData[]): boolean {
    if (data.length === 0) return true;
    
    const payload = JSON.stringify({
      dsn: this.config.dsn,
      events: data
    });

    return navigator.sendBeacon(this.config.reportUrl, payload);
  }

  /** 启动定时上报 */
  private startTimer(): void {
    this.timer = setInterval(() => {
      this.flush();
    }, this.config.reportInterval);
  }

  /** 停止定时器 */
  stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** 页面卸载时上报 */
  private setupBeforeUnload(): void {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('beforeunload', () => {
      this.stopTimer();
      // 使用 sendBeacon 确保数据发送
      if (this.queue.length > 0) {
        const success = this.sendBeacon(this.queue);
        if (!success) {
          this.saveOfflineData(this.queue);
        }
        this.queue = [];
      }
    });
  }

  /** 监听网络恢复 */
  private setupOnlineListener(): void {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('online', () => {
      this.retryOfflineData();
    });
  }

  /** 保存离线数据 */
  private saveOfflineData(data: ReportData[]): void {
    try {
      const existing = this.getOfflineData();
      const combined = [...existing, ...data];
      // 限制离线数据量，最多保存 100 条
      const limited = combined.slice(-100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
    } catch (e) {
      console.warn('[Monitor] Failed to save offline data:', e);
    }
  }

  /** 获取离线数据 */
  private getOfflineData(): ReportData[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /** 加载并重试离线数据 */
  private loadOfflineData(): void {
    if (navigator.onLine) {
      this.retryOfflineData();
    }
  }

  /** 重试发送离线数据 */
  private retryOfflineData(): void {
    const offlineData = this.getOfflineData();
    if (offlineData.length > 0) {
      localStorage.removeItem(STORAGE_KEY);
      this.send(offlineData);
    }
  }

  /** 获取当前队列长度（用于测试） */
  getQueueLength(): number {
    return this.queue.length;
  }

  /** 获取队列数据（用于测试） */
  getQueue(): ReportData[] {
    return [...this.queue];
  }

  /** 销毁 */
  destroy(): void {
    this.stopTimer();
    this.queue = [];
  }
}
