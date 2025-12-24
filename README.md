# Sentinel 前端监控平台

> 一站式前端应用监控解决方案，帮助开发团队快速发现、定位和解决线上问题。

## 为什么做这个项目？

### 痛点分析

前端开发者在生产环境中面临的核心挑战：

1. **错误难以复现**
   - 用户反馈"页面白屏"，但开发环境无法复现
   - 不知道用户做了什么操作导致错误
   - 缺少错误发生时的上下文信息

2. **定位困难**
   - 生产环境代码经过压缩混淆，堆栈信息难以阅读
   - `Error at index-Cx2rbgKI.js:1:5678` 这样的信息毫无意义
   - 需要手动对照 SourceMap 还原

3. **性能问题隐蔽**
   - 用户说"页面很慢"，但不知道慢在哪里
   - 缺少真实用户的性能数据
   - 无法量化性能优化效果

4. **告警轰炸**
   - 同一个错误重复上报成千上万次
   - 无法区分新错误和已知问题
   - 重要错误被淹没在噪音中

### 解决方案

Sentinel 通过以下方式解决这些问题：

| 痛点 | 解决方案 |
|------|----------|
| 错误难复现 | 会话录制 + 用户行为轨迹，完整还原错误现场 |
| 定位困难 | SourceMap 自动解析，还原源码位置 |
| 性能隐蔽 | 采集真实用户 Web Vitals 指标 |
| 告警轰炸 | 智能错误聚合，相似错误自动归类 |

---

## 做了什么？

### 核心功能

#### 🐛 错误监控

自动捕获前端运行时的各类错误：

- **JavaScript 运行时错误** - 语法错误、引用错误、类型错误等
- **Promise 未处理的 rejection** - async/await 异常、Promise.reject
- **资源加载失败** - 图片、脚本、样式加载失败
- **网络请求异常** - XHR/Fetch 请求失败

每个错误都会记录完整上下文：
- 错误类型、消息、堆栈
- 发生页面 URL
- 用户行为轨迹（点击、路由、网络请求）
- 会话录制（可选）

#### ⚡ 性能监控

采集 Core Web Vitals 核心指标：

| 指标 | 说明 | 建议值 |
|------|------|--------|
| FP | 首次绘制时间 | - |
| FCP | 首次内容绘制 | < 1.8s |
| LCP | 最大内容绘制 | < 2.5s |
| FID | 首次输入延迟 | < 100ms |
| CLS | 累积布局偏移 | < 0.1 |
| TTFB | 首字节时间 | < 600ms |

额外采集：
- 长任务监控（> 50ms）
- 资源加载瀑布图
- DOM Ready / Load 时间

#### 🎬 会话录制

基于 rrweb 的会话录制功能：

- 录制 DOM 变化、鼠标轨迹、滚动、输入
- 错误发生时自动保存前 N 秒的录制
- 支持回放，完整还原用户操作
- 隐私保护：密码自动脱敏

#### 🗺️ SourceMap 解析

生产环境代码还原：

```
压缩后: Error at index-Cx2rbgKI.js:1:5678
还原后: 📍 src/utils/calculate.ts:15:10 (divideNumbers)
```

- 支持 Vite/Webpack 插件自动上传
- 版本管理，支持多版本并存
- 安全存储，不暴露源码

#### 📊 错误聚合

智能识别相同类型的错误：

- 基于错误特征生成唯一指纹
- 动态内容（ID、时间戳、URL 参数）自动归一化
- 显示首次/最近发生时间、影响页面数、发生次数
- 支持 Session 对比分析

---

## 数据采集原理

### 错误捕获

#### 1. window.onerror

捕获同步 JavaScript 错误：

```javascript
window.onerror = function(message, source, lineno, colno, error) {
  // message: 错误消息
  // source: 发生错误的脚本 URL
  // lineno: 行号
  // colno: 列号
  // error: Error 对象（包含堆栈）
}
```

**注意事项**：
- 跨域脚本错误只能获取 "Script error." 消息
- 需要在脚本标签添加 `crossorigin` 属性并配置 CORS

#### 2. window.onunhandledrejection

捕获未处理的 Promise rejection：

```javascript
window.onunhandledrejection = function(event) {
  // event.reason: rejection 的原因
  // event.promise: 被 reject 的 Promise
}
```

**常见场景**：
- `Promise.reject()` 没有 catch
- async 函数中抛出错误没有 try-catch
- then() 回调中抛出错误没有后续 catch

#### 3. 资源加载错误

通过事件捕获监听资源加载失败：

```javascript
window.addEventListener('error', (event) => {
  if (event.target instanceof HTMLElement) {
    // 资源加载失败（img、script、link）
  }
}, true); // 使用捕获阶段
```

### 性能采集

#### Performance API

使用浏览器原生 Performance API：

```javascript
// Paint Timing
performance.getEntriesByType('paint');
// → [{name: 'first-paint', startTime: 123}, {name: 'first-contentful-paint', startTime: 456}]

// Navigation Timing
performance.getEntriesByType('navigation');
// → [{responseStart, domContentLoadedEventEnd, loadEventEnd, ...}]
```

#### PerformanceObserver

监听性能条目的异步 API：

```javascript
// 监听 LCP
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];
  console.log('LCP:', lastEntry.startTime);
}).observe({ type: 'largest-contentful-paint', buffered: true });

// 监听 Long Task
new PerformanceObserver((list) => {
  list.getEntries().forEach(entry => {
    console.log('Long Task:', entry.duration);
  });
}).observe({ type: 'longtask', buffered: true });
```

### 用户行为追踪

#### 点击事件

使用事件委托在 document 上监听：

```javascript
document.addEventListener('click', (event) => {
  const target = event.target;
  // 记录：元素标签、ID、类名、时间戳
}, true);
```

#### 路由变化

SPA 应用的路由变化监听：

```javascript
// popstate（浏览器前进/后退）
window.addEventListener('popstate', handler);

// hashchange（hash 路由）
window.addEventListener('hashchange', handler);

// 拦截 history.pushState/replaceState
const original = history.pushState;
history.pushState = function(...args) {
  original.apply(this, args);
  // 记录路由变化
};
```

#### 网络请求

拦截 XHR 和 Fetch：

```javascript
// XHR
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url) {
  this._monitorData = { method, url, startTime: Date.now() };
  originalOpen.apply(this, arguments);
};

// Fetch
const originalFetch = window.fetch;
window.fetch = async function(input, init) {
  const startTime = Date.now();
  const response = await originalFetch(input, init);
  // 记录请求信息
  return response;
};
```

### 会话录制

基于 rrweb 的录制原理：

1. **快照（Snapshot）**：初始化时对整个 DOM 树进行序列化
2. **增量记录（Incremental）**：使用 MutationObserver 监听 DOM 变化
3. **事件记录**：鼠标移动、点击、滚动、输入等

**隐私保护**：
- 密码字段自动屏蔽
- 可配置敏感字段列表
- 支持自定义脱敏规则

### 数据上报

#### 批量上报

将多条数据合并为一次 HTTP 请求：

```javascript
// 数据先进入队列
// 达到阈值（batchSize）或超时（reportInterval）时触发上报
// 合并为 { dsn, events: [...] } 格式发送
```

#### 离线缓存

网络不可用时保证数据不丢失：

```javascript
// 检测 navigator.onLine 状态
// 离线时将数据存入 localStorage
// 监听 online 事件，网络恢复后重传
```

#### sendBeacon

页面卸载时确保数据发送：

```javascript
window.addEventListener('beforeunload', () => {
  navigator.sendBeacon(reportUrl, JSON.stringify(data));
});
```

---

## 技术优势

### 1. 轻量级 SDK

- 核心代码 < 10KB (gzip)
- 按需加载，会话录制等功能可选
- 不影响页面性能

### 2. 可靠上报

- 批量合并，减少请求数
- 离线缓存，网络恢复后自动重传
- sendBeacon 确保页面关闭时数据不丢失

### 3. 隐私保护

- 密码字段自动脱敏
- 可配置敏感数据过滤
- 支持白名单/黑名单 URL 过滤

### 4. 采样控制

- 全局采样率
- 错误/性能独立采样率
- beforeSend 钩子自定义过滤

### 5. 智能聚合

- 基于错误特征生成指纹
- 动态内容自动归一化
- 避免重复告警

---

## 系统架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         前端应用                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Sentinel SDK                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ 错误捕获  │ │ 性能监控  │ │ 行为追踪  │ │ 会话录制  │   │   │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘   │   │
│  │       └────────────┴────────────┴────────────┘          │   │
│  │                         ↓                                │   │
│  │                    ┌──────────┐                          │   │
│  │                    │  上报器   │                          │   │
│  │                    └────┬─────┘                          │   │
│  └─────────────────────────┼───────────────────────────────┘   │
└────────────────────────────┼────────────────────────────────────┘
                             ↓
┌────────────────────────────┼────────────────────────────────────┐
│                      Sentinel Server                            │
│  ┌─────────────────────────┼───────────────────────────────┐   │
│  │                    API Gateway                           │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ 数据接收  │ │ 认证鉴权  │ │ 限流控制  │ │ 数据校验  │   │   │
│  │  └────┬─────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └───────┼─────────────────────────────────────────────────┘   │
│          ↓                                                      │
│  ┌───────┴─────────────────────────────────────────────────┐   │
│  │                    业务处理层                             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ 错误聚合  │ │SourceMap│ │ 指纹计算  │ │ 统计分析  │   │   │
│  │  └────┬─────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └───────┼─────────────────────────────────────────────────┘   │
│          ↓                                                      │
│  ┌───────┴─────────────────────────────────────────────────┐   │
│  │                    数据存储层                             │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                 │   │
│  │  │PostgreSQL│ │ 文件存储  │ │  Redis   │                 │   │
│  │  │ (主数据)  │ │(SourceMap)│ │ (缓存)   │                 │   │
│  │  └──────────┘ └──────────┘ └──────────┘                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Sentinel Dashboard                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │ 错误列表  │ │ 性能分析  │ │ 会话回放  │ │ 趋势图表  │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 模块说明

| 模块 | 技术栈 | 说明 |
|------|--------|------|
| SDK | TypeScript | 嵌入前端应用，负责数据采集和上报 |
| Server | Express + PostgreSQL | 接收数据、存储、SourceMap 解析 |
| Dashboard | Vue 3 + ECharts | 可视化管理后台 |
| Plugins | Vite/Webpack | SourceMap 上传插件 |
| VSCode Extension | TypeScript | IDE 集成，错误跳转 |

### 数据流

```
1. SDK 采集数据 → 2. 批量上报 → 3. Server 接收
                                      ↓
4. 数据校验 → 5. 错误聚合 → 6. 存储入库
                                      ↓
7. Dashboard 查询 → 8. SourceMap 解析 → 9. 展示
```

---

## 数据安全

### 传输安全

- 所有数据通过 HTTPS 传输
- 支持自定义上报域名
- 敏感数据在客户端脱敏后上报

### 存储安全

- 数据库连接使用 SSL
- SourceMap 文件独立存储，不对外暴露
- 支持数据保留策略配置

### 隐私保护

- 密码字段自动屏蔽
- 支持 PII（个人身份信息）过滤
- 会话录制可配置脱敏规则
- 符合 GDPR 要求

### 访问控制

- JWT 认证
- 基于角色的权限控制（RBAC）
- API 限流保护

---

## 后续计划

### 短期（1-2 周）

- [ ] 多项目/多租户支持
- [ ] 告警系统（邮件、钉钉、飞书）
- [x] 错误状态管理（处理中/已解决/忽略）

### 中期（1-2 月）

- [ ] 数据存储升级（ClickHouse 时序数据）
- [ ] 发布版本关联
- [ ] 高级分析（影响分析、根因分析）
- [ ] 自定义仪表盘

### 长期（3-6 月）

- [ ] AI 错误分类
- [ ] 智能告警（异常检测）
- [ ] OpenTelemetry 集成
- [ ] 小程序 SDK

详细规划见 [plan.md](../plan.md)

---

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动所有服务
pnpm dev:server          # 后端服务 http://localhost:3000
pnpm --filter @monitor/demo-app dev      # 演示应用 http://localhost:5173
pnpm --filter @monitor/dashboard dev     # 管理后台 http://localhost:5174
```

### SDK 接入

```typescript
import { init } from '@monitor/sdk';

init({
  dsn: 'your-project-id',
  reportUrl: 'https://your-server.com/api/report',
  enableSessionReplay: true,
  sampleRate: 1,
});
```

---

## License

MIT
