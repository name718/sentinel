# Implementation Plan: 前端监控系统

## Overview

采用 monorepo 结构，分阶段实现 SDK 和 Server。先搭建基础框架，再逐步实现各监控模块，最后完成数据查询和 SourceMap 解析。

## Tasks

- [ ] 1. 项目初始化和基础框架
  - [ ] 1.1 创建 monorepo 项目结构
    - 创建 packages/sdk 和 packages/server 目录
    - 配置 pnpm workspace
    - 配置 TypeScript、ESLint
    - _Requirements: 项目基础设施_

  - [ ] 1.2 SDK 核心框架搭建
    - 创建 Monitor 类和 init() 方法
    - 定义 MonitorConfig 接口
    - 实现配置校验逻辑
    - _Requirements: 9.1, 9.2, 9.3, 9.7_

  - [ ]* 1.3 编写 SDK 初始化属性测试
    - **Property 14: 未初始化不采集**
    - **Validates: Requirements 9.7**

- [ ] 2. 数据上报模块
  - [ ] 2.1 实现 Reporter 基础类
    - 实现数据队列管理
    - 实现 push() 和 flush() 方法
    - 实现 HTTP 发送逻辑
    - _Requirements: 3.1_

  - [ ] 2.2 实现批量上报和节流
    - 实现数据量阈值触发
    - 实现时间间隔触发
    - 实现节流控制
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ]* 2.3 编写批量上报属性测试
    - **Property 3: 批量上报合并**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 2.4 编写节流控制属性测试
    - **Property 4: 节流控制有效性**
    - **Validates: Requirements 3.3**

  - [ ] 2.5 实现离线缓存
    - 实现网络状态检测
    - 实现 IndexedDB/localStorage 缓存
    - 实现网络恢复后重传
    - 实现 sendBeacon 页面卸载上报
    - _Requirements: 3.4, 3.5, 3.6_

  - [ ]* 2.6 编写离线缓存属性测试
    - **Property 5: 离线缓存 Round-Trip**
    - **Validates: Requirements 3.4, 3.5**

- [ ] 3. Checkpoint - 上报模块完成
  - 确保所有测试通过，如有问题请提出

- [ ] 4. 错误捕获模块
  - [ ] 4.1 实现 ErrorCatcher 类
    - 实现 window.onerror 监听
    - 实现 unhandledrejection 监听
    - 实现错误数据格式化
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 4.2 编写错误捕获属性测试
    - **Property 1: 错误数据结构完整性**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [ ] 4.3 实现 ResourceMonitor 类
    - 监听资源加载 error 事件
    - 识别资源类型（script/link/img）
    - 格式化资源错误数据
    - _Requirements: 2.1, 2.2, 2.3_

  - [ ]* 4.4 编写资源监控属性测试
    - **Property 2: 资源错误类型识别**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [ ] 5. 用户行为追踪模块
  - [ ] 5.1 实现 Breadcrumb 管理
    - 实现 breadcrumbs 数组管理
    - 实现先进先出策略
    - 实现最大条数限制
    - _Requirements: 4.5, 4.6, 9.6_

  - [ ]* 5.2 编写 Breadcrumb 属性测试
    - **Property 6: Breadcrumb 先进先出**
    - **Validates: Requirements 4.5, 4.6**

  - [ ] 5.3 实现 BehaviorTracker 类
    - 实现点击事件追踪
    - 实现路由变化追踪
    - 实现 console 拦截
    - 实现 XHR/Fetch 拦截
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 5.4 编写错误关联 Breadcrumbs 属性测试
    - **Property 7: 错误关联 Breadcrumbs**
    - **Validates: Requirements 4.5**

- [ ] 6. 性能监控模块
  - [ ] 6.1 实现 PerformanceMonitor 类
    - 采集 FP/FCP/LCP/TTFB
    - 采集 DOM Ready 和 Load 时间
    - 实现 Long Task 监控
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 7. Checkpoint - SDK 核心完成
  - 确保所有测试通过，如有问题请提出

- [ ] 8. Server 基础框架
  - [ ] 8.1 创建 Koa 服务框架
    - 配置路由、中间件
    - 配置 CORS、body-parser
    - _Requirements: 服务端基础设施_

  - [ ] 8.2 初始化 SQLite 数据库
    - 创建 errors、performance、sourcemaps 表
    - 创建索引
    - _Requirements: 7.3_

  - [ ] 8.3 实现 /api/report 接口
    - 实现数据接收和校验
    - 实现数据存储
    - 实现错误聚合（fingerprint）
    - _Requirements: 7.1, 7.2, 7.5_

  - [ ]* 8.4 编写数据校验属性测试
    - **Property 12: 上报数据验证**
    - **Validates: Requirements 7.2**

  - [ ]* 8.5 编写数据存储属性测试
    - **Property 9: 数据存储 Round-Trip**
    - **Validates: Requirements 7.3**

  - [ ]* 8.6 编写项目隔离属性测试
    - **Property 10: 项目数据隔离**
    - **Validates: Requirements 7.4**

  - [ ]* 8.7 编写错误聚合属性测试
    - **Property 11: 错误聚合**
    - **Validates: Requirements 7.5**

- [ ] 9. 数据查询接口
  - [ ] 9.1 实现错误查询接口
    - GET /api/errors 列表查询
    - GET /api/errors/:id 详情查询
    - 支持时间范围、类型筛选、分页
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 9.2 实现性能统计接口
    - GET /api/performance 统计数据
    - 实现错误趋势统计
    - _Requirements: 8.4, 8.5_

- [ ] 10. SourceMap 解析
  - [ ] 10.1 实现 SourceMap 上传接口
    - POST /api/sourcemap 文件上传
    - 存储并关联版本号
    - _Requirements: 6.1, 6.2_

  - [ ] 10.2 实现堆栈解析服务
    - 使用 source-map 库解析
    - 在错误详情接口中返回解析结果
    - _Requirements: 6.3, 6.4, 6.5_

  - [ ]* 10.3 编写 SourceMap 解析属性测试
    - **Property 8: SourceMap 解析 Round-Trip**
    - **Validates: Requirements 6.3, 6.4**

- [ ] 11. SDK 打包和发布
  - [ ] 11.1 配置 Rollup 打包
    - 输出 UMD/ESM 格式
    - 配置 Tree-shaking
    - 生成类型声明文件
    - _Requirements: SDK 发布_

- [ ] 12. Final Checkpoint
  - 确保所有测试通过，如有问题请提出

## Notes

- 标记 `*` 的任务为可选的属性测试任务
- 每个 Checkpoint 用于验证阶段性成果
- 属性测试使用 fast-check 库，每个测试至少 100 次迭代
- 优先实现核心功能，测试可根据时间灵活调整
