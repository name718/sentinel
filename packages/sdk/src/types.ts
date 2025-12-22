/** SDK 初始化配置 */
export interface MonitorConfig {
  /** 项目标识 */
  dsn: string;
  /** 上报地址 */
  reportUrl: string;
  /** 采样率 0-1，默认 1（100% 采集） */
  sampleRate?: number;
  /** 错误采样率 0-1，默认使用 sampleRate */
  errorSampleRate?: number;
  /** 性能采样率 0-1，默认使用 sampleRate */
  performanceSampleRate?: number;
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
  /** 错误过滤白名单（只上报匹配的错误） */
  allowUrls?: (string | RegExp)[];
  /** 错误过滤黑名单（不上报匹配的错误） */
  ignoreUrls?: (string | RegExp)[];
  /** 忽略的错误消息（正则匹配） */
  ignoreErrors?: (string | RegExp)[];
  /** 上报前的钩子，返回 false 则不上报 */
  beforeSend?: (event: ErrorEvent | PerformanceData) => boolean | ErrorEvent | PerformanceData | null;
}

/** 用户信息 */
export interface UserInfo {
  /** 用户 ID */
  id?: string;
  /** 用户名 */
  username?: string;
  /** 邮箱 */
  email?: string;
  /** 其他自定义字段 */
  [key: string]: unknown;
}

/** 自定义上下文 */
export interface CustomContext {
  /** 应用版本 */
  version?: string;
  /** 运行环境 */
  environment?: string;
  /** 设备信息 */
  device?: DeviceInfo;
  /** 其他自定义标签 */
  tags?: Record<string, string>;
  /** 其他自定义数据 */
  extra?: Record<string, unknown>;
}

/** 设备信息 */
export interface DeviceInfo {
  /** 操作系统 */
  os?: string;
  /** 浏览器 */
  browser?: string;
  /** 浏览器版本 */
  browserVersion?: string;
  /** 屏幕分辨率 */
  screenResolution?: string;
  /** 视口大小 */
  viewportSize?: string;
  /** 设备类型 */
  deviceType?: 'desktop' | 'mobile' | 'tablet';
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
  /** 用户信息 */
  user?: UserInfo;
  /** 自定义上下文 */
  context?: CustomContext;
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
  /** 用户信息 */
  user?: UserInfo;
  /** 自定义上下文 */
  context?: CustomContext;
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
