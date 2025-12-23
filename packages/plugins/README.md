# @monitor/plugins

Vite & Webpack 插件，用于在构建时自动上传 SourceMap 到监控服务器。

## 功能特性

- ✅ 支持 Vite 4.x+ 和 Webpack 5.x+
- ✅ 构建完成后自动上传 SourceMap
- ✅ 上传后自动删除本地 SourceMap（可配置）
- ✅ 支持并发上传，提高效率
- ✅ 完整的 TypeScript 类型支持
- ✅ 详细的日志输出
- ✅ 灵活的文件过滤规则

## 安装

```bash
# pnpm
pnpm add @monitor/plugins -D

# npm
npm install @monitor/plugins -D

# yarn
yarn add @monitor/plugins -D
```

## Vite 使用

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { viteSourceMapUploader } from '@monitor/plugins/vite';

export default defineConfig({
  build: {
    sourcemap: true, // 必须开启！
  },
  plugins: [
    vue(),
    viteSourceMapUploader({
      serverUrl: 'http://localhost:3000',
      dsn: 'my-app',
      version: process.env.npm_package_version || '1.0.0',
    }),
  ],
});
```

## Webpack 使用

```js
// webpack.config.js
const { WebpackSourceMapUploader } = require('@monitor/plugins/webpack');

module.exports = {
  devtool: 'source-map', // 必须开启！
  plugins: [
    new WebpackSourceMapUploader({
      serverUrl: 'http://localhost:3000',
      dsn: 'my-app',
      version: process.env.npm_package_version || '1.0.0',
    }),
  ],
};
```

## 配置选项

| 选项 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `serverUrl` | `string` | ✅ | - | 监控服务器地址 |
| `dsn` | `string` | ✅ | - | 项目标识符 |
| `version` | `string \| () => string` | ✅ | - | 版本号 |
| `deleteAfterUpload` | `boolean` | ❌ | `true` | 上传后删除本地文件 |
| `enabled` | `boolean` | ❌ | `true` | 是否启用插件 |
| `timeout` | `number` | ❌ | `30000` | 上传超时时间（毫秒） |
| `verbose` | `boolean` | ❌ | `false` | 显示详细日志 |
| `headers` | `Record<string, string>` | ❌ | - | 自定义请求头 |
| `include` | `RegExp \| Function` | ❌ | - | 文件包含规则 |
| `exclude` | `RegExp \| Function` | ❌ | - | 文件排除规则 |
| `onSuccess` | `Function` | ❌ | - | 上传成功回调 |
| `onError` | `Function` | ❌ | - | 上传失败回调 |

## 高级配置

### 动态版本号

```ts
viteSourceMapUploader({
  serverUrl: 'http://localhost:3000',
  dsn: 'my-app',
  // 使用 Git commit hash 作为版本号
  version: () => {
    const { execSync } = require('child_process');
    return execSync('git rev-parse --short HEAD').toString().trim();
  },
});
```

### 文件过滤

```ts
viteSourceMapUploader({
  serverUrl: 'http://localhost:3000',
  dsn: 'my-app',
  version: '1.0.0',
  // 只上传 vendor 相关的 SourceMap
  include: /vendor.*\.map$/,
  // 排除 node_modules 相关的
  exclude: (filename) => filename.includes('node_modules'),
});
```

### 自定义请求头

```ts
viteSourceMapUploader({
  serverUrl: 'http://localhost:3000',
  dsn: 'my-app',
  version: '1.0.0',
  headers: {
    'Authorization': 'Bearer your-token',
    'X-Custom-Header': 'value',
  },
});
```

### 回调函数

```ts
viteSourceMapUploader({
  serverUrl: 'http://localhost:3000',
  dsn: 'my-app',
  version: '1.0.0',
  onSuccess: (files) => {
    console.log('上传成功:', files.map(f => f.filename));
    // 可以在这里发送通知
  },
  onError: (error, files) => {
    console.error('上传失败:', error.message);
    console.error('失败文件:', files);
    // 可以在这里发送告警
  },
});
```

### 环境区分

```ts
viteSourceMapUploader({
  serverUrl: process.env.MONITOR_SERVER_URL || 'http://localhost:3000',
  dsn: 'my-app',
  version: process.env.npm_package_version || '1.0.0',
  // 只在生产构建时启用
  enabled: process.env.NODE_ENV === 'production',
  // 生产环境删除 SourceMap，开发环境保留
  deleteAfterUpload: process.env.NODE_ENV === 'production',
});
```

## 工作原理

1. **构建阶段**：Vite/Webpack 正常构建，生成 SourceMap 文件
2. **收集阶段**：插件扫描输出目录，收集所有 `.map` 文件
3. **上传阶段**：并发上传到监控服务器（最多 5 个并发）
4. **清理阶段**：上传成功后删除本地 SourceMap 文件（可选）

## 服务端 API

插件会调用以下 API 上传 SourceMap：

```
POST /api/sourcemap
Content-Type: multipart/form-data

Fields:
- dsn: 项目标识符
- version: 版本号
- file: SourceMap 文件
```

## 常见问题

### Q: 为什么要删除本地 SourceMap？

A: SourceMap 包含源代码信息，如果部署到生产环境可能会泄露源码。上传到监控服务器后删除本地文件，既能保证错误追踪功能，又能保护源码安全。

### Q: 如何保留本地 SourceMap？

A: 设置 `deleteAfterUpload: false`

### Q: 上传失败会影响构建吗？

A: 不会。上传失败只会输出警告日志，不会中断构建流程。

### Q: 支持 hidden-source-map 吗？

A: 支持。只要生成了 `.map` 文件，插件就能上传。

## License

MIT
