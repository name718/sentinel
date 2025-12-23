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
  /** 启用网络质量监控，默认 true */
  enableNetworkMonitor?: boolean;
  /** 网络监控配置 */
  networkMonitor?: NetworkMonitorConfig;
  /** 启用会话录制，默认 false */
  enableSessionReplay?: boolean;
  /** 会话录制配置 */
  sessionReplay?: SessionReplayConfig;
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

/** 网络监控配置 */
export interface NetworkMonitorConfig {
  /** 慢请求阈值 (ms)，默认 3000 */
  slowThreshold?: number;
  /** 上报间隔 (ms)，默认 60000 */
  reportInterval?: number;
  /** 带宽采样数量，默认 5 */
  bandwidthSampleSize?: number;
}

/** 会话录制配置 */
export interface SessionReplayConfig {
  /** 最大录制时长（秒），默认 30 */
  maxDuration?: number;
  /** 是否屏蔽所有输入，默认 true */
  maskAllInputs?: boolean;
  /** 是否屏蔽文本内容，默认 false */
  maskTextContent?: boolean;
  /** 鼠标移动采样间隔（ms），默认 50 */
  mousemoveSampleInterval?: number;
  /** 滚动采样间隔（ms），默认 100 */
  scrollSampleInterval?: number;
  /** 错误发生时保留的录制时长（秒），默认 10 */
  errorReplayDuration?: number;
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
  /** 会话录制数据 */
  sessionReplay?: SessionReplayData;
}

/** 会话录制数据 */
export interface SessionReplayData {
  /** 会话 ID */
  sessionId: string;
  /** 录制事件（rrweb 格式） */
  events: unknown[];
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
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
  attribution?: string;
}

/** 资源加载数据 */
export interface ResourceTiming {
  name: string;
  type: string;
  startTime: number;
  duration: number;
  size: number;
  protocol?: string;
  cached?: boolean;
}

/** Core Web Vitals 评分 */
export interface WebVitalsScore {
  fcp: 'good' | 'needs-improvement' | 'poor' | null;
  lcp: 'good' | 'needs-improvement' | 'poor' | null;
  fid: 'good' | 'needs-improvement' | 'poor' | null;
  cls: 'good' | 'needs-improvement' | 'poor' | null;
  ttfb: 'good' | 'needs-improvement' | 'poor' | null;
}

/** 性能数据 */
export interface PerformanceData {
  fp?: number;
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  domReady?: number;
  load?: number;
  longTasks?: LongTask[];
  resources?: ResourceTiming[];
  webVitalsScore?: WebVitalsScore;
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

/** 网络类型 */
export type NetworkType = 'wifi' | '4g' | '3g' | '2g' | 'slow-2g' | 'ethernet' | 'unknown' | 'offline';

/** 网络信息 */
export interface NetworkInfo {
  /** 网络类型 */
  type: NetworkType;
  /** 是否在线 */
  online: boolean;
  /** 有效类型（effectiveType） */
  effectiveType?: string;
  /** 下行带宽估算 (Mbps) */
  downlink?: number;
  /** 往返时延估算 (ms) */
  rtt?: number;
  /** 是否开启数据节省模式 */
  saveData?: boolean;
}

/** 请求统计 */
export interface RequestStats {
  /** 总请求数 */
  total: number;
  /** 成功数 */
  success: number;
  /** 失败数 */
  failed: number;
  /** 慢请求数（> 阈值） */
  slow: number;
  /** 平均耗时 (ms) */
  avgDuration: number;
  /** 最大耗时 (ms) */
  maxDuration: number;
  /** 失败率 */
  failureRate: number;
  /** 慢请求率 */
  slowRate: number;
}

/** 带宽估算结果 */
export interface BandwidthEstimate {
  /** 估算带宽 (Kbps) */
  bandwidth: number;
  /** 样本数量 */
  sampleCount: number;
  /** 估算时间 */
  timestamp: number;
}

/** 网络变化事件 */
export interface NetworkChangeEvent {
  /** 变化类型 */
  changeType: 'online' | 'offline' | 'type-change' | 'quality-change';
  /** 之前的网络信息 */
  previous: NetworkInfo;
  /** 当前的网络信息 */
  current: NetworkInfo;
  /** 时间戳 */
  timestamp: number;
}

/** 网络质量数据（用于上报） */
export interface NetworkQualityData {
  /** 当前网络信息 */
  networkInfo: NetworkInfo;
  /** 请求统计 */
  requestStats: RequestStats;
  /** 带宽估算 */
  bandwidthEstimate?: BandwidthEstimate;
  /** 网络变化历史 */
  recentChanges: NetworkChangeEvent[];
  /** 页面 URL */
  url: string;
  /** 时间戳 */
  timestamp: number;
}
