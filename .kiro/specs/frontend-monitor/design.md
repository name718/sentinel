# Design Document

## Overview

前端监控系统采用 SDK + Server 的架构，SDK 负责在浏览器端采集错误、性能和用户行为数据，Server 负责接收、存储和查询数据。

系统使用 monorepo 结构组织代码，SDK 使用 TypeScript 开发并通过 Rollup 打包，Server 使用 Node.js + Koa 构建，数据存储使用 SQLite。

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    Monitor SDK                        │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │    │
│  │  │ Error    │ │ Resource │ │ Behavior │ │ Perf    │ │    │
│  │  │ Catcher  │ │ Monitor  │ │ Tracker  │ │ Monitor │ │    │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ │    │
│  │       │            │            │            │       │    │
│  │       └────────────┴─────┬──────┴────────────┘       │    │
│  │                          │                           │    │
│  │                   ┌──────▼──────┐                    │    │
│  │                   │  Reporter   │                    │    │
│  │                   │ (batch/throttle)                 │    │
│  │                   └──────┬──────┘                    │    │
│  └──────────────────────────┼──────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────┘
                              │ HTTP POST /report
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Server                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Report API   │  │ Query API    │  │ SourceMap    │       │
│  │ /report      │  │ /errors      │  │ /sourcemap   │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
│         │                 │                 │                │
│         └─────────────────┼─────────────────┘                │
│                           │                                  │
│                    ┌──────▼──────┐                           │
│                    │   SQLite    │                           │
│                    └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### SDK 核心模块

```typescript
// SDK 初始化配置
interface MonitorConfig {
  dsn: string;              // 项目标识
  reportUrl: string;        // 上报地址
  sampleRate?: number;      // 采样率 0-1
  maxBreadcrumbs?: number;  // 最大 breadcrumb 数量
  enableError?: boolean;    // 启用错误监控
  enablePerformance?: boolean; // 启用性能监控
  enableBehavior?: boolean; // 启用行为追踪
}

// 错误数据结构
interface ErrorEvent {
  type: 'error' | 'unhandledrejection' | 'resource';
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  timestamp: number;
  url: string;
  breadcrumbs: Breadcrumb[];
}

// 行为面包屑
interface Breadcrumb {
  type: 'click' | 'route' | 'console' | 'xhr' | 'fetch';
  category: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

// 性能数据
interface PerformanceData {
  fp?: number;    // First Paint
  fcp?: number;   // First Contentful Paint
  lcp?: number;   // Largest Contentful Paint
  ttfb?: number;  // Time To First Byte
  domReady?: number;
  load?: number;
  longTasks?: LongTask[];
}

interface LongTask {
  startTime: number;
  duration: number;
}
```

### SDK 模块设计

```typescript
// 核心类
class Monitor {
  private config: MonitorConfig;
  private reporter: Reporter;
  private breadcrumbs: Breadcrumb[];
  
  init(config: MonitorConfig): void;
  captureError(error: ErrorEvent): void;
  capturePerformance(data: PerformanceData): void;
  addBreadcrumb(crumb: Breadcrumb): void;
}

// 上报器
class Reporter {
  private queue: ReportData[];
  private config: ReporterConfig;
  
  push(data: ReportData): void;
  flush(): void;
  private send(data: ReportData[]): Promise<void>;
}

// 错误捕获器
class ErrorCatcher {
  install(): void;
  uninstall(): void;
  private handleError(event: ErrorEvent): void;
  private handleRejection(event: PromiseRejectionEvent): void;
}

// 资源监控器
class ResourceMonitor {
  install(): void;
  uninstall(): void;
  private handleResourceError(event: Event): void;
}

// 行为追踪器
class BehaviorTracker {
  install(): void;
  uninstall(): void;
  private trackClick(event: MouseEvent): void;
  private trackRoute(): void;
  private trackConsole(): void;
  private trackXHR(): void;
  private trackFetch(): void;
}

// 性能监控器
class PerformanceMonitor {
  collect(): PerformanceData;
  private observeLCP(): void;
  private observeLongTasks(): void;
}
```

### Server API 设计

```typescript
// 上报接口
POST /api/report
Body: {
  dsn: string;
  events: (ErrorEvent | PerformanceData)[];
}
Response: { success: boolean }

// 错误列表
GET /api/errors
Query: {
  dsn: string;
  startTime?: number;
  endTime?: number;
  type?: string;
  page?: number;
  pageSize?: number;
}
Response: {
  total: number;
  list: ErrorEvent[];
}

// 错误详情
GET /api/errors/:id
Response: {
  ...ErrorEvent;
  parsedStack?: ParsedStackFrame[];
}

// SourceMap 上传
POST /api/sourcemap
Body: FormData { file, version, dsn }
Response: { success: boolean }

// 性能统计
GET /api/performance
Query: { dsn: string; startTime?: number; endTime?: number }
Response: {
  avgFcp: number;
  avgLcp: number;
  avgTtfb: number;
}
```

## Data Models

### SQLite 表结构

```sql
-- 错误事件表
CREATE TABLE errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dsn TEXT NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  stack TEXT,
  filename TEXT,
  lineno INTEGER,
  colno INTEGER,
  url TEXT NOT NULL,
  breadcrumbs TEXT, -- JSON
  timestamp INTEGER NOT NULL,
  fingerprint TEXT, -- 用于聚合的指纹
  count INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 性能数据表
CREATE TABLE performance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dsn TEXT NOT NULL,
  fp INTEGER,
  fcp INTEGER,
  lcp INTEGER,
  ttfb INTEGER,
  dom_ready INTEGER,
  load INTEGER,
  long_tasks TEXT, -- JSON
  url TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- SourceMap 表
CREATE TABLE sourcemaps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dsn TEXT NOT NULL,
  version TEXT NOT NULL,
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(dsn, version, filename)
);

-- 索引
CREATE INDEX idx_errors_dsn_timestamp ON errors(dsn, timestamp);
CREATE INDEX idx_errors_fingerprint ON errors(fingerprint);
CREATE INDEX idx_performance_dsn_timestamp ON performance(dsn, timestamp);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: 错误数据结构完整性

*For any* JS 错误或 Promise rejection，捕获后的 ErrorEvent 对象必须包含 type、message、timestamp 和 url 字段，且 type 值必须是 'error' 或 'unhandledrejection'。

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: 资源错误类型识别

*For any* 资源加载失败事件，SDK 必须正确识别资源类型（script/link/img），且记录的数据包含资源 URL、类型和时间戳。

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: 批量上报合并

*For any* N 条待上报数据（N <= 阈值），当触发上报时，这 N 条数据必须合并为一次 HTTP 请求发送。

**Validates: Requirements 3.1, 3.2**

### Property 4: 节流控制有效性

*For any* 时间窗口 T 内的多次上报触发，实际发送的请求次数不超过配置的最大频率。

**Validates: Requirements 3.3**

### Property 5: 离线缓存 Round-Trip

*For any* 在网络不可用时产生的上报数据，缓存到本地后，当网络恢复时，这些数据必须被成功发送到服务端。

**Validates: Requirements 3.4, 3.5**

### Property 6: Breadcrumb 先进先出

*For any* 时刻，breadcrumbs 数组的长度不超过配置的最大值 maxBreadcrumbs，且当超出时，最早的记录被移除。

**Validates: Requirements 4.5, 4.6**

### Property 7: 错误关联 Breadcrumbs

*For any* 错误事件，其关联的 breadcrumbs 必须是错误发生前最近的 N 条行为记录，按时间顺序排列。

**Validates: Requirements 4.5**

### Property 8: SourceMap 解析 Round-Trip

*For any* 已上传 SourceMap 的版本，给定压缩后的堆栈位置（文件名、行号、列号），解析后必须返回正确的源码位置。

**Validates: Requirements 6.3, 6.4**

### Property 9: 数据存储 Round-Trip

*For any* 通过 /report 接口上报的有效数据，必须能通过查询接口检索到，且数据内容一致。

**Validates: Requirements 7.3**

### Property 10: 项目数据隔离

*For any* 两个不同的 dsn，通过一个 dsn 查询时，不应返回另一个 dsn 的数据。

**Validates: Requirements 7.4**

### Property 11: 错误聚合

*For any* 具有相同 fingerprint 的多条错误，存储时应聚合为一条记录，count 字段等于上报次数。

**Validates: Requirements 7.5**

### Property 12: 上报数据验证

*For any* 缺少必填字段（dsn、type、message）的上报数据，服务端必须返回验证错误，不存储该数据。

**Validates: Requirements 7.2**

### Property 13: 采样率控制

*For any* 配置的采样率 r（0 <= r <= 1），长期来看，实际上报的数据比例应接近 r。

**Validates: Requirements 9.4**

### Property 14: 未初始化不采集

*For any* 未调用 init() 的 SDK 实例，不应产生任何数据采集或上报行为。

**Validates: Requirements 9.7**

## Error Handling

### SDK 端

1. **捕获器异常隔离**: 各监控模块的异常不应影响业务代码执行
2. **上报失败重试**: 网络请求失败时，数据进入重试队列，最多重试 3 次
3. **存储容量限制**: 离线缓存数据量超过限制时，丢弃最早的数据
4. **配置校验**: init() 时校验必填配置，缺失时抛出明确错误

### Server 端

1. **请求体大小限制**: 限制单次上报数据量，防止恶意大请求
2. **数据校验**: 严格校验上报数据格式，拒绝非法数据
3. **数据库错误**: 存储失败时记录日志，返回 500 错误
4. **SourceMap 解析失败**: 解析失败时返回原始堆栈，不阻塞查询

## Testing Strategy

### 单元测试

使用 Vitest 作为测试框架，覆盖：
- 各监控模块的核心逻辑
- 数据格式化和校验函数
- Reporter 的批量和节流逻辑
- Server 端的数据处理逻辑

### 属性测试

使用 fast-check 进行属性测试，验证：
- 数据结构完整性（Property 1, 2, 12）
- Round-trip 属性（Property 5, 8, 9）
- 不变量属性（Property 6, 10, 11）
- 配置生效验证（Property 13, 14）

每个属性测试运行至少 100 次迭代。

测试标注格式：
```typescript
// **Feature: frontend-monitor, Property 1: 错误数据结构完整性**
// **Validates: Requirements 1.1, 1.2, 1.3**
```

### 集成测试

- SDK 与 Server 的端到端上报流程
- SourceMap 上传和解析流程
- 离线缓存和恢复流程
