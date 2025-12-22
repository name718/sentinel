# SDK 架构文档

## 模块概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Monitor (核心)                              │
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ ErrorCatcher│  │ Resource    │  │ Behavior    │  │ Performance │    │
│  │             │  │ Monitor     │  │ Tracker     │  │ Monitor     │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
│         │                │                │                │           │
│         │    onError     │    onError     │  onBreadcrumb  │ onPerf    │
│         └────────┬───────┴────────┬───────┴────────┬───────┘           │
│                  │                │                │                    │
│                  ▼                ▼                ▼                    │
│         ┌────────────────────────────────────────────────┐             │
│         │              Breadcrumbs 管理                   │             │
│         │         (先进先出队列, 最大 N 条)                │             │
│         └────────────────────────────────────────────────┘             │
│                                │                                        │
│                                ▼                                        │
│         ┌────────────────────────────────────────────────┐             │
│         │                  Reporter                       │             │
│         │     (批量上报 / 节流 / 离线缓存 / sendBeacon)    │             │
│         └────────────────────────┬───────────────────────┘             │
└──────────────────────────────────┼──────────────────────────────────────┘
                                   │
                                   │ HTTP POST /api/report
                                   ▼
                          ┌─────────────────┐
                          │     Server      │
                          └─────────────────┘
```

## 类图 (Class Diagram)

```mermaid
classDiagram
    class Monitor {
        -config: MonitorConfig
        -breadcrumbs: Breadcrumb[]
        -reporter: Reporter
        -errorCatcher: ErrorCatcher
        -resourceMonitor: ResourceMonitor
        -behaviorTracker: BehaviorTracker
        -performanceMonitor: PerformanceMonitor
        +getInstance(): Monitor
        +init(config): void
        +report(data): void
        +addBreadcrumb(crumb): void
        +getBreadcrumbs(): Breadcrumb[]
        +captureError(error): void
        +destroy(): void
    }

    class Reporter {
        -queue: ReportData[]
        -config: ReporterConfig
        +push(data): void
        +flush(): void
        -send(data): Promise
        -sendBeacon(data): boolean
        -saveOfflineData(data): void
        -retryOfflineData(): void
    }

    class ErrorCatcher {
        -options: ErrorCatcherOptions
        +install(): void
        +uninstall(): void
        +captureError(error): void
        -handleError(event): void
        -handleRejection(event): void
        -formatError(params): ErrorEvent
    }

    class ResourceMonitor {
        -options: ResourceMonitorOptions
        +install(): void
        +uninstall(): void
        -handleError(event): void
        -getResourceType(tagName): string
        -getResourceUrl(target): string
    }

    class BehaviorTracker {
        -options: BehaviorTrackerOptions
        +install(): void
        +uninstall(): void
        -trackClick(): void
        -trackRoute(): void
        -trackConsole(): void
        -trackXHR(): void
        -trackFetch(): void
    }

    class PerformanceMonitor {
        -options: PerformanceMonitorOptions
        -longTasks: LongTask[]
        -lcpValue: number
        +start(): void
        +stop(): void
        +collect(): PerformanceData
        -observeLCP(): void
        -observeLongTasks(): void
    }

    Monitor "1" *-- "1" Reporter : 包含
    Monitor "1" *-- "1" ErrorCatcher : 包含
    Monitor "1" *-- "1" ResourceMonitor : 包含
    Monitor "1" *-- "1" BehaviorTracker : 包含
    Monitor "1" *-- "1" PerformanceMonitor : 包含
```

## 时序图 (Sequence Diagram)

### 初始化流程

```mermaid
sequenceDiagram
    participant App as 应用代码
    participant M as Monitor
    participant R as Reporter
    participant EC as ErrorCatcher
    participant RM as ResourceMonitor
    participant BT as BehaviorTracker
    participant PM as PerformanceMonitor

    App->>M: init(config)
    M->>M: validateConfig()
    M->>R: new Reporter(config)
    R->>R: loadOfflineData()
    R->>R: startTimer()
    R->>R: setupBeforeUnload()
    
    M->>EC: new ErrorCatcher()
    EC->>EC: install()
    Note over EC: 监听 onerror<br/>监听 unhandledrejection
    
    M->>RM: new ResourceMonitor()
    RM->>RM: install()
    Note over RM: 监听 error (捕获阶段)
    
    M->>BT: new BehaviorTracker()
    BT->>BT: install()
    Note over BT: 拦截 click/route<br/>拦截 console/XHR/fetch
    
    M->>PM: new PerformanceMonitor()
    PM->>PM: start()
    Note over PM: 监听 LCP<br/>监听 Long Task
```

### 错误捕获流程

```mermaid
sequenceDiagram
    participant Browser as 浏览器
    participant EC as ErrorCatcher
    participant M as Monitor
    participant R as Reporter
    participant Server as 服务端

    Browser->>EC: JS 错误触发 onerror
    EC->>EC: formatError()
    EC->>M: onError(errorEvent)
    M->>M: getBreadcrumbs()
    Note over M: 关联用户行为
    M->>R: push(errorEvent)
    R->>R: 加入队列
    
    alt 达到批量阈值
        R->>R: flush()
        R->>Server: POST /api/report
    else 定时器触发
        R->>R: flush()
        R->>Server: POST /api/report
    else 网络不可用
        R->>R: saveOfflineData()
    end
```

### 用户行为追踪流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant BT as BehaviorTracker
    participant M as Monitor

    User->>BT: 点击按钮
    BT->>M: onBreadcrumb({type: 'click', ...})
    M->>M: addBreadcrumb()
    Note over M: 队列长度 > maxBreadcrumbs?<br/>移除最早的记录

    User->>BT: 发起 fetch 请求
    BT->>BT: 拦截 fetch
    BT->>BT: 记录开始时间
    Note over BT: 请求完成后
    BT->>M: onBreadcrumb({type: 'fetch', duration, status})
    M->>M: addBreadcrumb()
```

### 数据上报流程

```mermaid
sequenceDiagram
    participant M as Monitor
    participant R as Reporter
    participant LS as localStorage
    participant Server as 服务端

    M->>R: push(data)
    R->>R: queue.push(data)
    
    alt queue.length >= batchSize
        R->>R: flush()
    else 定时器触发
        R->>R: flush()
    end

    R->>R: 检查节流
    alt 距上次上报 < minInterval
        Note over R: 跳过本次上报
    else 可以上报
        R->>R: 检查网络状态
        alt navigator.onLine
            R->>Server: fetch POST
            alt 请求成功
                Server-->>R: {success: true}
            else 请求失败
                R->>LS: saveOfflineData()
            end
        else 离线
            R->>LS: saveOfflineData()
        end
    end

    Note over R: 网络恢复时
    R->>LS: getOfflineData()
    R->>Server: 重新发送
```

### 页面卸载流程

```mermaid
sequenceDiagram
    participant Browser as 浏览器
    participant R as Reporter
    participant LS as localStorage
    participant Server as 服务端

    Browser->>R: beforeunload 事件
    R->>R: stopTimer()
    
    alt queue 有数据
        R->>Server: sendBeacon(queue)
        alt sendBeacon 成功
            Note over R: 数据发送完成
        else sendBeacon 失败
            R->>LS: saveOfflineData()
        end
    end
```

## 模块职责说明

| 模块 | 职责 | 输入 | 输出 |
|------|------|------|------|
| Monitor | 核心协调器，管理配置和子模块 | 用户配置 | 初始化各模块 |
| Reporter | 数据上报，处理批量/节流/离线 | ReportData | HTTP 请求 |
| ErrorCatcher | 捕获 JS 错误和 Promise 异常 | 浏览器事件 | ErrorEvent |
| ResourceMonitor | 捕获资源加载失败 | 浏览器事件 | ResourceError |
| BehaviorTracker | 追踪用户行为 | 用户操作 | Breadcrumb |
| PerformanceMonitor | 采集性能指标 | Performance API | PerformanceData |

## 数据流向

```
┌──────────────────────────────────────────────────────────────────┐
│                          数据采集层                               │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │
│  │ JS 错误    │  │ 资源错误   │  │ 用户行为   │  │ 性能数据   │ │
│  │ onerror    │  │ error事件  │  │ click/xhr  │  │ Perf API   │ │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘ │
└────────┼───────────────┼───────────────┼───────────────┼────────┘
         │               │               │               │
         ▼               ▼               ▼               ▼
┌──────────────────────────────────────────────────────────────────┐
│                          数据处理层                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Monitor (数据聚合)                        │ │
│  │  - 格式化错误数据                                            │ │
│  │  - 关联 Breadcrumbs                                         │ │
│  │  - 采样率过滤                                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                          数据传输层                               │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Reporter (可靠传输)                       │ │
│  │  - 批量合并                                                  │ │
│  │  - 节流控制                                                  │ │
│  │  - 离线缓存                                                  │ │
│  │  - sendBeacon                                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTP
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                          服务端                                   │
│  - 数据接收验证                                                   │
│  - 错误聚合去重                                                   │
│  - 数据存储查询                                                   │
│  - SourceMap 解析                                                │
└──────────────────────────────────────────────────────────────────┘
```

## 配置项说明

```typescript
interface MonitorConfig {
  dsn: string;              // 项目标识，用于数据隔离
  reportUrl: string;        // 上报服务端地址
  sampleRate?: number;      // 采样率 0-1，默认 1（全量上报）
  maxBreadcrumbs?: number;  // 最大 breadcrumb 数量，默认 20
  enableError?: boolean;    // 启用错误监控，默认 true
  enablePerformance?: boolean; // 启用性能监控，默认 true
  enableBehavior?: boolean; // 启用行为追踪，默认 true
  batchSize?: number;       // 批量上报阈值，默认 10
  reportInterval?: number;  // 上报间隔(ms)，默认 5000
}
```

## 扩展点

SDK 设计了以下扩展点，方便后续功能扩展：

1. **新增监控类型**：实现类似 ErrorCatcher 的类，在 Monitor.init() 中初始化
2. **自定义上报策略**：继承 Reporter 类，重写 send() 方法
3. **数据过滤**：在 Monitor.report() 中添加过滤逻辑
4. **插件机制**：可扩展为插件化架构，动态加载监控模块
