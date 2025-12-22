# SDK 增强功能文档

## 概述

本次更新为监控 SDK 添加了多项企业级功能，包括用户信息管理、自定义上下文、采样率控制、URL 过滤、错误过滤和事件钩子。

## 新增功能

### 1. 用户信息管理

SDK 现在支持设置和追踪用户信息，所有上报的事件都会自动附加用户信息。

```typescript
import { Monitor } from '@monitor/sdk';

const monitor = Monitor.getInstance();

// 设置用户信息
monitor.setUser({
  id: 'user_123',
  username: 'john_doe',
  email: 'john@example.com',
  // 支持自定义字段
  vipLevel: 'gold'
});

// 获取当前用户信息
const user = monitor.getUser();

// 清空用户信息
monitor.setUser(null);
```

### 2. 自定义上下文

为事件添加额外的上下文信息，帮助更好地理解错误发生的环境。

```typescript
// 设置完整上下文
monitor.setContext({
  version: '1.0.0',
  environment: 'production',
  tags: { feature: 'checkout' },
  extra: { buildId: '12345' }
});

// 设置单个标签
monitor.setTag('page', 'home');
monitor.setTag('experiment', 'variant_a');

// 设置额外数据
monitor.setExtra('sessionId', 'abc123');
monitor.setExtra('referrer', document.referrer);

// 获取当前上下文
const context = monitor.getContext();
```

### 3. 设备信息自动检测

SDK 会自动检测并附加设备信息到所有事件：

- 操作系统（Windows, macOS, Linux, Android, iOS）
- 浏览器类型和版本（Chrome, Firefox, Safari, Edge）
- 屏幕分辨率
- 视口大小
- 设备类型（desktop, mobile, tablet）

### 4. 采样率控制

支持独立控制错误和性能数据的采样率，降低数据量和成本。

```typescript
monitor.init({
  dsn: 'your-project-id',
  reportUrl: 'https://your-server.com/api/report',
  
  // 全局采样率（默认 1.0 = 100%）
  sampleRate: 1.0,
  
  // 错误采样率（覆盖全局采样率）
  errorSampleRate: 1.0,  // 100% 错误采集
  
  // 性能采样率（覆盖全局采样率）
  performanceSampleRate: 0.1  // 10% 性能采集
});
```

### 5. URL 过滤

过滤来自特定 URL 的错误，避免上报无关或敏感的错误。

```typescript
monitor.init({
  dsn: 'your-project-id',
  reportUrl: 'https://your-server.com/api/report',
  
  // 白名单：只上报匹配的 URL
  allowUrls: [
    'https://myapp.com',
    /myapp\.com/
  ],
  
  // 黑名单：不上报匹配的 URL
  ignoreUrls: [
    'chrome-extension://',
    /localhost:\d+/,
    'https://third-party.com'
  ]
});
```

### 6. 错误消息过滤

过滤特定的错误消息，避免上报已知的无害错误。

```typescript
monitor.init({
  dsn: 'your-project-id',
  reportUrl: 'https://your-server.com/api/report',
  
  // 忽略的错误消息（支持字符串和正则）
  ignoreErrors: [
    'Script error',  // 跨域脚本错误
    /ResizeObserver/,  // ResizeObserver 错误
    'Non-Error promise rejection'
  ]
});
```

### 7. beforeSend 钩子

在事件上报前进行最后的过滤或修改。

```typescript
monitor.init({
  dsn: 'your-project-id',
  reportUrl: 'https://your-server.com/api/report',
  
  beforeSend: (event) => {
    // 过滤敏感信息
    if (event.message?.includes('password')) {
      return null;  // 不上报
    }
    
    // 修改事件
    if ('message' in event) {
      event.message = event.message.replace(/\d{16}/g, '[CARD]');
    }
    
    // 返回修改后的事件
    return event;
  }
});
```

## 完整示例

```typescript
import { Monitor } from '@monitor/sdk';

const monitor = Monitor.getInstance();

// 初始化配置
monitor.init({
  dsn: 'my-app',
  reportUrl: 'https://monitor.example.com/api/report',
  
  // 采样率
  errorSampleRate: 1.0,
  performanceSampleRate: 0.2,
  
  // URL 过滤
  allowUrls: ['https://myapp.com'],
  ignoreUrls: ['chrome-extension://'],
  
  // 错误过滤
  ignoreErrors: [/Script error/i],
  
  // 事件钩子
  beforeSend: (event) => {
    // 添加自定义字段
    if ('message' in event) {
      event.message = `[${process.env.NODE_ENV}] ${event.message}`;
    }
    return event;
  }
});

// 设置用户信息
monitor.setUser({
  id: 'user_123',
  username: 'john_doe',
  email: 'john@example.com'
});

// 设置上下文
monitor.setContext({
  version: '1.0.0',
  environment: 'production'
});

monitor.setTag('feature', 'checkout');
monitor.setExtra('sessionId', 'abc123');

// 手动捕获错误
try {
  // 业务代码
} catch (error) {
  monitor.captureError(error);
}

// 手动捕获消息
monitor.captureMessage('Payment processed successfully', 'info');
```

## 数据结构

### ErrorEvent

```typescript
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
  user?: UserInfo;        // 新增
  context?: CustomContext; // 新增
}
```

### PerformanceData

```typescript
interface PerformanceData {
  fp?: number;
  fcp?: number;
  lcp?: number;
  ttfb?: number;
  domReady?: number;
  load?: number;
  longTasks?: LongTask[];
  url: string;
  timestamp: number;
  user?: UserInfo;        // 新增
  context?: CustomContext; // 新增
}
```

## 测试覆盖

新功能包含完整的单元测试：

- ✅ 用户信息设置和获取（8 个测试）
- ✅ 采样率控制（3 个测试）
- ✅ URL 过滤（2 个测试）
- ✅ 错误消息过滤（2 个测试）
- ✅ beforeSend 钩子（4 个测试）

运行测试：

```bash
pnpm --filter @monitor/sdk test
```

## 性能影响

- 设备信息检测：仅在初始化时执行一次，性能影响可忽略
- 用户和上下文附加：浅拷贝操作，性能影响 < 1ms
- URL 过滤：字符串匹配和正则测试，性能影响 < 0.1ms
- 采样率控制：随机数生成，性能影响 < 0.01ms

## 向后兼容

所有新功能都是可选的，不影响现有代码。未设置的字段不会出现在上报数据中。

## 下一步计划

- [ ] 会话追踪（Session Replay）
- [ ] 自定义指标（Custom Metrics）
- [ ] 分布式追踪（Distributed Tracing）
- [ ] 离线数据持久化增强
