import type { ErrorEvent, Breadcrumb } from '../types';

export interface ErrorCatcherOptions {
  onError: (event: ErrorEvent) => void;
  getBreadcrumbs: () => Breadcrumb[];
}

/** 错误捕获器 */
export class ErrorCatcher {
  private options: ErrorCatcherOptions;
  private installed = false;
  private originalOnerror: OnErrorEventHandler | null = null;
  private originalOnunhandledrejection: ((event: PromiseRejectionEvent) => void) | null = null;

  constructor(options: ErrorCatcherOptions) {
    this.options = options;
  }

  /** 安装错误监听 */
  install(): void {
    if (this.installed || typeof window === 'undefined') return;
    
    this.setupErrorHandler();
    this.setupUnhandledRejectionHandler();
    this.installed = true;
  }

  /** 卸载错误监听 */
  uninstall(): void {
    if (!this.installed || typeof window === 'undefined') return;
    
    window.onerror = this.originalOnerror;
    window.onunhandledrejection = this.originalOnunhandledrejection;
    this.installed = false;
  }

  /** 设置 window.onerror 监听 */
  private setupErrorHandler(): void {
    this.originalOnerror = window.onerror;
    
    window.onerror = (message, filename, lineno, colno, error) => {
      const errorEvent = this.formatError({
        type: 'error',
        message: String(message),
        filename: filename || undefined,
        lineno: lineno || undefined,
        colno: colno || undefined,
        stack: error?.stack
      });
      
      this.options.onError(errorEvent);
      
      // 调用原有的 onerror
      if (this.originalOnerror) {
        return this.originalOnerror.call(window, message, filename, lineno, colno, error);
      }
      return false;
    };
  }

  /** 设置 unhandledrejection 监听 */
  private setupUnhandledRejectionHandler(): void {
    this.originalOnunhandledrejection = window.onunhandledrejection;
    
    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      let message = 'Unhandled Promise Rejection';
      let stack: string | undefined;
      
      if (reason instanceof Error) {
        message = reason.message;
        stack = reason.stack;
      } else if (typeof reason === 'string') {
        message = reason;
      } else if (reason) {
        message = JSON.stringify(reason);
      }
      
      const errorEvent = this.formatError({
        type: 'unhandledrejection',
        message,
        stack
      });
      
      this.options.onError(errorEvent);
      
      // 调用原有的 handler
      if (this.originalOnunhandledrejection) {
        this.originalOnunhandledrejection.call(window, event);
      }
    };
  }

  /** 格式化错误数据 */
  private formatError(params: {
    type: 'error' | 'unhandledrejection';
    message: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    stack?: string;
  }): ErrorEvent {
    return {
      type: params.type,
      message: params.message,
      filename: params.filename,
      lineno: params.lineno,
      colno: params.colno,
      stack: params.stack,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      breadcrumbs: this.options.getBreadcrumbs()
    };
  }

  /** 手动捕获错误 */
  captureError(error: Error): void {
    const errorEvent = this.formatError({
      type: 'error',
      message: error.message,
      stack: error.stack
    });
    this.options.onError(errorEvent);
  }
}
