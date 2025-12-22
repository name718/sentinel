import type { ResourceError } from '../types';

export interface ResourceMonitorOptions {
  onError: (event: ResourceError) => void;
}

/** 资源加载监控器 */
export class ResourceMonitor {
  private options: ResourceMonitorOptions;
  private installed = false;

  constructor(options: ResourceMonitorOptions) {
    this.options = options;
  }

  /** 安装资源监听 */
  install(): void {
    if (this.installed || typeof window === 'undefined') return;
    
    // 使用捕获阶段监听，确保能捕获到资源加载错误
    window.addEventListener('error', this.handleError, true);
    this.installed = true;
  }

  /** 卸载资源监听 */
  uninstall(): void {
    if (!this.installed || typeof window === 'undefined') return;
    
    window.removeEventListener('error', this.handleError, true);
    this.installed = false;
  }

  /** 处理错误事件 */
  private handleError = (event: Event): void => {
    const target = event.target as HTMLElement;
    
    // 只处理资源加载错误，不处理 JS 运行时错误
    if (!target || target === window || !(target instanceof HTMLElement)) {
      return;
    }
    
    const tagName = target.tagName?.toLowerCase();
    const resourceType = this.getResourceType(tagName);
    
    if (!resourceType) return;
    
    const url = this.getResourceUrl(target);
    if (!url) return;
    
    const resourceError: ResourceError = {
      type: 'resource',
      resourceType,
      url,
      timestamp: Date.now(),
      pageUrl: window.location.href
    };
    
    this.options.onError(resourceError);
  };

  /** 获取资源类型 */
  private getResourceType(tagName: string): ResourceError['resourceType'] | null {
    switch (tagName) {
      case 'script':
        return 'script';
      case 'link':
        return 'link';
      case 'img':
        return 'img';
      case 'video':
      case 'audio':
      case 'source':
      case 'object':
      case 'embed':
        return 'other';
      default:
        return null;
    }
  }

  /** 获取资源 URL */
  private getResourceUrl(target: HTMLElement): string | null {
    if (target instanceof HTMLScriptElement) {
      return target.src;
    }
    if (target instanceof HTMLLinkElement) {
      return target.href;
    }
    if (target instanceof HTMLImageElement) {
      return target.src;
    }
    // 其他元素尝试获取 src 属性
    return target.getAttribute('src') || target.getAttribute('href') || null;
  }
}
