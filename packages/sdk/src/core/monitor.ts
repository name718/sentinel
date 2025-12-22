import type { MonitorConfig, Breadcrumb, ReportData } from '../types';

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
    this.validateConfig(config);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initialized = true;
    // TODO: 初始化各监控模块
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

  /** 上报数据（占位，后续实现） */
  report(data: ReportData): void {
    if (!this.initialized) return;
    // TODO: 调用 Reporter 上报
    console.log('[Monitor] report:', data);
  }

  /** 销毁实例（用于测试） */
  destroy(): void {
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
