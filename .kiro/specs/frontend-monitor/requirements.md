

# Requirements Document

## Introduction

前端错误与异常监控系统（简化版 Sentry），用于捕获前端 JS 错误、Promise 异常、资源加载失败，并提供用户行为回放、性能时间线追踪和 SourceMap 解析能力。系统包含客户端 SDK 和服务端两部分。

## Glossary

- **SDK**: 嵌入前端页面的监控脚本，负责数据采集和上报
- **Reporter**: SDK 中负责数据上报的模块
- **Breadcrumb**: 用户行为面包屑，记录用户操作轨迹
- **SourceMap**: JavaScript 源码映射文件，用于将压缩代码还原为源码
- **Server**: Node.js 后端服务，负责接收、存储和查询监控数据
- **Dashboard**: 管理后台，用于展示错误列表和性能数据

## Requirements

### Requirement 1: JS 错误捕获

**User Story:** As a 前端开发者, I want to 自动捕获页面中的 JS 运行时错误, so that 我能及时发现和定位线上问题。

#### Acceptance Criteria

1. WHEN 页面发生 JS 运行时错误 THEN THE SDK SHALL 捕获错误信息并格式化为标准结构
2. WHEN 发生未捕获的 Promise rejection THEN THE SDK SHALL 捕获该异常并记录 reason
3. WHEN 捕获到错误 THEN THE SDK SHALL 提取错误类型、消息、堆栈、发生时间和页面 URL
4. IF 错误堆栈为空 THEN THE SDK SHALL 记录错误发生的上下文信息

### Requirement 2: 资源加载监控

**User Story:** As a 前端开发者, I want to 监控页面资源加载失败情况, so that 我能发现 CDN 或静态资源问题。

#### Acceptance Criteria

1. WHEN JS/CSS/图片等资源加载失败 THEN THE SDK SHALL 捕获失败事件并记录资源 URL
2. WHEN 资源加载失败 THEN THE SDK SHALL 记录资源类型、失败时间和页面 URL
3. THE SDK SHALL 区分不同类型的资源加载失败（script/link/img）

### Requirement 3: 数据上报

**User Story:** As a 系统架构师, I want to 实现高效的数据上报策略, so that 监控数据能可靠传输且不影响页面性能。

#### Acceptance Criteria

1. THE Reporter SHALL 支持批量上报，将多条数据合并为一次请求
2. WHEN 数据量达到阈值或超过时间间隔 THEN THE Reporter SHALL 触发上报
3. THE Reporter SHALL 实现节流控制，限制单位时间内的上报频率
4. WHEN 网络不可用 THEN THE Reporter SHALL 将数据缓存到本地存储
5. WHEN 网络恢复 THEN THE Reporter SHALL 重新发送缓存的数据
6. THE Reporter SHALL 使用 sendBeacon API 在页面卸载时发送数据

### Requirement 4: 用户行为追踪

**User Story:** As a 前端开发者, I want to 记录用户操作轨迹, so that 我能还原错误发生前的用户行为。

#### Acceptance Criteria

1. THE SDK SHALL 记录用户点击事件，包含元素标识和时间戳
2. THE SDK SHALL 记录路由变化事件
3. THE SDK SHALL 记录控制台输出（console.log/warn/error）
4. THE SDK SHALL 记录网络请求（XHR/Fetch）的 URL、状态码和耗时
5. WHEN 错误发生 THEN THE SDK SHALL 关联最近 N 条行为记录作为 breadcrumbs
6. THE Breadcrumb SHALL 限制最大条数，采用先进先出策略

### Requirement 5: 性能监控

**User Story:** As a 前端开发者, I want to 采集页面性能指标, so that 我能监控和优化页面加载性能。

#### Acceptance Criteria

1. THE SDK SHALL 采集 FP（First Paint）时间
2. THE SDK SHALL 采集 FCP（First Contentful Paint）时间
3. THE SDK SHALL 采集 LCP（Largest Contentful Paint）时间
4. THE SDK SHALL 采集 TTFB（Time To First Byte）时间
5. THE SDK SHALL 采集 DOM Ready 和 Load 完成时间
6. THE SDK SHALL 监控长任务（Long Task），记录超过 50ms 的任务

### Requirement 6: SourceMap 解析

**User Story:** As a 前端开发者, I want to 将压缩后的错误堆栈还原为源码位置, so that 我能快速定位问题代码。

#### Acceptance Criteria

1. THE Server SHALL 提供 SourceMap 文件上传接口
2. THE Server SHALL 存储 SourceMap 文件并关联版本号
3. WHEN 查询错误详情 THEN THE Server SHALL 使用 SourceMap 解析堆栈
4. THE Server SHALL 返回解析后的源码文件名、行号和列号
5. IF SourceMap 不存在 THEN THE Server SHALL 返回原始堆栈信息

### Requirement 7: 服务端数据存储

**User Story:** As a 系统架构师, I want to 可靠存储监控数据, so that 数据能被查询和分析。

#### Acceptance Criteria

1. THE Server SHALL 提供 /report 接口接收 SDK 上报的数据
2. THE Server SHALL 验证上报数据的格式和必填字段
3. THE Server SHALL 将数据存储到 SQLite 数据库
4. THE Server SHALL 支持按项目 ID 隔离数据
5. THE Server SHALL 对相似错误进行聚合，避免重复存储

### Requirement 8: 数据查询接口

**User Story:** As a 前端开发者, I want to 查询和筛选监控数据, so that 我能分析错误趋势和性能状况。

#### Acceptance Criteria

1. THE Server SHALL 提供错误列表查询接口，支持分页
2. THE Server SHALL 支持按时间范围、错误类型筛选
3. THE Server SHALL 提供错误详情接口，包含 breadcrumbs 和解析后的堆栈
4. THE Server SHALL 提供性能数据统计接口
5. THE Server SHALL 提供错误趋势统计接口（按小时/天聚合）

### Requirement 9: SDK 初始化配置

**User Story:** As a 前端开发者, I want to 灵活配置 SDK 行为, so that 我能根据项目需求调整监控策略。

#### Acceptance Criteria

1. THE SDK SHALL 提供 init() 方法进行初始化
2. THE SDK SHALL 支持配置项目 ID（dsn）
3. THE SDK SHALL 支持配置上报地址
4. THE SDK SHALL 支持配置采样率（0-1）
5. THE SDK SHALL 支持配置是否启用各类监控（错误/性能/行为）
6. THE SDK SHALL 支持配置 breadcrumb 最大条数
7. IF 未调用 init() THEN THE SDK SHALL 不进行任何数据采集
