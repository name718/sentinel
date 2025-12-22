import type { MonitorConfig, Breadcrumb, ReportData, ErrorEvent, ResourceError } from '../types';
import { Reporter } from './reporter';
import { ErrorCatcher } from './error-catcher';
import { ResourceMonitor } from './resource-monitor';
import { BehaviorTracker } from './behavior-tracker';
import { PerformanceMonitor } from './performance-monitor';

/** 默认配置 */
const DEFAULT_CONFIG: Partial<MonitorConfig> = {
  sampleRate: 1,
  maxBreadcrumbs: 20,
  enableError: true,
  enablePerformance: true,
  enableBehavior: true,
  batchSize: 10,
  reportInterval: 5000
};

/** 监控核心类 */
export class Monitor {
  private static instance: Monitor | null = null;
  private config: MonitorConfig | null = null;
  private breadcrumbs: Breadcrumb[] = [];
  private initialized = false;
  private reporter: Reporter | null = null;
  private errorCatcher: ErrorCatcher | null = null;
  private resourceMonitor: ResourceMonitor | null = null;
  private behaviorTracker: BehaviorTracker | null = null;
  private performanceMonitor: PerformanceMonitor | null = null;

  private constructor() {}

  /** 获取单例实例 */
  static getInstance(): Monitor {
    if (!Monitor.instance) {
      Monitor.instance = new Monitor();
    }
    return Monitor.instance;
  }

  /** 初始化 SDK */
  init(config: MonitorConfig): void {
    if (this.initialized) {
      console.warn('[Monitor] Already initialized');
      return;
    }
    
    this.validateConfig(config);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialized = true;
    
    // 初始化上报器
    this.reporter = new Reporter({
      reportUrl: this.config.reportUrl,
      dsn: this.config.dsn,
      batchSize: this.config.batchSize!,
      reportInterval: this.config.reportInterval!
    });

    // 初始化错误捕获
    if (this.config.enableError) {
      this.errorCatcher = new ErrorCatcher({
        onError: (event) => this.handleError(event),
        getBreadcrumbs: () => this.getBreadcrumbs()
      });
      this.errorCatcher.install();

      this.resourceMonitor = new ResourceMonitor({
        onError: (event) => this.handleResourceError(event)
      });
      this.resourceMonitor.install();
    }

    // 初始化行为追踪
    if (this.config.enableBehavior) {
      this.behaviorTracker = new BehaviorTracker({
        onBreadcrumb: (crumb) => this.addBreadcrumb(crumb)
      });
      this.behaviorTracker.install();
    }

    // 初始化性能监控
    if (this.config.enablePerformance) {
      this.performanceMonitor = new PerformanceMonitor({
        onPerformance: (data) => this.report(data)
      });
      this.performanceMonitor.start();
    }

    console.log('[Monitor] Initialized with config:', this.config);
  }

  /** 校验配置 */
  private validateConfig(config: MonitorConfig): void {
    if (!config.dsn) {
      throw new Error('[Monitor] dsn is required');
    }
    if (!config.reportUrl) {
      throw new Error('[Monitor] reportUrl is required');
    }
    if (config.sampleRate !== undefined && (config.sampleRate < 0 || config.sampleRate > 1)) {
      throw new Error('[Monitor] sampleRate must be between 0 and 1');
    }
  }

  /** 处理错误事件 */
  private handleError(event: ErrorEvent): void {
    this.report(event);
  }

  /** 处理资源错误 */
  private handleResourceError(event: ResourceError): void {
    // 转换为 ErrorEvent 格式上报
    const errorEvent: ErrorEvent = {
      type: 'resource',
      message: `Resource load failed: ${event.url}`,
      timestamp: event.timestamp,
      url: event.pageUrl,
      breadcrumbs: this.getBreadcrumbs()
    };
    this.report(errorEvent);
  }

  /** 是否已初始化 */
  isInitialized(): boolean {
    return this.initialized;
  }

  /** 获取配置 */
  getConfig(): MonitorConfig | null {
    return this.config;
  }

  /** 添加 breadcrumb */
  addBreadcrumb(crumb: Breadcrumb): void {
    if (!this.initialized) return;
    
    const maxBreadcrumbs = this.config?.maxBreadcrumbs ?? DEFAULT_CONFIG.maxBreadcrumbs!;
    this.breadcrumbs.push(crumb);
    
    // 先进先出，保持最大数量
    if (this.breadcrumbs.length > maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /** 获取 breadcrumbs */
  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  /** 清空 breadcrumbs */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  /** 上报数据 */
  report(data: ReportData): void {
    if (!this.initialized || !this.reporter) return;
    
    // 采样率控制
    const sampleRate = this.config?.sampleRate ?? 1;
    if (Math.random() > sampleRate) return;
    
    this.reporter.push(data);
  }

  /** 立即上报所有数据 */
  flush(): void {
    this.reporter?.flush();
  }

  /** 手动捕获错误 */
  captureError(error: Error): void {
    this.errorCatcher?.captureError(error);
  }

  /** 手动捕获消息 */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    const event: ErrorEvent = {
      type: 'error',
      message: `[${level}] ${message}`,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      breadcrumbs: this.getBreadcrumbs()
    };
    this.report(event);
  }

  /** 获取 Reporter（用于测试） */
  getReporter(): Reporter | null {
    return this.reporter;
  }

  /** 销毁实例 */
  destroy(): void {
    this.errorCatcher?.uninstall();
    this.resourceMonitor?.uninstall();
    this.behaviorTracker?.uninstall();
    this.performanceMonitor?.stop();
    this.reporter?.destroy();
    
    this.errorCatcher = null;
    this.resourceMonitor = null;
    this.behaviorTracker = null;
    this.performanceMonitor = null;
    this.reporter = null;
    this.config = null;
    this.breadcrumbs = [];
    this.initialized = false;
    Monitor.instance = null;
  }
}

/** 便捷方法：初始化 */
export function init(config: MonitorConfig): void {
  Monitor.getInstance().init(config);
}

/** 便捷方法：手动捕获错误 */
export function captureError(error: Error): void {
  Monitor.getInstance().captureError(error);
}

/** 便捷方法：手动捕获消息 */
export function captureMessage(message: string, level?: 'info' | 'warning' | 'error'): void {
  Monitor.getInstance().captureMessage(message, level);
}
