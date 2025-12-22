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
