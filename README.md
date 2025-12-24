# 🔍 Sentinel 前端监控平台

> 一站式前端应用监控解决方案，帮助开发团队快速发现、定位和解决线上问题。

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Vue](https://img.shields.io/badge/Vue-3.4-green)
![Node](https://img.shields.io/badge/Node-18+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ 核心特性

- 🐛 **错误监控** - 自动捕获 JS 错误、Promise 异常、资源加载失败
- ⚡ **性能监控** - 采集 Core Web Vitals (FCP/LCP/FID/CLS/TTFB)
- 🎬 **会话录制** - 基于 rrweb 录制用户操作，完整还原错误现场
- 🗺️ **SourceMap 解析** - 自动还原压缩代码到源码位置
- 📊 **智能聚合** - 相似错误自动归类，避免告警轰炸
- 🔔 **告警通知** - 支持邮件告警，新错误/阈值/激增多种规则
- 🚀 **Web Worker 上报** - 数据处理不阻塞主线程，零性能影响

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- PostgreSQL (推荐使用 [Neon](https://neon.tech) 免费云数据库)

### 1. 克隆项目

```bash
git clone https://github.com/your-username/sentinel-monitor.git
cd sentinel-monitor
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp packages/server/.env.example packages/server/.env.local

# 编辑配置文件
vim packages/server/.env.local
```

必填配置：
```env
# 数据库连接 (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require

# JWT 密钥 (随机字符串)
JWT_SECRET=your-random-secret-key
```

可选配置（邮件告警）：
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=your-email@qq.com
SMTP_PASS=your-smtp-password
SMTP_FROM=your-email@qq.com
```

### 4. 启动服务

```bash
# 方式一：分别启动（推荐开发时使用）
pnpm dev:server          # 后端服务 → http://localhost:3000
pnpm dev:demo            # 演示应用 → http://localhost:5173
pnpm dev:dashboard       # 管理后台 → http://localhost:5174

# 方式二：同时启动所有服务
pnpm dev
```

### 5. 访问应用

| 服务 | 地址 | 说明 |
|------|------|------|
| 演示应用 | http://localhost:5173 | 触发错误、测试 SDK |
| 管理后台 | http://localhost:5174 | 查看监控数据 |
| API 服务 | http://localhost:3000 | 后端接口 |

首次访问管理后台需要注册账号。

## 📦 项目结构

```
sentinel-monitor/
├── packages/
│   ├── sdk/              # 前端监控 SDK
│   ├── server/           # 后端服务 (Express + PostgreSQL)
│   ├── dashboard/        # 管理后台 (Vue 3 + ECharts)
│   ├── demo-app/         # 演示应用
│   ├── plugins/          # Vite/Webpack 插件
│   └── vscode-extension/ # VSCode 扩展
├── docs/                 # 文档
└── README.md
```

## 🔧 SDK 接入

### 安装

```bash
npm install @monitor/sdk
# 或
pnpm add @monitor/sdk
```

### 基础使用

```typescript
import { Monitor } from '@monitor/sdk';

const monitor = Monitor.getInstance();
monitor.init({
  dsn: 'your-project-id',
  reportUrl: 'https://your-server.com/api/report',
  sampleRate: 1,              // 采样率 0-1
  enableSessionReplay: true,  // 启用会话录制
  useWorker: true,            // 使用 Web Worker 上报（默认开启）
});

// 设置用户信息
monitor.setUser({
  id: 'user-123',
  username: 'test',
  email: 'test@example.com'
});

// 手动捕获错误
monitor.captureError(new Error('Something went wrong'));
```

### 配置项

| 配置 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| dsn | string | - | 项目标识（必填） |
| reportUrl | string | - | 上报地址（必填） |
| sampleRate | number | 1 | 全局采样率 0-1 |
| errorSampleRate | number | - | 错误采样率 |
| performanceSampleRate | number | - | 性能采样率 |
| maxBreadcrumbs | number | 20 | 最大行为记录数 |
| batchSize | number | 10 | 批量上报阈值 |
| reportInterval | number | 5000 | 上报间隔(ms) |
| useWorker | boolean | true | 使用 Web Worker |
| enableSessionReplay | boolean | false | 启用会话录制 |
| ignoreErrors | RegExp[] | - | 忽略的错误 |
| ignoreUrls | RegExp[] | - | 忽略的 URL |

## 📊 功能截图

### 监控概览
- 错误趋势图
- 性能指标卡片
- 错误分组列表

### 错误详情
- 完整堆栈信息
- SourceMap 还原
- 用户行为轨迹
- 会话回放

### 性能分析
- Web Vitals 评分
- 资源加载瀑布图
- 长任务分析

### 告警配置
- 新错误告警
- 阈值告警
- 激增告警
- 邮件通知

## 🛠️ 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev              # 启动所有服务
pnpm dev:server       # 仅启动后端
pnpm dev:demo         # 仅启动演示应用
pnpm dev:dashboard    # 仅启动管理后台

# 构建
pnpm build            # 构建所有包
pnpm --filter @monitor/sdk build    # 构建 SDK

# 测试
pnpm test             # 运行测试
pnpm --filter @monitor/sdk test     # 测试 SDK

# 代码检查
pnpm lint             # ESLint 检查
```

## 🏗️ 技术栈

| 模块 | 技术 |
|------|------|
| SDK | TypeScript, Web Worker, rrweb |
| Server | Express, PostgreSQL, Nodemailer |
| Dashboard | Vue 3, Vite, ECharts, TailwindCSS |
| Plugins | Vite Plugin, Webpack Plugin |
| VSCode | VSCode Extension API |

## 📝 更新日志

### v1.0.0 (2024-12)
- ✅ 错误监控 (JS/Promise/资源)
- ✅ 性能监控 (Web Vitals)
- ✅ 会话录制 (rrweb)
- ✅ SourceMap 解析
- ✅ 智能错误聚合
- ✅ 邮件告警系统
- ✅ 错误状态管理
- ✅ Web Worker 上报优化
- ✅ 用户认证 (JWT)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

[MIT](LICENSE)
