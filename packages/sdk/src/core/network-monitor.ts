/**
 * @file NetworkMonitor 网络质量监控模块
 * @description 被动监听网络状态变化和请求质量
 * 
 * ## 功能
 * - 网络类型检测（WiFi/4G/3G/离线）
 * - 网络变化监听（在线/离线切换、网络降级）
 * - 请求耗时分布（慢请求自动标记）
 * - 请求失败率统计
 * - 带宽估算
 */

import type { Breadcrumb } from '../types';

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

/** 配置选项 */
export interface NetworkMonitorConfig {
  /** 慢请求阈值 (ms)，默认 3000 */
  slowThreshold?: number;
  /** 网络变化回调 */
  onNetworkChange?: (event: NetworkChangeEvent) => void;
  /** 网络质量数据回调（定期上报） */
  onNetworkQuality?: (data: NetworkQualityData) => void;
  /** 添加 breadcrumb 回调 */
  onBreadcrumb?: (crumb: Breadcrumb) => void;
  /** 上报间隔 (ms)，默认 60000 */
  reportInterval?: number;
  /** 带宽采样数量，默认 5 */
  bandwidthSampleSize?: number;
}

/** Navigator Connection API 类型 */
interface NetworkInformation extends EventTarget {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  onchange?: () => void;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

/** 网络质量监控类 */
export class NetworkMonitor {
  private config: Required<Omit<NetworkMonitorConfig, 'onNetworkChange' | 'onNetworkQuality' | 'onBreadcrumb'>> & NetworkMonitorConfig;
  private installed = false;
  private currentNetworkInfo: NetworkInfo;
  private requestStats: RequestStats;
  private bandwidthSamples: number[] = [];
  private networkChanges: NetworkChangeEvent[] = [];
  private reportTimer: number | null = null;
  
  // 原始方法引用
  private originalFetch: typeof fetch | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;

  constructor(config: NetworkMonitorConfig = {}) {
    this.config = {
      slowThreshold: 3000,
      reportInterval: 60000,
      bandwidthSampleSize: 5,
      ...config
    };
    
    this.currentNetworkInfo = this.detectNetworkInfo();
    this.requestStats = this.createEmptyStats();
  }

  /** 创建空的统计对象 */
  private createEmptyStats(): RequestStats {
    return {
      total: 0,
      success: 0,
      failed: 0,
      slow: 0,
      avgDuration: 0,
      maxDuration: 0,
      failureRate: 0,
      slowRate: 0
    };
  }

  /** 检测当前网络信息 */
  private detectNetworkInfo(): NetworkInfo {
    if (typeof navigator === 'undefined') {
      return { type: 'unknown', online: true };
    }

    const online = navigator.onLine;
    if (!online) {
      return { type: 'offline', online: false };
    }

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (!connection) {
      return { type: 'unknown', online: true };
    }

    return {
      type: this.mapConnectionType(connection.type, connection.effectiveType),
      online: true,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }

  /** 映射网络类型 */
  private mapConnectionType(type?: string, effectiveType?: string): NetworkType {
    // 优先使用 effectiveType（更准确反映实际网速）
    if (effectiveType) {
      switch (effectiveType) {
        case '4g': return '4g';
        case '3g': return '3g';
        case '2g': return '2g';
        case 'slow-2g': return 'slow-2g';
      }
    }

    // 使用物理连接类型
    if (type) {
      switch (type) {
        case 'wifi': return 'wifi';
        case 'ethernet': return 'ethernet';
        case 'cellular': return effectiveType as NetworkType || '4g';
        case 'none': return 'offline';
      }
    }

    return 'unknown';
  }

  /** 安装监控 */
  install(): void {
    if (this.installed || typeof window === 'undefined') return;
    
    this.installed = true;
    
    // 监听在线/离线状态
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // 监听网络类型变化
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', this.handleConnectionChange);
    }
    
    // 拦截 fetch
    this.interceptFetch();
    
    // 拦截 XMLHttpRequest
    this.interceptXHR();
    
    // 启动定期上报
    this.startReportTimer();
    
    console.log('[NetworkMonitor] Installed, current network:', this.currentNetworkInfo);
  }

  /** 卸载监控 */
  uninstall(): void {
    if (!this.installed) return;
    
    this.installed = false;
    
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.removeEventListener('change', this.handleConnectionChange);
    }
    
    // 恢复原始方法
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }
    if (this.originalXHROpen && this.originalXHRSend) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
      XMLHttpRequest.prototype.send = this.originalXHRSend;
    }
    
    // 停止定期上报
    this.stopReportTimer();
  }

  /** 处理上线事件 */
  private handleOnline = (): void => {
    const previous = { ...this.currentNetworkInfo };
    this.currentNetworkInfo = this.detectNetworkInfo();
    
    this.emitNetworkChange({
      changeType: 'online',
      previous,
      current: this.currentNetworkInfo,
      timestamp: Date.now()
    });
  };

  /** 处理离线事件 */
  private handleOffline = (): void => {
    const previous = { ...this.currentNetworkInfo };
    this.currentNetworkInfo = { type: 'offline', online: false };
    
    this.emitNetworkChange({
      changeType: 'offline',
      previous,
      current: this.currentNetworkInfo,
      timestamp: Date.now()
    });
  };

  /** 处理网络类型变化 */
  private handleConnectionChange = (): void => {
    const previous = { ...this.currentNetworkInfo };
    this.currentNetworkInfo = this.detectNetworkInfo();
    
    // 判断变化类型
    let changeType: NetworkChangeEvent['changeType'] = 'type-change';
    if (previous.type !== this.currentNetworkInfo.type) {
      changeType = 'type-change';
    } else if (previous.effectiveType !== this.currentNetworkInfo.effectiveType ||
               previous.downlink !== this.currentNetworkInfo.downlink) {
      changeType = 'quality-change';
    }
    
    this.emitNetworkChange({
      changeType,
      previous,
      current: this.currentNetworkInfo,
      timestamp: Date.now()
    });
  };

  /** 发送网络变化事件 */
  private emitNetworkChange(event: NetworkChangeEvent): void {
    // 保存到历史记录（最多保留 10 条）
    this.networkChanges.push(event);
    if (this.networkChanges.length > 10) {
      this.networkChanges.shift();
    }
    
    // 添加 breadcrumb
    if (this.config.onBreadcrumb) {
      this.config.onBreadcrumb({
        type: 'fetch',
        category: 'network',
        message: `Network ${event.changeType}: ${event.previous.type} → ${event.current.type}`,
        data: {
          changeType: event.changeType,
          previousType: event.previous.type,
          currentType: event.current.type,
          online: event.current.online
        },
        timestamp: event.timestamp
      });
    }
    
    // 触发回调
    if (this.config.onNetworkChange) {
      this.config.onNetworkChange(event);
    }
  }

  /** 拦截 fetch */
  private interceptFetch(): void {
    if (typeof fetch === 'undefined') return;
    
    this.originalFetch = window.fetch;
    
    // 使用箭头函数绑定 this
    const recordRequest = this.recordRequest.bind(this);
    const getResponseSize = this.getResponseSize.bind(this);
    const originalFetch = this.originalFetch;
    
    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const startTime = Date.now();
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      try {
        const response = await originalFetch.call(window, input, init);
        const duration = Date.now() - startTime;
        
        recordRequest({
          url,
          duration,
          success: response.ok,
          status: response.status,
          size: getResponseSize(response)
        });
        
        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        recordRequest({
          url,
          duration,
          success: false,
          status: 0
        });
        
        throw error;
      }
    };
  }

  /** 拦截 XMLHttpRequest */
  private interceptXHR(): void {
    if (typeof XMLHttpRequest === 'undefined') return;
    
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
    
    // 使用绑定方法避免 this 别名
    const recordRequest = this.recordRequest.bind(this);
    const getXHRResponseSize = this.getXHRResponseSize.bind(this);
    const originalXHROpen = this.originalXHROpen;
    const originalXHRSend = this.originalXHRSend;
    
    XMLHttpRequest.prototype.open = function(
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null
    ): void {
      (this as XMLHttpRequest & { _monitorUrl?: string })._monitorUrl = url.toString();
      return originalXHROpen.call(this, method, url, async, username, password);
    };
    
    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null): void {
      const xhr = this as XMLHttpRequest & { _monitorUrl?: string; _monitorStartTime?: number };
      xhr._monitorStartTime = Date.now();
      
      const handleComplete = () => {
        const duration = Date.now() - (xhr._monitorStartTime || Date.now());
        const success = xhr.status >= 200 && xhr.status < 400;
        
        recordRequest({
          url: xhr._monitorUrl || '',
          duration,
          success,
          status: xhr.status,
          size: getXHRResponseSize(xhr)
        });
      };
      
      this.addEventListener('load', handleComplete);
      this.addEventListener('error', handleComplete);
      this.addEventListener('abort', handleComplete);
      this.addEventListener('timeout', handleComplete);
      
      return originalXHRSend.call(this, body);
    };
  }

  /** 获取 fetch 响应大小 */
  private getResponseSize(response: Response): number | undefined {
    const contentLength = response.headers.get('content-length');
    return contentLength ? parseInt(contentLength, 10) : undefined;
  }

  /** 获取 XHR 响应大小 */
  private getXHRResponseSize(xhr: XMLHttpRequest): number | undefined {
    const contentLength = xhr.getResponseHeader('content-length');
    return contentLength ? parseInt(contentLength, 10) : undefined;
  }

  /** 记录请求 */
  private recordRequest(info: {
    url: string;
    duration: number;
    success: boolean;
    status: number;
    size?: number;
  }): void {
    const { duration, success, size } = info;
    const isSlow = duration > this.config.slowThreshold;
    
    // 更新统计
    this.requestStats.total++;
    if (success) {
      this.requestStats.success++;
    } else {
      this.requestStats.failed++;
    }
    if (isSlow) {
      this.requestStats.slow++;
    }
    
    // 更新平均耗时
    const prevTotal = this.requestStats.total - 1;
    this.requestStats.avgDuration = prevTotal > 0
      ? (this.requestStats.avgDuration * prevTotal + duration) / this.requestStats.total
      : duration;
    
    // 更新最大耗时
    if (duration > this.requestStats.maxDuration) {
      this.requestStats.maxDuration = duration;
    }
    
    // 更新失败率和慢请求率
    this.requestStats.failureRate = this.requestStats.failed / this.requestStats.total;
    this.requestStats.slowRate = this.requestStats.slow / this.requestStats.total;
    
    // 带宽估算（基于有大小信息的成功请求）
    if (success && size && size > 1024 && duration > 0) {
      // 带宽 = 大小(bytes) / 时间(s) * 8 / 1000 = Kbps
      const bandwidth = (size / (duration / 1000)) * 8 / 1000;
      this.bandwidthSamples.push(bandwidth);
      
      // 保持样本数量
      if (this.bandwidthSamples.length > this.config.bandwidthSampleSize) {
        this.bandwidthSamples.shift();
      }
    }
    
    // 慢请求添加 breadcrumb
    if (isSlow && this.config.onBreadcrumb) {
      this.config.onBreadcrumb({
        type: 'fetch',
        category: 'slow-request',
        message: `Slow request: ${info.url} (${duration}ms)`,
        data: {
          url: info.url,
          duration,
          status: info.status
        },
        timestamp: Date.now()
      });
    }
  }

  /** 启动定期上报 */
  private startReportTimer(): void {
    if (this.reportTimer) return;
    
    this.reportTimer = window.setInterval(() => {
      this.reportNetworkQuality();
    }, this.config.reportInterval);
  }

  /** 停止定期上报 */
  private stopReportTimer(): void {
    if (this.reportTimer) {
      clearInterval(this.reportTimer);
      this.reportTimer = null;
    }
  }

  /** 上报网络质量数据 */
  private reportNetworkQuality(): void {
    if (!this.config.onNetworkQuality) return;
    
    const data: NetworkQualityData = {
      networkInfo: { ...this.currentNetworkInfo },
      requestStats: { ...this.requestStats },
      bandwidthEstimate: this.getBandwidthEstimate(),
      recentChanges: [...this.networkChanges],
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: Date.now()
    };
    
    this.config.onNetworkQuality(data);
    
    // 重置统计（保留带宽样本）
    this.requestStats = this.createEmptyStats();
    this.networkChanges = [];
  }

  /** 获取带宽估算 */
  getBandwidthEstimate(): BandwidthEstimate | undefined {
    if (this.bandwidthSamples.length === 0) return undefined;
    
    // 使用中位数作为估算值（更稳定）
    const sorted = [...this.bandwidthSamples].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const bandwidth = sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
    
    return {
      bandwidth: Math.round(bandwidth),
      sampleCount: this.bandwidthSamples.length,
      timestamp: Date.now()
    };
  }

  /** 获取当前网络信息 */
  getNetworkInfo(): NetworkInfo {
    return { ...this.currentNetworkInfo };
  }

  /** 获取请求统计 */
  getRequestStats(): RequestStats {
    return { ...this.requestStats };
  }

  /** 获取网络变化历史 */
  getNetworkChanges(): NetworkChangeEvent[] {
    return [...this.networkChanges];
  }

  /** 手动触发网络质量上报 */
  flush(): void {
    this.reportNetworkQuality();
  }
}
