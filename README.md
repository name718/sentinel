# �️ Setntinel 前端监控平台

> 一站式前端应用监控解决方案，帮助开发团队快速发现、定位和解决线上问题。

🌐 **官网**: [https://sentinel-website-murex.vercel.app](https://sentinel-website-murex.vercel.app)  
📊 **在线演示**: [https://sentinel-dashboard-tau.vercel.app](https://sentinel-dashboard-tau.vercel.app)

![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Vue](https://img.shields.io/badge/Vue-3.4-green)
![Node](https://img.shields.io/badge/Node-18+-green)
![License](https://img.shields.io/badge/License-AGPL--3.0-red)

## ✨ 核心特性

- 🐛 **错误监控** - 自动捕获 JS 错误、Promise 异常、资源加载失败
- ⚡ **性能监控** - 采集 Core Web Vitals (FCP/LCP/FID/CLS/TTFB)
- 🎬 **会话录制** - 基于 rrweb 录制用户操作，完整还原错误现场
- 🗺️ **SourceMap 解析** - 自动还原压缩代码到源码位置
- 📊 **智能聚合** - 相似错误自动归类，避免告警轰炸
- 🔔 **告警通知** - 支持邮件告警，新错误/阈值/激增多种规则
- 🚀 **Web Worker 上报** - 数据处理不阻塞主线程，零性能影响
- 🔐 **企业级安全** - JWT 认证、邮箱验证码、登录失败限制

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8
- PostgreSQL (推荐使用 [Neon](https://neon.tech) 免费云数据库)

### 1. 克隆项目

```bash
git clone https://github.com/name718/sentinel.git
cd sentinel
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
cp packages/server/.env.example packages/server/.env.local
```

必填配置：
```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
JWT_SECRET=your-random-secret-key
```

可选配置（邮件告警）：
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=your-email@qq.com
SMTP_PASS=your-smtp-password
```

### 4. 启动服务

```bash
pnpm dev
```

| 服务 | 地址 |
|------|------|
| 演示应用 | http://localhost:5173 |
| 管理后台 | http://localhost:5174 |
| API 服务 | http://localhost:3000 |

## 📦 项目结构

```
sentinel/
├── packages/
│   ├── sdk/              # 前端监控 SDK (@majuntao-1/sentinel-sdk)
│   ├── server/           # 后端服务 (Express + PostgreSQL)
│   ├── dashboard/        # 管理后台 (Vue 3 + ECharts)
│   ├── website/          # 官网
│   ├── demo-app/         # 演示应用
│   ├── plugins/          # Vite/Webpack 插件
│   └── vscode-extension/ # VSCode 扩展
└── README.md
```

## 🔧 SDK 接入

### 安装

```bash
npm install @majuntao-1/sentinel-sdk
```

### 使用

```typescript
import { Monitor } from '@majuntao-1/sentinel-sdk';

const monitor = Monitor.getInstance();
monitor.init({
  dsn: 'your-project-dsn',
  reportUrl: 'https://your-server.com/api/report',
  enableSessionReplay: true,
});
```

详细文档请访问 [SDK README](packages/sdk/README.md)

## 🏗️ 技术栈

| 模块 | 技术 |
|------|------|
| SDK | TypeScript, Web Worker, rrweb |
| Server | Express, PostgreSQL, JWT, Nodemailer |
| Dashboard | Vue 3, Vite, ECharts |
| Website | Vue 3, Vite |

## 📄 License

本项目采用 [AGPL-3.0](LICENSE) 协议，附加商业使用限制。

**⚠️ 重要提示：**
- ✅ 允许个人学习、研究使用
- ✅ 允许非商业项目使用（需保留署名）
- ❌ **禁止商业用途**（包括但不限于：出售、作为付费服务、用于盈利）
- ❌ 禁止去除版权声明

如需商业授权，请联系项目维护者。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

Made with ❤️ by Sentinel Team
