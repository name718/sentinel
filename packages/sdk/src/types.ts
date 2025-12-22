/** SDK 初始化配置 */
export interface MonitorConfig {
  /** 项目标识 */
  dsn: string;
  /** 上报地址 */
  reportUrl: string;
  /** 采样率 0-1，默认 1 */
  sampleRate?: number;
  /** 最大 breadcrumb 数量，默认 20 */
  maxBreadcrumbs?: number;
  /** 启用错误监控，默认 true */
  enableError?: boolean;
  /** 启用性能监控，默认 true */
  enablePerformance?: boolean;
  /** 启用行为追踪，默认 true */
  enableBehavior?: boolean;
  /** 批量上报阈值，默认 10 */
  batchSize?: number;
  /** 上报间隔(ms)，默认 5000 */
  reportInterval?: number;
}

/** 错误事件类型 */
export type ErrorType = 'error' | 'unhandledrejection' | 'resource';

/** 错误事件数据 */
export interface ErrorEvent {
  type: ErrorType;
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  timestamp: number;
  url: string;
  breadcrumbs: Breadcrumb[];
}

/** 行为面包屑类型 */
export type BreadcrumbType = 'click' | 'route' | 'console' | 'xhr' | 'fetch';

/** 行为面包屑 */
export interface Breadcrumb {
  type: BreadcrumbType;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

/** 长任务数据 */
export interface LongTask {
  startTime: number;
  duration: number;
}

/** 性能数据 */
export interface PerformanceData {
  fp?: number;
  fcp?: number;
  lcp?: number;
  ttfb?: number;
  domReady?: number;
  load?: number;
  longTasks?: LongTask[];
  url: string;
  timestamp: number;
}

/** 上报数据类型 */
export type ReportData = ErrorEvent | PerformanceData;

/** 资源错误数据 */
export interface ResourceError {
  type: 'resource';
  resourceType: 'script' | 'link' | 'img' | 'other';
  url: string;
  timestamp: number;
  pageUrl: string;
}
