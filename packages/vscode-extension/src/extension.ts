/**
 * Frontend Monitor VS Code 插件
 * 
 * 功能：
 * 1. 侧边栏显示错误列表
 * 2. 一键跳转到错误代码位置
 * 3. 代码内联显示错误标记
 * 4. 自动刷新错误数据
 */
import * as vscode from 'vscode';
import { MonitorAPI } from './api';
import { ErrorTreeProvider } from './errorTreeProvider';
import { StatsTreeProvider } from './statsTreeProvider';
import { ErrorDecorationProvider } from './decorations';
import { FileOpener } from './fileOpener';
import type { MonitorConfig, MonitorError } from './types';

let api: MonitorAPI;
let errorTreeProvider: ErrorTreeProvider;
let statsTreeProvider: StatsTreeProvider;
let decorationProvider: ErrorDecorationProvider;
let fileOpener: FileOpener;
let refreshTimer: NodeJS.Timeout | undefined;
let statusBarItem: vscode.StatusBarItem;

/**
 * 获取配置
 */
function getConfig(): MonitorConfig {
  const config = vscode.workspace.getConfiguration('monitor');
  return {
    serverUrl: config.get('serverUrl', 'http://localhost:3000'),
    dsn: config.get('dsn', ''),
    autoRefresh: config.get('autoRefresh', true),
    refreshInterval: config.get('refreshInterval', 30),
    pathMapping: config.get('pathMapping', {}),
    showInlineDecorations: config.get('showInlineDecorations', true),
  };
}

/**
 * 刷新数据
 */
async function refreshData() {
  const config = getConfig();
  
  if (!config.dsn) {
    statsTreeProvider.setConnected(false);
    return;
  }

  try {
    await Promise.all([
      errorTreeProvider.loadErrors(),
      statsTreeProvider.loadStats(),
    ]);

    // 更新装饰
    const errors = await api.getErrors({ limit: 100 });
    decorationProvider.setErrors(errors);

    // 更新状态栏
    updateStatusBar(errors.length);
  } catch (error) {
    console.error('Refresh failed:', error);
    statsTreeProvider.setConnected(false);
  }
}

/**
 * 更新状态栏
 */
function updateStatusBar(errorCount: number) {
  if (errorCount > 0) {
    statusBarItem.text = `$(bug) ${errorCount}`;
    statusBarItem.tooltip = `${errorCount} 个错误（24h）`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  } else {
    statusBarItem.text = `$(check) 0`;
    statusBarItem.tooltip = '暂无错误';
    statusBarItem.backgroundColor = undefined;
  }
  statusBarItem.show();
}

/**
 * 启动自动刷新
 */
function startAutoRefresh() {
  stopAutoRefresh();
  
  const config = getConfig();
  if (config.autoRefresh && config.dsn) {
    refreshTimer = setInterval(refreshData, config.refreshInterval * 1000);
  }
}

/**
 * 停止自动刷新
 */
function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
}

/**
 * 配置服务器
 */
async function configureServer() {
  const config = getConfig();

  // 输入服务器地址
  const serverUrl = await vscode.window.showInputBox({
    prompt: '监控服务器地址',
    value: config.serverUrl,
    placeHolder: 'http://localhost:3000',
  });

  if (serverUrl === undefined) return;

  // 输入 DSN
  const dsn = await vscode.window.showInputBox({
    prompt: '项目标识符 (DSN)',
    value: config.dsn,
    placeHolder: 'my-app',
  });

  if (dsn === undefined) return;

  // 保存配置
  const workspaceConfig = vscode.workspace.getConfiguration('monitor');
  await workspaceConfig.update('serverUrl', serverUrl, vscode.ConfigurationTarget.Workspace);
  await workspaceConfig.update('dsn', dsn, vscode.ConfigurationTarget.Workspace);

  // 更新 API
  api.updateConfig(getConfig());

  // 测试连接
  const connected = await api.testConnection();
  if (connected) {
    vscode.window.showInformationMessage('✅ 连接成功！');
    refreshData();
    startAutoRefresh();
  } else {
    vscode.window.showErrorMessage('❌ 连接失败，请检查服务器地址和 DSN');
  }
}

/**
 * 打开错误位置
 */
async function openError(error?: MonitorError) {
  if (!error) {
    vscode.window.showWarningMessage('请选择一个错误');
    return;
  }

  // 如果没有解析后的堆栈，先获取详情
  if (!error.parsedStack) {
    try {
      const detail = await api.getErrorDetail(error.id);
      error = detail;
    } catch (e) {
      console.error('Failed to get error detail:', e);
    }
  }

  await fileOpener.openError(error);
}

/**
 * 打开 Dashboard
 */
function openDashboard() {
  const config = getConfig();
  const url = config.serverUrl.replace(/\/api$/, '').replace(/\/$/, '');
  const dashboardUrl = `${url.replace(':3000', ':5175')}`;
  
  vscode.env.openExternal(vscode.Uri.parse(dashboardUrl));
}

/**
 * 插件激活
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Frontend Monitor extension is now active!');

  const config = getConfig();

  // 初始化组件
  api = new MonitorAPI(config);
  errorTreeProvider = new ErrorTreeProvider(api);
  statsTreeProvider = new StatsTreeProvider(api);
  decorationProvider = new ErrorDecorationProvider(config);
  fileOpener = new FileOpener(config);

  // 注册 TreeView
  const errorTreeView = vscode.window.createTreeView('monitorErrors', {
    treeDataProvider: errorTreeProvider,
    showCollapseAll: true,
  });

  const statsTreeView = vscode.window.createTreeView('monitorStats', {
    treeDataProvider: statsTreeProvider,
  });

  // 创建状态栏
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.command = 'monitor.refresh';
  statusBarItem.text = '$(bug) -';
  statusBarItem.tooltip = '点击刷新错误列表';

  // 注册命令
  const commands = [
    vscode.commands.registerCommand('monitor.refresh', refreshData),
    vscode.commands.registerCommand('monitor.configure', configureServer),
    vscode.commands.registerCommand('monitor.openError', openError),
    vscode.commands.registerCommand('monitor.openDashboard', openDashboard),
  ];

  // 监听配置变化
  const configWatcher = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('monitor')) {
      const newConfig = getConfig();
      api.updateConfig(newConfig);
      decorationProvider.updateConfig(newConfig);
      fileOpener.updateConfig(newConfig);
      startAutoRefresh();
      refreshData();
    }
  });

  // 监听编辑器变化，更新装饰
  const editorWatcher = vscode.window.onDidChangeActiveTextEditor(() => {
    decorationProvider.updateDecorations();
  });

  // 添加到订阅
  context.subscriptions.push(
    errorTreeView,
    statsTreeView,
    statusBarItem,
    ...commands,
    configWatcher,
    editorWatcher,
    { dispose: () => decorationProvider.dispose() },
    { dispose: stopAutoRefresh },
  );

  // 初始加载
  if (config.dsn) {
    refreshData();
    startAutoRefresh();
  }
}

/**
 * 插件停用
 */
export function deactivate() {
  stopAutoRefresh();
}
