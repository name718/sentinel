前端错误与异常监控系统（简化版 Sentry）
主题：前端异常监控 + 性能追踪平台
功能
	•	JS 错误 / Promise / 资源加载失败
	•	用户行为回放（简化）
	•	性能时间线
	•	SourceMap 解析
技术点
	•	SDK 设计
	•	上报策略（节流 / 批量）
	•	Node 服务端
	•	ClickHouse / SQLite


  frontend-monitor/
├── package.json              # 根 package.json (monorepo)
├── pnpm-workspace.yaml       # pnpm workspace 配置
├── tsconfig.json             # TypeScript 基础配置
├── .eslintrc.json            # ESLint 配置
├── .gitignore
├── packages/
│   ├── sdk/                  # 前端 SDK
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── rollup.config.js
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts      # 入口
│   │       ├── types.ts      # 类型定义
│   │       └── core/
│   │           └── monitor.ts # Monitor 核心类
│   └── server/               # Node.js 服务端
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── src/
│           └── index.ts      # Koa 服务入口
└── .kiro/specs/frontend-monitor/
    ├── requirements.md
    ├── design.md
    └── tasks.md
