/**
 * 服务端类型定义
 */

import type { Router } from 'express';

// 导出 Router 类型，解决类型推断问题
export type AppRouter = Router;

/** 错误事件 */
export interface ErrorEvent {
  type: string;
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  timestamp: number;
  url: string;
  breadcrumbs?: Breadcrumb[];
}

/** 面包屑（用户行为轨迹） */
export interface Breadcrumb {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
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

/** 长任务 */
export interface LongTask {
  name: string;
  duration: number;
  startTime: number;
}

/** 上报请求体 */
export interface ReportBody {
  dsn: string;
  events: (ErrorEvent | PerformanceData)[];
}

/** 数据库错误记录 */
export interface ErrorRecord {
  id: number;
  dsn: string;
  type: string;
  message: string;
  normalizedMessage: string | null;
  stack: string | null;
  filename: string | null;
  lineno: number | null;
  colno: number | null;
  url: string;
  breadcrumbs: Breadcrumb[];
  timestamp: number;
  firstSeen: number | null;
  fingerprint: string | null;
  count: number;
  createdAt: string;
}

/** 数据库性能记录 */
export interface PerformanceRecord {
  id: number;
  dsn: string;
  fp: number | null;
  fcp: number | null;
  lcp: number | null;
  ttfb: number | null;
  domReady: number | null;
  load: number | null;
  longTasks: LongTask[] | null;
  url: string;
  timestamp: number;
  createdAt: string;
}

/** SourceMap 记录 */
export interface SourceMapRecord {
  id: number;
  dsn: string;
  version: string;
  filename: string;
  content: string;
  createdAt: string;
}

/** 解析后的堆栈帧 */
export interface ParsedStackFrame {
  file: string;
  line: number;
  column: number;
  function?: string;
  originalFile?: string;
  originalLine?: number;
  originalColumn?: number;
  originalName?: string;
}

/** 错误分组 */
export interface ErrorGroup {
  fingerprint: string;
  type: string;
  message: string;
  normalizedMessage: string;
  totalCount: number;
  firstSeen: number;
  lastSeen: number;
  affectedUrls: number;
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  total: number;
  list: T[];
  page: number;
  pageSize: number;
}

/** API 错误响应 */
export interface ApiError {
  error: string;
}

/** API 成功响应 */
export interface ApiSuccess {
  success: true;
  [key: string]: unknown;
}
