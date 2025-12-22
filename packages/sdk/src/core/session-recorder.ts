/**
 * @file SessionRecorder 会话录制模块
 * @description 录制用户操作（DOM 变化、鼠标轨迹、滚动等），用于错误回放
 * 
 * ## 功能职责
 * - 录制 DOM 变化（增删改）
 * - 录制鼠标移动和点击
 * - 录制滚动事件
 * - 录制输入事件（可脱敏）
 * - 与错误关联，保存错误前的操作记录
 * 
 * ## 核心原理
 * 
 * ### rrweb 架构
 * rrweb (record and replay the web) 是一个开源的会话录制库：
 * 
 * 1. **快照（Snapshot）**：
 *    - 初始化时对整个 DOM 树进行序列化
 *    - 生成可重建的 DOM 结构
 *    - 包含样式、属性、文本内容
 * 
 * 2. **增量记录（Incremental）**：
 *    - 使用 MutationObserver 监听 DOM 变化
 *    - 记录增量变化而非完整快照
 *    - 大幅减少数据量
 * 
 * 3. **事件记录**：
 *    - 鼠标移动、点击
 *    - 滚动事件
 *    - 输入事件
 *    - 视口变化
 * 
 * ### 数据结构
 * 
 * ```typescript
 * // 事件类型
 * enum EventType {
 *   DomContentLoaded = 0,  // 页面加载
 *   Load = 1,              // 资源加载完成
 *   FullSnapshot = 2,      // 完整快照
 *   IncrementalSnapshot = 3, // 增量快照
 *   Meta = 4,              // 元数据
 *   Custom = 5             // 自定义事件
 * }
 * 
 * // 增量快照类型
 * enum IncrementalSource {
 *   Mutation = 0,          // DOM 变化
 *   MouseMove = 1,         // 鼠标移动
 *   MouseInteraction = 2,  // 鼠标交互
 *   Scroll = 3,            // 滚动
 *   ViewportResize = 4,    // 视口变化
 *   Input = 5,             // 输入
 *   TouchMove = 6,         // 触摸移动
 *   MediaInteraction = 7,  // 媒体交互
 *   StyleSheetRule = 8,    // 样式规则
 *   CanvasMutation = 9,    // Canvas 变化
 *   Font = 10,             // 字体
 *   Log = 11,              // 日志
 *   Drag = 12,             // 拖拽
 *   StyleDeclaration = 13  // 样式声明
 * }
 * ```
 * 
 * ### 隐私保护
 * 
 * 1. **输入脱敏**：
 *    - 密码字段自动屏蔽
 *    - 可配置敏感字段列表
 *    - 支持自定义脱敏规则
 * 
 * 2. **内容过滤**：
 *    - 可忽略特定元素
 *    - 可忽略特定 class
 *    - 支持白名单模式
 * 
 * ## 性能优化
 * 
 * 1. **采样策略**：
 *    - 鼠标移动事件节流（默认 50ms）
 *    - 滚动事件节流
 *    - 可配置采样率
 * 
 * 2. **数据压缩**：
 *    - 增量记录减少数据量
 *    - 可选 gzip 压缩
 *    - 批量上传
 * 
 * 3. **内存管理**：
 *    - 限制录制时长（默认 30 秒）
 *    - 循环缓冲区
 *    - 自动清理旧数据
 */

import { record } from 'rrweb';

/** rrweb 事件类型 */
type RRwebEvent = any;

/** 会话录制配置 */
export interface SessionRecorderOptions {
  /** 是否启用录制 */
  enabled?: boolean;
  /** 最大录制时长（秒），默认 30 */
  maxDuration?: number;
  /** 是否屏蔽所有输入，默认 true */
  maskAllInputs?: boolean;
  /** 是否屏蔽文本内容，默认 false */
  maskTextContent?: boolean;
  /** 鼠标移动采样间隔（ms），默认 50 */
  mousemoveSampleInterval?: number;
  /** 滚动采样间隔（ms），默认 100 */
  scrollSampleInterval?: number;
  /** 录制回调 */
  onRecord?: (events: RRwebEvent[]) => void;
}

/** 会话录制数据 */
export interface SessionRecording {
  /** 会话 ID */
  sessionId: string;
  /** 录制事件列表 */
  events: RRwebEvent[];
  /** 开始时间 */
  startTime: number;
  /** 结束时间 */
  endTime: number;
  /** 页面 URL */
  url: string;
}

/** 会话录制器 */
export class SessionRecorder {
  private options: Required<SessionRecorderOptions>;
  private events: RRwebEvent[] = [];
  private stopFn: (() => void) | null = null;
  private sessionId: string;
  private startTime: number = 0;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: SessionRecorderOptions = {}) {
    this.options = {
      enabled: options.enabled ?? true,
      maxDuration: options.maxDuration ?? 30,
      maskAllInputs: options.maskAllInputs ?? true,
      maskTextContent: options.maskTextContent ?? false,
      mousemoveSampleInterval: options.mousemoveSampleInterval ?? 50,
      scrollSampleInterval: options.scrollSampleInterval ?? 100,
      onRecord: options.onRecord ?? (() => {})
    };
    
    this.sessionId = this.generateSessionId();
  }

  /** 开始录制 */
  start(): void {
    if (!this.options.enabled || this.stopFn) return;
    if (typeof window === 'undefined') return;

    this.events = [];
    this.startTime = Date.now();
    this.sessionId = this.generateSessionId();

    try {
      const stopFn = record({
        emit: (event) => {
          this.events.push(event);
          
          // 限制录制时长，使用循环缓冲区
          const duration = (Date.now() - this.startTime) / 1000;
          if (duration > this.options.maxDuration) {
            // 保留最近的事件（移除最早的 20%）
            const removeCount = Math.floor(this.events.length * 0.2);
            this.events.splice(0, removeCount);
            this.startTime = this.events[0]?.timestamp || Date.now();
          }
        },
        // 隐私保护配置
        maskAllInputs: this.options.maskAllInputs,
        maskInputOptions: {
          password: true, // 始终屏蔽密码
        },
        // 采样配置
        sampling: {
          mousemove: this.options.mousemoveSampleInterval,
          scroll: this.options.scrollSampleInterval,
        },
        // 性能优化
        recordCanvas: false, // 不录制 Canvas（性能考虑）
        collectFonts: false, // 不收集字体
      } as any);
      
      this.stopFn = stopFn as any;

      // 设置自动清理定时器
      this.setupCleanupTimer();
    } catch (e) {
      console.error('[SessionRecorder] Failed to start recording:', e);
    }
  }

  /** 停止录制 */
  stop(): void {
    if (this.stopFn) {
      this.stopFn();
      this.stopFn = null;
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /** 获取录制数据 */
  getRecording(): SessionRecording | null {
    if (this.events.length === 0) return null;

    return {
      sessionId: this.sessionId,
      events: [...this.events],
      startTime: this.startTime,
      endTime: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : ''
    };
  }

  /** 获取最近 N 秒的录制数据 */
  getRecentRecording(seconds: number = 10): SessionRecording | null {
    if (this.events.length === 0) return null;

    const now = Date.now();
    const cutoffTime = now - seconds * 1000;
    
    // 找到时间范围内的事件
    const recentEvents = this.events.filter(event => event.timestamp >= cutoffTime);
    
    if (recentEvents.length === 0) return null;

    return {
      sessionId: this.sessionId,
      events: recentEvents,
      startTime: recentEvents[0].timestamp,
      endTime: now,
      url: typeof window !== 'undefined' ? window.location.href : ''
    };
  }

  /** 清空录制数据 */
  clear(): void {
    this.events = [];
    this.startTime = Date.now();
    this.sessionId = this.generateSessionId();
  }

  /** 获取录制事件数量 */
  getEventCount(): number {
    return this.events.length;
  }

  /** 获取录制时长（秒） */
  getDuration(): number {
    if (this.events.length === 0) return 0;
    return (Date.now() - this.startTime) / 1000;
  }

  /** 生成会话 ID */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /** 设置自动清理定时器 */
  private setupCleanupTimer(): void {
    // 每 5 秒检查一次，清理过期数据
    this.cleanupTimer = setInterval(() => {
      const duration = this.getDuration();
      if (duration > this.options.maxDuration) {
        // 保留最近的事件
        const removeCount = Math.floor(this.events.length * 0.2);
        if (removeCount > 0) {
          this.events.splice(0, removeCount);
          this.startTime = this.events[0]?.timestamp || Date.now();
        }
      }
    }, 5000);
  }
}

