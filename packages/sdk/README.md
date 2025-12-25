# @majuntao-1/sentinel-sdk

> 轻量级前端监控 SDK - 错误监控、性能分析、会话回放

[![npm version](https://img.shields.io/npm/v/@majuntao-1/sentinel-sdk.svg)](https://www.npmjs.com/package/@majuntao-1/sentinel-sdk)
[![npm downloads](https://img.shields.io/npm/dm/@majuntao-1/sentinel-sdk.svg)](https://www.npmjs.com/package/@majuntao-1/sentinel-sdk)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-red.svg)](LICENSE)

## ✨ 特性

- 🐛 **错误监控** - 自动捕获 JS 错误、Promise 异常、资源加载失败
- ⚡ **性能监控** - Core Web Vitals (FCP/LCP/FID/CLS/TTFB)
- 🎬 **会话回放** - 基于 rrweb 录制用户操作
- 🚀 **Web Worker** - 数据处理不阻塞主线程
- 📦 **轻量级** - < 10KB gzipped (不含 rrweb)
- 🔧 **零依赖** - 核心功能无外部依赖
- 💎 **TypeScript** - 完整类型定义

## 📦 安装

```bash
npm install @anthropic-sentinel/sdk
# 或
pnpm add @anthropic-sentinel/sdk
# 或
yarn add @anthropic-sentinel/sdk
```

## 🚀 快速开始

```typescript
import { Monitor } from '@majuntao-1/sentinel-sdk';

const monitor = Monitor.getInstance();

monitor.init({
  dsn: 'your-project-id',
  reportUrl: 'https://your-server.com/api/report',
});
```

## ⚙️ 配置项

```typescript
monitor.init({
  // 必填
  dsn: 'your-project-id',           // 项目标识
  reportUrl: 'https://...',         // 上报地址

  // 采样率
  sampleRate: 1,                    // 全局采样率 0-1
  errorSampleRate: 1,               // 错误采样率
  performanceSampleRate: 0.5,       // 性能采样率

  // 功能开关
  enableSessionReplay: false,       // 会话回放
  useWorker: true,                  // Web Worker 上报

  // 上报配置
  batchSize: 10,                    // 批量上报阈值
  reportInterval: 5000,             // 上报间隔 (ms)
  maxBreadcrumbs: 20,               // 最大行为记录数

  // 过滤规则
  ignoreErrors: [/Script error/],   // 忽略的错误
  ignoreUrls: [/localhost/],        // 忽略的 URL
});
```

## 📖 API

### 设置用户信息

```typescript
monitor.setUser({
  id: 'user-123',
  username: 'john',
  email: 'john@example.com',
});
```

### 手动捕获错误

```typescript
try {
  // your code
} catch (error) {
  monitor.captureError(error);
}
```

### 添加面包屑

```typescript
monitor.addBreadcrumb({
  type: 'user',
  category: 'click',
  message: 'Button clicked',
  data: { buttonId: 'submit' },
});
```

### 设置额外数据

```typescript
monitor.setExtra('version', '1.0.0');
monitor.setExtra('environment', 'production');
```

### 设置标签

```typescript
monitor.setTag('release', 'v1.2.3');
```

## 🎬 会话回放

启用会话回放功能：

```typescript
monitor.init({
  dsn: 'your-project-id',
  reportUrl: 'https://your-server.com/api/report',
  enableSessionReplay: true,
});
```

会话回放基于 [rrweb](https://github.com/rrweb-io/rrweb)，会在错误发生时自动保存回放数据。

## 🔧 构建插件

配合 Vite/Webpack 插件自动上传 SourceMap：

```typescript
// vite.config.ts
import { sentinelVitePlugin } from '@anthropic-sentinel/plugins';

export default {
  plugins: [
    sentinelVitePlugin({
      dsn: 'your-project-id',
      uploadUrl: 'https://your-server.com/api/sourcemap/upload',
    }),
  ],
};
```

## 📊 监控数据

SDK 会自动采集以下数据：

### 错误数据
- JavaScript 运行时错误
- Promise 未捕获异常
- 资源加载失败
- 网络请求错误

### 性能数据
- FCP (First Contentful Paint)
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- TTFB (Time to First Byte)
- 资源加载时间

### 用户行为
- 点击事件
- 页面跳转
- 控制台输出
- 网络请求

## 🌐 浏览器支持

- Chrome >= 60
- Firefox >= 55
- Safari >= 11
- Edge >= 79

## 📄 License

[AGPL-3.0](LICENSE) - 禁止商业用途

## 🔗 相关链接

- [GitHub](https://github.com/name718/sentinel)
- [问题反馈](https://github.com/name718/sentinel/issues)
