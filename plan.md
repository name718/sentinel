# 前端监控平台 - 企业级功能规划

## 当前已完成功能

### SDK
- ✅ 错误捕获（JS 错误、Promise rejection、资源加载失败）
- ✅ 性能监控（FP、FCP、LCP、TTFB、DOM Ready、Load）
- ✅ 用户行为追踪（点击、路由、网络请求、控制台）
- ✅ 会话录制（rrweb 风格）
- ✅ 采样率控制
- ✅ 用户标识 & 自定义上下文
- ✅ 白名单/黑名单过滤
- ✅ 批量上报 & 离线缓存

### Server
- ✅ 错误接收 & 存储
- ✅ 性能数据接收
- ✅ SourceMap 上传 & 解析
- ✅ 错误聚合（指纹识别）

### Dashboard
- ✅ 错误列表 & 详情
- ✅ 错误趋势图表
- ✅ 时间范围筛选
- ✅ 搜索和过滤
- ✅ 会话回放播放器
- ✅ Session 对比
- ✅ 资源瀑布图
- ✅ 长任务分析
- ✅ Core Web Vitals 评分

### 工具链
- ✅ Vite/Webpack SourceMap 上传插件
- ✅ VSCode 扩展（错误跳转、统计展示）

---

## 企业级功能规划

### 🔴 P0 - 核心必备（1-2 周）

#### 1. 用户认证 & 权限系统

##### Phase 1: 数据库 & 基础设施
- [ ] 1.1 创建 users 表
  - 字段: id, email, password_hash, name, role, created_at, updated_at
  - 测试: 表创建成功、CRUD 操作正常
- [ ] 1.2 密码加密服务 (bcrypt)
  - hash(password) 加密
  - verify(password, hash) 验证
  - 测试: 加密/验证函数正确工作
- [ ] 1.3 JWT 服务
  - sign(payload) 生成 token
  - verify(token) 验证 token
  - 配置: JWT_SECRET 环境变量
  - 测试: token 生成/验证/过期处理

##### Phase 2: 后端 API
- [ ] 1.4 注册接口 `POST /api/auth/register`
  - 入参: email, password, name
  - 验证: 邮箱格式、密码强度(≥8位)、邮箱唯一性
  - 返回: { user, token }
  - 测试: 正常注册、重复邮箱、无效输入
- [ ] 1.5 登录接口 `POST /api/auth/login`
  - 入参: email, password
  - 验证: 邮箱密码匹配
  - 返回: { user, token }
  - 测试: 正确登录、错误密码、不存在用户
- [ ] 1.6 获取当前用户 `GET /api/auth/me`
  - 需要: Authorization: Bearer <token>
  - 返回: { user } (不含密码)
  - 测试: 有效token、无效token、无token
- [ ] 1.7 认证中间件 authMiddleware
  - 解析 Authorization header
  - 验证 JWT 并注入 req.user
  - 测试: 保护路由正确拦截未认证请求

##### Phase 3: 前端
- [ ] 1.8 Token 存储 & 请求拦截
  - localStorage 存储 token
  - axios/fetch 拦截器自动添加 header
  - 测试: token 持久化、自动附加
- [ ] 1.9 登录页面 `/login`
  - 邮箱密码表单 + 验证
  - 调用登录 API
  - 成功后跳转 dashboard
  - 测试: 表单验证、登录流程
- [ ] 1.10 注册页面 `/register`
  - 邮箱、密码、确认密码表单
  - 调用注册 API
  - 成功后跳转 dashboard
  - 测试: 表单验证、注册流程
- [ ] 1.11 路由守卫
  - 未登录 → 重定向 /login
  - 已登录访问 /login → 重定向 /dashboard
  - 测试: 路由保护正确工作
- [ ] 1.12 用户状态管理 (useAuth composable)
  - 全局用户状态
  - 登出功能 (清除 token)
  - 测试: 状态正确更新

##### Phase 4: 角色权限 (后续)
- [ ] 角色权限（管理员、开发者、只读）
- [ ] OAuth 集成（GitHub、GitLab、企业 SSO）
- [ ] API Token 管理

**实现顺序**: 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8 → 1.9 → 1.10 → 1.11 → 1.12

#### 2. 多项目/多租户支持
- [ ] 项目 CRUD
- [ ] 项目成员管理
- [ ] 独立 DSN 生成
- [ ] 数据隔离

#### 3. 告警系统
- [ ] 告警规则配置（阈值、新错误、错误激增）
- [ ] 通知渠道（邮件、钉钉、飞书、Slack、Webhook）
- [ ] 告警静默 & 升级策略
- [ ] 告警历史记录

---

### 🟠 P1 - 重要功能（2-4 周）

#### 4. 数据存储升级
- [ ] SQLite → PostgreSQL/MySQL（生产环境）
- [ ] 时序数据存储（ClickHouse/TimescaleDB）
- [ ] 数据归档策略（冷热分离）
- [ ] 数据保留策略配置

#### 5. 错误处理增强
- [ ] 错误状态管理（未处理/处理中/已解决/忽略）
- [ ] 错误指派（分配给团队成员）
- [ ] 错误评论 & 协作
- [ ] Issue 集成（Jira、GitLab、GitHub Issues）

#### 6. 发布版本关联
- [ ] 版本管理（手动/自动识别）
- [ ] 发布后错误监控
- [ ] 版本间错误对比
- [ ] 回归检测（新版本引入的错误）

#### 7. API 完善
- [ ] RESTful API 文档（OpenAPI/Swagger）
- [ ] GraphQL 支持（可选）
- [ ] API 限流 & 配额
- [ ] SDK 版本兼容性

---

### 🟡 P2 - 增强功能（1-2 月）

#### 8. 被动体验监控（实时感知）

##### 8.1 网络质量监控
- [x] 网络类型检测（WiFi/4G/3G/离线）- `navigator.connection`
- [x] 网络变化监听（在线/离线切换、网络降级）
- [x] 请求耗时分布（慢请求自动标记 > 3s）
- [x] 请求失败率统计
- [x] 带宽估算（通过资源下载速度推算）

##### 8.2 页面卡顿检测
- [ ] 长任务监控（Long Tasks API，> 50ms）- 已有基础
- [ ] 主线程阻塞时间（TBT - Total Blocking Time）
- [ ] 交互延迟检测（INP - Interaction to Next Paint）
- [ ] 输入响应延迟（点击/输入后多久响应）
- [ ] 卡顿时的调用栈采样

##### 8.3 帧率监控（FPS）
- [ ] 实时帧率采集（requestAnimationFrame）
- [ ] 掉帧检测（FPS < 30 持续 N 帧）
- [ ] 动画流畅度评分
- [ ] 掉帧时的页面状态快照
- [ ] 滚动流畅度检测

##### 8.4 内存监控
- [ ] JS Heap 使用量（`performance.memory`）
- [ ] 内存泄漏检测（持续增长告警）
- [ ] DOM 节点数量监控
- [ ] 内存压力事件

##### 8.5 页面可见性 & 生命周期
- [ ] 页面可见性变化（`visibilitychange`）
- [ ] 页面冻结/恢复（`freeze`/`resume`）
- [ ] 后台时长统计
- [ ] 页面卸载原因

##### 8.6 用户体验评分
- [ ] 综合体验分数（基于以上指标加权）
- [ ] 体验等级（优秀/良好/一般/差）
- [ ] 体验趋势对比
- [ ] 按设备/网络/地域分析

#### 9. 高级分析
- [ ] 错误影响分析（受影响用户数、页面数）
- [ ] 错误根因分析（关联错误链）
- [ ] 错误热区分析（出错前点击最多的区域）
- [ ] 用户旅程分析

#### 10. 性能分析深化
- [ ] 页面性能排行
- [ ] 性能基线 & 预算
- [ ] 性能退化告警
- [ ] 地域/设备/浏览器维度分析

#### 11. Dashboard 增强
- [ ] 自定义仪表盘
- [ ] 数据导出（CSV、PDF 报告）
- [ ] 定时报告（日报、周报）
- [ ] 多语言支持（i18n）
- [x] 深色/浅色主题切换

#### 12. SDK 增强
- [ ] 小程序 SDK（微信、支付宝）
- [ ] React Native / Flutter 支持
- [ ] Node.js 后端 SDK
- [ ] 自动 PII 脱敏

---

### 🟢 P3 - 高级功能（3-6 月）

#### 13. 智能分析
- [ ] AI 错误分类
- [ ] 智能告警（异常检测）
- [ ] 错误趋势预测
- [ ] 自动修复建议

#### 14. 可观测性集成
- [ ] OpenTelemetry 支持
- [ ] 分布式追踪关联
- [ ] 日志关联
- [ ] APM 集成

#### 15. 企业级运维
- [ ] 高可用部署方案
- [ ] 水平扩展支持
- [ ] 监控系统自身的监控
- [ ] 灾备方案

#### 16. 商业化支持
- [ ] 多租户 SaaS 架构
- [ ] 计费系统（按量/按项目）
- [ ] 私有化部署包
- [ ] 企业级 SLA

---

## 技术债务 & 优化

### 代码质量
- [ ] 单元测试覆盖率 > 80%
- [ ] E2E 测试
- [ ] CI/CD 流水线完善
- [ ] 代码规范 & Lint 规则

### 性能优化
- [ ] Dashboard 虚拟滚动（大数据量）
- [ ] 数据查询优化（索引、缓存）
- [ ] SDK 体积优化（Tree Shaking）
- [ ] 上报压缩（gzip）

### 文档完善
- [ ] SDK 接入文档
- [ ] API 文档
- [ ] 部署文档
- [ ] 最佳实践指南

---

## 推荐实施顺序

```
第 1-2 周: 用户认证 + 多项目支持（P0 核心）
第 3-4 周: 告警系统 + 错误状态管理（P0/P1）
第 5-6 周: 数据库升级 + 发布版本关联（P1）
第 7-8 周: API 完善 + 文档（P1）
第 2-3 月: 高级分析 + Dashboard 增强（P2）
第 4-6 月: 智能分析 + 企业级运维（P3）
```

---

## 架构演进建议

### 当前架构
```
SDK → Express Server (SQLite) → Vue Dashboard
```

### 目标架构
```
SDK → API Gateway → 微服务集群 → 时序数据库 + 关系数据库
                  ↓
            消息队列（Kafka/RabbitMQ）
                  ↓
            告警服务 / 分析服务 / 报告服务
```

### 关键技术选型建议
| 组件 | 推荐方案 |
|------|----------|
| 关系数据库 | PostgreSQL |
| 时序数据库 | ClickHouse / TimescaleDB |
| 缓存 | Redis |
| 消息队列 | Kafka / RabbitMQ |
| 搜索 | Elasticsearch |
| 认证 | Keycloak / Auth0 |
| 容器化 | Docker + Kubernetes |
