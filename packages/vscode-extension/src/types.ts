/**
 * 类型定义
 */

export interface MonitorError {
  id: number;
  dsn: string;
  type: string;
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  url: string;
  timestamp: number;
  count: number;
  fingerprint?: string;
  parsedStack?: ParsedStackFrame[];
}

export interface ParsedStackFrame {
  file: string;
  line: number;
  column: number;
  originalFile?: string;
  originalLine?: number;
  originalColumn?: number;
  originalName?: string;
}

export interface ErrorGroup {
  fingerprint: string;
  type: string;
  message: string;
  totalCount: number;
  firstSeen: number;
  lastSeen: number;
  affectedUrls: number;
}

export interface MonitorStats {
  totalErrors: number;
  errorGroups: number;
  affectedPages: number;
}

export interface MonitorConfig {
  serverUrl: string;
  dsn: string;
  autoRefresh: boolean;
  refreshInterval: number;
  pathMapping: Record<string, string>;
  showInlineDecorations: boolean;
}
