/**
 * @file ErrorCatcher 错误捕获模块
 * @description 自动捕获页面中的 JavaScript 运行时错误和未处理的 Promise 异常
 * 
 * ## 功能职责
 * - 捕获 JS 运行时错误（语法错误、引用错误等）
 * - 捕获未处理的 Promise rejection
 * - 格式化错误信息（类型、消息、堆栈、位置）
 * - 关联用户行为 Breadcrumbs
 * 
 * ## 核心原理
 * 
 * ### 1. window.onerror
 * 全局错误处理器，捕获同步 JS 错误：
 * ```javascript
 * window.onerror = function(message, source, lineno, colno, error) {
 *   // message: 错误消息
 *   // source: 发生错误的脚本 URL
 *   // lineno: 行号
 *   // colno: 列号
 *   // error: Error 对象（包含堆栈）
 * }
 * ```
 * 
 * 注意事项：
 * - 跨域脚本错误只能获取 "Script error." 消息
 * - 需要在脚本标签添加 crossorigin 属性并配置 CORS
 * - 返回 true 可以阻止浏览器默认的错误处理
 * 
 * ### 2. window.onunhandledrejection
 * 捕获未处理的 Promise rejection：
 * ```javascript
 * window.onunhandledrejection = function(event) {
 *   // event.reason: rejection 的原因（可能是 Error 或其他值）
 *   // event.promise: 被 reject 的 Promise
 * }
 * ```
 * 
 * 常见场景：
 * - Promise.reject() 没有 catch
 * - async 函数中抛出错误没有 try-catch
 * - then() 回调中抛出错误没有后续 catch
 * 
 * ### 3. 错误数据结构
 * ```typescript
 * {
 *   type: 'error' | 'unhandledrejection',
 *   message: string,      // 错误消息
 *   stack: string,        // 堆栈信息
 *   filename: string,     // 文件名
 *   lineno: number,       // 行号
 *   colno: number,        // 列号
 *   timestamp: number,    // 时间戳
 *   url: string,          // 页面 URL
 *   breadcrumbs: []       // 用户行为轨迹
 * }
 * ```
 * 
 * ## 使用注意
 * - 安装后会覆盖原有的 onerror/onunhandledrejection
 * - 会保存并调用原有的处理器，不影响其他库
 * - 卸载时会恢复原有处理器
 */

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
