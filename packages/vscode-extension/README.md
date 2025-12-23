# Frontend Monitor - VS Code 插件

在 VS Code 中实时查看前端错误，一键跳转到错误代码位置。

## 功能特性

- 🐛 **错误列表** - 侧边栏显示项目的所有错误
- 📍 **一键跳转** - 点击错误直接打开文件并定位到错误行
- 🎨 **内联标记** - 在代码中显示错误标记和次数
- 🔄 **自动刷新** - 定时同步最新错误数据
- 📊 **统计概览** - 显示错误总数、分组数、影响页面数

## 安装

### 从 VSIX 安装

1. 下载 `.vsix` 文件
2. 在 VS Code 中按 `Ctrl+Shift+P`
3. 输入 `Install from VSIX`
4. 选择下载的文件

### 从源码安装

```bash
cd packages/vscode-extension
npm install
npm run compile
npm run package
```

## 配置

首次使用需要配置监控服务器：

1. 点击侧边栏的 Monitor 图标
2. 点击 "配置服务器" 或使用命令 `Monitor: 配置监控服务器`
3. 输入服务器地址（如 `http://localhost:3000`）
4. 输入项目 DSN（如 `my-app`）

### 配置项

在 `settings.json` 中配置：

```json
{
  "monitor.serverUrl": "http://localhost:3000",
  "monitor.dsn": "my-app",
  "monitor.autoRefresh": true,
  "monitor.refreshInterval": 30,
  "monitor.showInlineDecorations": true,
  "monitor.pathMapping": {
    "src/": "src/"
  }
}
```

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `serverUrl` | 监控服务器地址 | `http://localhost:3000` |
| `dsn` | 项目标识符 | `""` |
| `autoRefresh` | 自动刷新 | `true` |
| `refreshInterval` | 刷新间隔（秒） | `30` |
| `showInlineDecorations` | 显示内联标记 | `true` |
| `pathMapping` | 路径映射 | `{}` |

## 使用方法

### 查看错误列表

1. 点击侧边栏的 Monitor 图标
2. 在 "错误列表" 面板查看所有错误
3. 悬停查看错误详情

### 跳转到错误位置

1. 在错误列表中点击某个错误
2. 插件自动打开对应文件
3. 光标定位到错误行，并高亮显示

### 查看内联标记

当打开的文件中有错误时，会在对应行显示：
- 红色背景高亮
- 行尾显示错误信息和次数
- 悬停显示详细信息

### 路径映射

如果本地路径与错误中的路径不一致，配置路径映射：

```json
{
  "monitor.pathMapping": {
    "src/": "packages/my-app/src/",
    "components/": "src/components/"
  }
}
```

## 命令

| 命令 | 说明 |
|------|------|
| `Monitor: 刷新错误列表` | 手动刷新数据 |
| `Monitor: 配置监控服务器` | 配置服务器连接 |
| `Monitor: 打开 Dashboard` | 在浏览器打开 Dashboard |

## 状态栏

状态栏显示当前错误数量：
- `🐛 5` - 有 5 个错误
- `✓ 0` - 暂无错误

点击状态栏可刷新数据。

## 截图

### 错误列表
```
┌─────────────────────────────────────┐
│ 🐛 FRONTEND MONITOR                 │
├─────────────────────────────────────┤
│ ▼ 错误列表                          │
│   🐛 Cannot read property 'x'...    │
│      5 分钟前                        │
│   🐛 TypeError: undefined is...     │
│      1 小时前                        │
│   ⚠️ Unhandled Promise rejection    │
│      2 小时前                        │
├─────────────────────────────────────┤
│ ▼ 统计概览                          │
│   ✅ 已连接                          │
│   🐛 15 错误总数（24h）              │
│   📁 5 错误分组                      │
│   📄 3 影响页面                      │
└─────────────────────────────────────┘
```

### 内联标记
```typescript
// src/utils/helper.ts
function handleClick() {
  const data = undefined;
  console.log(data.value);  // 🐛 TypeError: Cannot read property 'value'... (15次)
}
```

## 开发

```bash
# 安装依赖
npm install

# 编译
npm run compile

# 监听模式
npm run watch

# 打包
npm run package
```

## License

MIT
