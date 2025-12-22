export { Monitor, init, captureError, captureMessage } from './core/monitor';
export { Reporter } from './core/reporter';
export { ErrorCatcher } from './core/error-catcher';
export { ResourceMonitor } from './core/resource-monitor';
export { BehaviorTracker } from './core/behavior-tracker';
export { PerformanceMonitor } from './core/performance-monitor';

export type {
  MonitorConfig,
  ErrorEvent,
  Breadcrumb,
  BreadcrumbType,
  PerformanceData,
  ReportData,
  ResourceError,
  LongTask
} from './types';
