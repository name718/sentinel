/**
 * @file Monitor 核心模块
 * @description 前端监控 SDK 的核心入口，负责初始化和协调各个子模块
 * 
 * ## 功能职责
 * - 提供 SDK 初始化入口 init()
 * - 管理全局配置（dsn、上报地址、采样率等）
 * - 协调各子模块（错误捕获、性能监控、行为追踪、数据上报）
 * - 管理 Breadcrumbs（用户行为面包屑）
 * - 管理用户信息和自定义上下文
 * - 提供手动上报接口
 * - 支持 URL 过滤、错误过滤、beforeSend 钩子
 * 
 * ## 设计模式
 * - 单例模式：确保全局只有一个 Monitor 实例，避免重复初始化
 * - 门面模式：对外提供简洁的 API，内部协调多个子系统
 * 
 * ## 使用方式
 * ```typescript
 * import { Monitor } from '@monitor/sdk';
 * 
 * const monitor = Monitor.getInstance();
 * monitor.init({
 *   dsn: 'your-project-id',
 *   reportUrl: 'https://your-server.com/api/report',
 *   errorSampleRate: 0.5,  // 50% 错误采样
 *   ignoreErrors: [/Script error/],  // 忽略跨域脚本错误
 *   beforeSend: (event) => {
 *     // 过滤或修改事件
 *     return event;
 *   }
 * });
 * 
 * // 设置用户信息
 * monitor.setUser({ id: '123', username: 'test' });
 * 
 * // 设置上下文
 * monitor.setContext({ version: '1.0.0', environment: 'production' });
 * ```
 */

import type { 
  MonitorConfig, 
  Breadcrumb, 
  ReportData, 
  ErrorEvent, 
  ResourceError,
  UserInfo,
  CustomContext,
  DeviceInfo,
  PerformanceData
} from '../types';
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
  
  /** 用户信息 */
  private user: UserInfo | null = null;
  /** 自定义上下文 */
  private context: CustomContext = {};
  /** 设备信息（自动检测） */
  private deviceInfo: DeviceInfo | null = null;

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

    // 自动检测设备信息
    this.deviceInfo = this.detectDeviceInfo();
    
    console.log('[Monitor] Initialized with config:', this.config);
  }

  /** 自动检测设备信息 */
  private detectDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {};
    }

    const ua = navigator.userAgent;
    const device: DeviceInfo = {};

    // 检测操作系统
    if (/Windows/.test(ua)) device.os = 'Windows';
    else if (/Mac OS X/.test(ua)) device.os = 'macOS';
    else if (/Linux/.test(ua)) device.os = 'Linux';
    else if (/Android/.test(ua)) device.os = 'Android';
    else if (/iOS|iPhone|iPad/.test(ua)) device.os = 'iOS';

    // 检测浏览器
    if (/Chrome\/(\d+)/.test(ua)) {
      device.browser = 'Chrome';
      device.browserVersion = RegExp.$1;
    } else if (/Firefox\/(\d+)/.test(ua)) {
      device.browser = 'Firefox';
      device.browserVersion = RegExp.$1;
    } else if (/Safari\/(\d+)/.test(ua) && !/Chrome/.test(ua)) {
      device.browser = 'Safari';
      device.browserVersion = RegExp.$1;
    } else if (/Edge\/(\d+)/.test(ua)) {
      device.browser = 'Edge';
      device.browserVersion = RegExp.$1;
    }

    // 屏幕分辨率
    if (window.screen) {
      device.screenResolution = `${window.screen.width}x${window.screen.height}`;
    }

    // 视口大小
    device.viewportSize = `${window.innerWidth}x${window.innerHeight}`;

    // 设备类型
    if (/Mobile|Android|iPhone/.test(ua)) {
      device.deviceType = 'mobile';
    } else if (/iPad|Tablet/.test(ua)) {
      device.deviceType = 'tablet';
    } else {
      device.deviceType = 'desktop';
    }

    return device;
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
    if (config.errorSampleRate !== undefined && (config.errorSampleRate < 0 || config.errorSampleRate > 1)) {
      throw new Error('[Monitor] errorSampleRate must be between 0 and 1');
    }
    if (config.performanceSampleRate !== undefined && (config.performanceSampleRate < 0 || config.performanceSampleRate > 1)) {
      throw new Error('[Monitor] performanceSampleRate must be between 0 and 1');
    }
  }

  /** 设置用户信息 */
  setUser(user: UserInfo | null): void {
    this.user = user;
  }

  /** 获取用户信息 */
  getUser(): UserInfo | null {
    return this.user;
  }

  /** 设置自定义上下文 */
  setContext(context: CustomContext): void {
    this.context = { ...this.context, ...context };
  }

  /** 获取自定义上下文 */
  getContext(): CustomContext {
    return this.context;
  }

  /** 设置单个标签 */
  setTag(key: string, value: string): void {
    if (!this.context.tags) {
      this.context.tags = {};
    }
    this.context.tags[key] = value;
  }

  /** 设置额外数据 */
  setExtra(key: string, value: unknown): void {
    if (!this.context.extra) {
      this.context.extra = {};
    }
    this.context.extra[key] = value;
  }

  /** 检查 URL 是否应该被过滤 */
  private shouldFilterUrl(url: string): boolean {
    const { allowUrls, ignoreUrls } = this.config || {};

    // 如果设置了白名单，只允许匹配的 URL
    if (allowUrls && allowUrls.length > 0) {
      const allowed = allowUrls.some(pattern => {
        if (typeof pattern === 'string') {
          return url.includes(pattern);
        }
        return pattern.test(url);
      });
      if (!allowed) return true;
    }

    // 检查黑名单
    if (ignoreUrls && ignoreUrls.length > 0) {
      const ignored = ignoreUrls.some(pattern => {
        if (typeof pattern === 'string') {
          return url.includes(pattern);
        }
        return pattern.test(url);
      });
      if (ignored) return true;
    }

    return false;
  }

  /** 检查错误消息是否应该被忽略 */
  private shouldIgnoreError(message: string): boolean {
    const { ignoreErrors } = this.config || {};
    if (!ignoreErrors || ignoreErrors.length === 0) return false;

    return ignoreErrors.some(pattern => {
      if (typeof pattern === 'string') {
        return message.includes(pattern);
      }
      return pattern.test(message);
    });
  }

  /** 附加用户和上下文信息到事件 */
  private enrichEvent<T extends ErrorEvent | PerformanceData>(event: T): T {
    const enriched = { ...event };
    
    // 附加用户信息
    if (this.user) {
      enriched.user = { ...this.user };
    }

    // 附加上下文信息（包括设备信息）
    enriched.context = {
      ...this.context,
      device: this.deviceInfo || undefined
    };

    return enriched;
  }

  /** 处理错误事件 */
  private handleError(event: ErrorEvent): void {
    // URL 过滤
    if (event.url && this.shouldFilterUrl(event.url)) {
      return;
    }
    // 错误消息过滤
    if (event.message && this.shouldIgnoreError(event.message)) {
      return;
    }
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
    
    // URL 过滤（对所有事件类型）
    if ('url' in data && data.url && this.shouldFilterUrl(data.url)) {
      return;
    }
    
    // 判断事件类型并应用对应的采样率
    const isError = 'type' in data && (data as ErrorEvent).type !== undefined;
    const isPerformance = 'fp' in data || 'fcp' in data || 'lcp' in data;
    
    let sampleRate = this.config?.sampleRate ?? 1;
    
    if (isError && this.config?.errorSampleRate !== undefined) {
      sampleRate = this.config.errorSampleRate;
    } else if (isPerformance && this.config?.performanceSampleRate !== undefined) {
      sampleRate = this.config.performanceSampleRate;
    }
    
    // 采样率控制
    if (Math.random() > sampleRate) return;
    
    // 附加用户和上下文信息
    let enrichedData = this.enrichEvent(data as ErrorEvent | PerformanceData);
    
    // beforeSend 钩子
    if (this.config?.beforeSend) {
      const result = this.config.beforeSend(enrichedData);
      if (result === false || result === null) {
        return; // 不上报
      }
      if (typeof result === 'object') {
        enrichedData = result as ErrorEvent | PerformanceData;
      }
    }
    
    this.reporter.push(enrichedData);
  }

  /** 立即上报所有数据 */
  flush(): void {
    this.reporter?.flush();
  }

  /** 手动捕获错误 */
  captureError(error: Error): void {
    if (!this.errorCatcher) return;
    this.errorCatcher.captureError(error);
  }

  /** 手动捕获消息 */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    const fullMessage = `[${level}] ${message}`;
    
    // 错误消息过滤
    if (this.shouldIgnoreError(fullMessage)) {
      return;
    }
    
    const event: ErrorEvent = {
      type: 'error',
      message: fullMessage,
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
    this.user = null;
    this.context = {};
    this.deviceInfo = null;
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
