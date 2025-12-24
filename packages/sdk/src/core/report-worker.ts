/**
 * @file Report Worker - Web Worker 数据上报
 * @description 在 Worker 线程中处理数据压缩和上报，避免阻塞主线程
 * 
 * ## 功能
 * - 数据队列管理
 * - 数据压缩（去重、精简）
 * - 批量上报
 * - 离线缓存
 * - 重试机制
 */

// Worker 消息类型
export type WorkerMessage = 
  | { type: 'init'; config: WorkerConfig }
  | { type: 'push'; data: any }
  | { type: 'flush' }
  | { type: 'destroy' };

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'sent'; count: number }
  | { type: 'error'; message: string }
  | { type: 'offline'; count: number };

export interface WorkerConfig {
  reportUrl: string;
  dsn: string;
  batchSize: number;
  reportInterval: number;
  enableCompression: boolean;
  maxQueueSize: number;
}

// Worker 内部代码（会被转成字符串）
const workerCode = `
let config = null;
let queue = [];
let timer = null;
let lastReportTime = 0;
const MIN_INTERVAL = 1000;
const STORAGE_KEY = 'monitor_worker_queue';

// 初始化
function init(cfg) {
  config = cfg;
  startTimer();
  // 尝试发送之前缓存的数据
  retryOfflineData();
}

// 添加数据
function push(data) {
  // 数据精简
  const compressed = compressData(data);
  queue.push(compressed);
  
  // 限制队列大小
  if (queue.length > config.maxQueueSize) {
    queue = queue.slice(-config.maxQueueSize);
  }
  
  // 达到批量阈值时立即上报
  if (queue.length >= config.batchSize) {
    flush();
  }
}

// 数据压缩/精简
function compressData(data) {
  const compressed = { ...data };
  
  // 精简 resources 数据（只保留关键字段）
  if (compressed.resources && Array.isArray(compressed.resources)) {
    compressed.resources = compressed.resources.slice(0, 50).map(r => ({
      name: truncateUrl(r.name),
      type: r.type,
      duration: Math.round(r.duration),
      size: r.size,
      cached: r.cached
    }));
  }
  
  // 精简 longTasks
  if (compressed.longTasks && Array.isArray(compressed.longTasks)) {
    compressed.longTasks = compressed.longTasks.slice(0, 20);
  }
  
  // 精简 breadcrumbs
  if (compressed.breadcrumbs && Array.isArray(compressed.breadcrumbs)) {
    compressed.breadcrumbs = compressed.breadcrumbs.slice(-20);
  }
  
  // 精简 sessionReplay events
  if (compressed.sessionReplay && compressed.sessionReplay.events) {
    // 只保留最近 500 个事件
    compressed.sessionReplay.events = compressed.sessionReplay.events.slice(-500);
  }
  
  // 截断过长的错误消息
  if (compressed.message && compressed.message.length > 1000) {
    compressed.message = compressed.message.substring(0, 1000) + '...';
  }
  
  // 截断过长的堆栈
  if (compressed.stack && compressed.stack.length > 5000) {
    compressed.stack = compressed.stack.substring(0, 5000) + '...';
  }
  
  return compressed;
}

// 截断 URL
function truncateUrl(url) {
  if (!url || url.length <= 200) return url;
  return url.substring(0, 200) + '...';
}

// 立即上报
function flush() {
  if (queue.length === 0) return;
  
  const now = Date.now();
  if (now - lastReportTime < MIN_INTERVAL) {
    return;
  }
  
  const data = queue.slice();
  queue = [];
  lastReportTime = now;
  
  send(data);
}

// 发送数据
async function send(data) {
  const payload = {
    dsn: config.dsn,
    events: data
  };

  try {
    const response = await fetch(config.reportUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }
    
    self.postMessage({ type: 'sent', count: data.length });
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
    saveOfflineData(data);
  }
}

// 启动定时器
function startTimer() {
  if (timer) clearInterval(timer);
  timer = setInterval(() => flush(), config.reportInterval);
}

// 停止定时器
function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

// 保存离线数据
function saveOfflineData(data) {
  try {
    // Worker 中无法直接访问 localStorage，发消息给主线程
    self.postMessage({ type: 'offline', count: data.length, data: data });
  } catch (e) {
    // ignore
  }
}

// 重试离线数据
function retryOfflineData() {
  // 由主线程处理
}

// 销毁
function destroy() {
  stopTimer();
  if (queue.length > 0) {
    // 尝试发送剩余数据
    send(queue);
    queue = [];
  }
}

// 消息处理
self.onmessage = function(e) {
  const msg = e.data;
  
  switch (msg.type) {
    case 'init':
      init(msg.config);
      self.postMessage({ type: 'ready' });
      break;
    case 'push':
      push(msg.data);
      break;
    case 'flush':
      flush();
      break;
    case 'destroy':
      destroy();
      break;
  }
};
`;

/** 创建 Worker Blob URL */
function createWorkerBlob(): string {
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

/** Worker Reporter - 使用 Web Worker 进行数据上报 */
export class WorkerReporter {
  private worker: Worker | null = null;
  private config: WorkerConfig;
  private fallbackQueue: any[] = [];
  private isWorkerReady = false;
  private offlineData: any[] = [];

  constructor(config: Omit<WorkerConfig, 'enableCompression' | 'maxQueueSize'> & Partial<Pick<WorkerConfig, 'enableCompression' | 'maxQueueSize'>>) {
    this.config = {
      ...config,
      enableCompression: config.enableCompression ?? true,
      maxQueueSize: config.maxQueueSize ?? 100
    };
    
    this.initWorker();
    this.setupBeforeUnload();
    this.loadOfflineData();
  }

  /** 初始化 Worker */
  private initWorker(): void {
    if (typeof Worker === 'undefined') {
      console.warn('[WorkerReporter] Web Worker not supported, using fallback');
      return;
    }

    try {
      const workerUrl = createWorkerBlob();
      this.worker = new Worker(workerUrl);
      
      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        this.handleWorkerMessage(e.data);
      };
      
      this.worker.onerror = (e) => {
        console.error('[WorkerReporter] Worker error:', e);
        this.fallbackToMainThread();
      };
      
      // 初始化 Worker
      this.worker.postMessage({ type: 'init', config: this.config });
      
      // 清理 Blob URL
      URL.revokeObjectURL(workerUrl);
    } catch (e) {
      console.warn('[WorkerReporter] Failed to create worker:', e);
      this.fallbackToMainThread();
    }
  }

  /** 处理 Worker 消息 */
  private handleWorkerMessage(msg: WorkerResponse): void {
    switch (msg.type) {
      case 'ready':
        this.isWorkerReady = true;
        // 发送等待中的数据
        this.fallbackQueue.forEach(data => {
          this.worker?.postMessage({ type: 'push', data });
        });
        this.fallbackQueue = [];
        // 发送离线数据
        if (this.offlineData.length > 0) {
          this.offlineData.forEach(data => {
            this.worker?.postMessage({ type: 'push', data });
          });
          this.offlineData = [];
          this.clearOfflineData();
        }
        break;
      case 'sent':
        // 数据发送成功
        break;
      case 'error':
        console.warn('[WorkerReporter] Send error:', msg.message);
        break;
      case 'offline':
        // Worker 请求保存离线数据
        this.saveOfflineData((msg as any).data || []);
        break;
    }
  }

  /** 降级到主线程处理 */
  private fallbackToMainThread(): void {
    this.worker = null;
    this.isWorkerReady = false;
  }

  /** 添加数据 */
  push(data: any): void {
    if (this.worker && this.isWorkerReady) {
      this.worker.postMessage({ type: 'push', data });
    } else if (this.worker) {
      // Worker 还没准备好，先缓存
      this.fallbackQueue.push(data);
    } else {
      // 降级：主线程直接发送
      this.sendDirect([data]);
    }
  }

  /** 立即上报 */
  flush(): void {
    if (this.worker && this.isWorkerReady) {
      this.worker.postMessage({ type: 'flush' });
    } else if (this.fallbackQueue.length > 0) {
      this.sendDirect(this.fallbackQueue);
      this.fallbackQueue = [];
    }
  }

  /** 主线程直接发送（降级方案） */
  private async sendDirect(data: any[]): Promise<void> {
    if (data.length === 0) return;
    
    try {
      await fetch(this.config.reportUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dsn: this.config.dsn,
          events: data
        })
      });
    } catch (e) {
      this.saveOfflineData(data);
    }
  }

  /** 页面卸载处理 */
  private setupBeforeUnload(): void {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('beforeunload', () => {
      // 使用 sendBeacon 发送剩余数据
      if (this.fallbackQueue.length > 0) {
        const payload = JSON.stringify({
          dsn: this.config.dsn,
          events: this.fallbackQueue
        });
        navigator.sendBeacon(this.config.reportUrl, payload);
      }
      
      // 通知 Worker 销毁
      this.worker?.postMessage({ type: 'destroy' });
    });
  }

  /** 保存离线数据 */
  private saveOfflineData(data: any[]): void {
    try {
      const key = 'monitor_offline_v2';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const combined = [...existing, ...data].slice(-100);
      localStorage.setItem(key, JSON.stringify(combined));
    } catch (e) {
      // ignore
    }
  }

  /** 加载离线数据 */
  private loadOfflineData(): void {
    try {
      const key = 'monitor_offline_v2';
      const data = localStorage.getItem(key);
      if (data) {
        this.offlineData = JSON.parse(data);
      }
    } catch (e) {
      // ignore
    }
  }

  /** 清除离线数据 */
  private clearOfflineData(): void {
    try {
      localStorage.removeItem('monitor_offline_v2');
    } catch (e) {
      // ignore
    }
  }

  /** 销毁 */
  destroy(): void {
    this.worker?.postMessage({ type: 'destroy' });
    this.worker?.terminate();
    this.worker = null;
  }
}
