/**
 * @file ResourceMonitor 资源加载监控模块
 * @description 监控页面静态资源（JS、CSS、图片等）的加载失败情况
 * 
 * ## 功能职责
 * - 捕获资源加载失败事件
 * - 识别资源类型（script/link/img）
 * - 记录失败资源的 URL 和时间
 * 
 * ## 核心原理
 * 
 * ### 事件捕获机制
 * 资源加载失败会触发 error 事件，但这个事件：
 * - 不会冒泡（不会传递到 window）
 * - 只能在捕获阶段监听
 * 
 * 因此使用捕获阶段监听：
 * ```javascript
 * window.addEventListener('error', handler, true); // 第三个参数 true 表示捕获阶段
 * ```
 * 
 * ### 区分错误类型
 * error 事件可能来自：
 * 1. JS 运行时错误 → target 是 window
 * 2. 资源加载失败 → target 是具体的 DOM 元素
 * 
 * 判断逻辑：
 * ```javascript
 * if (event.target === window) {
 *   // JS 运行时错误，由 ErrorCatcher 处理
 *   return;
 * }
 * if (event.target instanceof HTMLElement) {
 *   // 资源加载失败
 * }
 * ```
 * 
 * ### 资源类型识别
 * 根据触发事件的元素标签名判断：
 * - `<script>` → 'script'（JS 文件）
 * - `<link>` → 'link'（CSS 文件）
 * - `<img>` → 'img'（图片）
 * - 其他 → 'other'（video/audio 等）
 * 
 * ### 获取资源 URL
 * 不同元素的 URL 属性不同：
 * - script.src
 * - link.href
 * - img.src
 * 
 * ## 常见场景
 * - CDN 故障导致 JS/CSS 加载失败
 * - 图片服务器异常
 * - 网络问题导致资源超时
 * - 资源被删除或路径错误
 * 
 * ## 注意事项
 * - 跨域资源可能无法获取详细错误信息
 * - 某些浏览器对 error 事件的支持有差异
 * - 动态创建的元素也会被监控
 */

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
