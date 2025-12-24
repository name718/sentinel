/**
 * @file BehaviorTracker 用户行为追踪模块
 * @description 记录用户在页面上的操作轨迹，用于错误发生时还原用户行为
 * 
 * ## 功能职责
 * - 追踪用户点击事件
 * - 追踪路由变化（SPA 导航）
 * - 追踪 console 输出
 * - 追踪网络请求（XHR/Fetch）
 * 
 * ## 核心原理
 * 
 * ### 1. 点击事件追踪
 * 使用事件委托在 document 上监听：
 * ```javascript
 * document.addEventListener('click', handler, true);
 * ```
 * 记录：元素标签、ID、类名、时间戳
 * 
 * ### 2. 路由变化追踪
 * SPA 应用的路由变化有多种方式：
 * 
 * a) popstate 事件（浏览器前进/后退）
 * ```javascript
 * window.addEventListener('popstate', handler);
 * ```
 * 
 * b) hashchange 事件（hash 路由变化）
 * ```javascript
 * window.addEventListener('hashchange', handler);
 * ```
 * 
 * c) history.pushState/replaceState（编程式导航）
 * 需要拦截原生方法：
 * ```javascript
 * const original = history.pushState;
 * history.pushState = function(...args) {
 *   original.apply(this, args);
 *   // 记录路由变化
 * };
 * ```
 * 
 * ### 3. Console 追踪
 * 拦截 console 方法：
 * ```javascript
 * const original = console.log;
 * console.log = function(...args) {
 *   // 记录日志
 *   original.apply(console, args);
 * };
 * ```
 * 追踪 log/warn/error 三个级别
 * 
 * ### 4. XHR 追踪
 * 拦截 XMLHttpRequest 的 open 和 send 方法：
 * ```javascript
 * const originalOpen = XMLHttpRequest.prototype.open;
 * XMLHttpRequest.prototype.open = function(method, url) {
 *   this._monitorData = { method, url };
 *   originalOpen.apply(this, arguments);
 * };
 * ```
 * 记录：请求方法、URL、状态码、耗时
 * 
 * ### 5. Fetch 追踪
 * 拦截全局 fetch 函数：
 * ```javascript
 * const originalFetch = window.fetch;
 * window.fetch = async function(input, init) {
 *   const startTime = Date.now();
 *   const response = await originalFetch(input, init);
 *   // 记录请求信息
 *   return response;
 * };
 * ```
 * 
 * ## Breadcrumb 数据结构
 * ```typescript
 * {
 *   type: 'click' | 'route' | 'console' | 'xhr' | 'fetch',
 *   category: string,    // 分类（ui/navigation/http）
 *   message: string,     // 描述信息
 *   data: object,        // 附加数据
 *   timestamp: number    // 时间戳
 * }
 * ```
 * 
 * ## 使用场景
 * 当错误发生时，可以查看错误前的用户行为：
 * 1. 用户点击了哪些按钮
 * 2. 访问了哪些页面
 * 3. 发起了哪些请求
 * 4. 控制台输出了什么
 * 
 * 这些信息有助于复现和定位问题。
 */

import type { Breadcrumb, BreadcrumbType } from '../types';

export interface BehaviorTrackerOptions {
  onBreadcrumb: (crumb: Breadcrumb) => void;
}

/** 用户行为追踪器 */
export class BehaviorTracker {
  private options: BehaviorTrackerOptions;
  private installed = false;
  private originalConsole: Partial<Console> = {};
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;
  private originalFetch: typeof fetch | null = null;

  constructor(options: BehaviorTrackerOptions) {
    this.options = options;
  }

  /** 安装行为追踪 */
  install(): void {
    if (this.installed || typeof window === 'undefined') return;
    
    this.trackClick();
    this.trackRoute();
    this.trackConsole();
    this.trackXHR();
    this.trackFetch();
    this.installed = true;
  }

  /** 卸载行为追踪 */
  uninstall(): void {
    if (!this.installed || typeof window === 'undefined') return;
    
    // 恢复 console
    Object.keys(this.originalConsole).forEach((key) => {
      (console as Record<string, unknown>)[key] = this.originalConsole[key as keyof Console];
    });
    
    // 恢复 XHR
    if (this.originalXHROpen) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
    }
    if (this.originalXHRSend) {
      XMLHttpRequest.prototype.send = this.originalXHRSend;
    }
    
    // 恢复 fetch
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }
    
    this.installed = false;
  }

  /** 追踪点击事件 */
  private trackClick(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target) return;
      
      const selector = this.getElementSelector(target);
      this.addBreadcrumb('click', 'ui', `Click on ${selector}`, {
        tagName: target.tagName,
        id: target.id || undefined,
        className: target.className || undefined
      });
    }, true);
  }

  /** 追踪路由变化 */
  private trackRoute(): void {
    // 监听 popstate（浏览器前进后退）
    window.addEventListener('popstate', () => {
      this.addBreadcrumb('route', 'navigation', `Navigate to ${window.location.href}`, {
        url: window.location.href
      });
    });

    // 监听 hashchange
    window.addEventListener('hashchange', (event) => {
      this.addBreadcrumb('route', 'navigation', `Hash change to ${event.newURL}`, {
        oldURL: event.oldURL,
        newURL: event.newURL
      });
    });

    // 拦截 pushState 和 replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.addBreadcrumb('route', 'navigation', `Push state to ${window.location.href}`, {
        url: window.location.href
      });
    };
    
    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.addBreadcrumb('route', 'navigation', `Replace state to ${window.location.href}`, {
        url: window.location.href
      });
    };
  }

  /** 追踪 console 输出 */
  private trackConsole(): void {
    const levels: Array<'log' | 'warn' | 'error'> = ['log', 'warn', 'error'];
    
    levels.forEach((level) => {
      this.originalConsole[level] = console[level];
      
      console[level] = (...args: unknown[]) => {
        this.addBreadcrumb('console', level, args.map(String).join(' '), {
          level,
          arguments: args.map((arg) => {
            try {
              return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
            } catch {
              return String(arg);
            }
          })
        });
        
        // 调用原始方法
        (this.originalConsole[level] as (...args: unknown[]) => void)?.apply(console, args);
      };
    });
  }

  /** 追踪 XHR 请求 */
  private trackXHR(): void {
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
    
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: unknown[]) {
      (this as XMLHttpRequest & { _monitorData?: { method: string; url: string; startTime: number } })._monitorData = {
        method,
        url: String(url),
        startTime: 0
      };
      return self.originalXHROpen!.apply(this, [method, url, ...args] as Parameters<typeof XMLHttpRequest.prototype.open>);
    };
    
    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
      const xhr = this as XMLHttpRequest & { _monitorData?: { method: string; url: string; startTime: number } };
      if (xhr._monitorData) {
        xhr._monitorData.startTime = Date.now();
      }
      
      xhr.addEventListener('loadend', () => {
        if (xhr._monitorData) {
          const duration = Date.now() - xhr._monitorData.startTime;
          self.addBreadcrumb('xhr', 'http', `${xhr._monitorData.method} ${xhr._monitorData.url}`, {
            method: xhr._monitorData.method,
            url: xhr._monitorData.url,
            status: xhr.status,
            duration
          });
        }
      });
      
      return self.originalXHRSend!.apply(this, [body]);
    };
  }

  /** 追踪 Fetch 请求 */
  private trackFetch(): void {
    this.originalFetch = window.fetch;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const startTime = Date.now();
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = init?.method || 'GET';
      
      try {
        const response = await self.originalFetch!.apply(window, [input, init]);
        const duration = Date.now() - startTime;
        
        self.addBreadcrumb('fetch', 'http', `${method} ${url}`, {
          method,
          url,
          status: response.status,
          duration
        });
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        self.addBreadcrumb('fetch', 'http', `${method} ${url} (failed)`, {
          method,
          url,
          status: 0,
          duration,
          error: String(error)
        });
        
        throw error;
      }
    };
  }

  /** 添加 breadcrumb */
  private addBreadcrumb(type: BreadcrumbType, category: string, message: string, data?: Record<string, unknown>): void {
    this.options.onBreadcrumb({
      type,
      category,
      message,
      data,
      timestamp: Date.now()
    });
  }

  /** 获取元素选择器 */
  private getElementSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }
    
    let selector = element.tagName.toLowerCase();
    
    if (element.className) {
      const classes = element.className.split(' ').filter(Boolean).slice(0, 2);
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }
    
    return selector;
  }
}
