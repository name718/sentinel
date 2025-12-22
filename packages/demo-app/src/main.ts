/**
 * 主入口文件 - Monitor SDK 演示
 */

import { divideNumbers, processUserData, deepNestedError, fetchData } from './utils';
import { Monitor } from '@monitor/sdk';

// 配置
const CONFIG = {
  dsn: 'demo-app',
  reportUrl: 'http://localhost:3000/api/report',
  serverUrl: 'http://localhost:3000'
};

// 日志输出
function log(msg: string, type: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const consoleEl = document.getElementById('console');
  if (!consoleEl) return;
  
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  line.className = 'console-line';
  line.innerHTML = `<span class="console-time">[${time}]</span><span class="console-${type}">${msg}</span>`;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

// 更新状态
function updateStatus(connected: boolean) {
  const dot = document.getElementById('statusDot');
  const text = document.getElementById('statusText');
  if (dot && text) {
    dot.className = 'status-dot' + (connected ? ' active' : '');
    text.textContent = connected ? '已连接' : '未连接';
  }
}

// 初始化 SDK
function initSDK() {
  try {
    Monitor.getInstance().init({
      dsn: CONFIG.dsn,
      reportUrl: CONFIG.reportUrl,
      maxBreadcrumbs: 20,
      batchSize: 3,
      reportInterval: 5000
    });
    updateStatus(true);
    log('✅ SDK 初始化成功', 'success');
    log(`   DSN: ${CONFIG.dsn}`, 'info');
  } catch (e) {
    log('❌ 初始化失败: ' + (e as Error).message, 'error');
  }
}

// 错误测试函数
function testDivisionError() {
  log('🧮 测试除零错误...', 'warn');
  try {
    divideNumbers(10, 0);
  } catch (e) {
    Monitor.getInstance().captureError(e as Error);
    log('捕获错误: ' + (e as Error).message, 'error');
  }
}

function testUserDataError() {
  log('👤 测试用户数据错误...', 'warn');
  try {
    processUserData({ name: '', age: 25 });
  } catch (e) {
    Monitor.getInstance().captureError(e as Error);
    log('捕获错误: ' + (e as Error).message, 'error');
  }
}

function testNestedError() {
  log('📚 测试嵌套调用错误...', 'warn');
  try {
    deepNestedError();
  } catch (e) {
    Monitor.getInstance().captureError(e as Error);
    log('捕获错误: ' + (e as Error).message, 'error');
  }
}

function testUncaughtError() {
  log('💥 触发未捕获错误...', 'warn');
  setTimeout(() => {
    // @ts-expect-error 故意触发错误
    undefinedFunction();
  }, 100);
}

function testPromiseError() {
  log('⚡ 触发 Promise 错误...', 'warn');
  Promise.reject(new Error('Unhandled Promise Rejection'));
}

async function testAsyncError() {
  log('🌐 测试异步错误...', 'warn');
  try {
    await fetchData('http://localhost:9999/not-exist');
  } catch (e) {
    Monitor.getInstance().captureError(e as Error);
    log('捕获错误: ' + (e as Error).message, 'error');
  }
}

// 导出到全局
(window as unknown as Record<string, unknown>).app = {
  initSDK,
  testDivisionError,
  testUserDataError,
  testNestedError,
  testUncaughtError,
  testPromiseError,
  testAsyncError,
  flushData: () => {
    Monitor.getInstance().flush();
    log('📤 已触发数据上报', 'success');
  },
  clearConsole: () => {
    const consoleEl = document.getElementById('console');
    if (consoleEl) consoleEl.innerHTML = '';
    log('控制台已清空', 'info');
  }
};

// 全局错误监听
window.addEventListener('error', (e) => {
  log('❌ 全局错误: ' + e.message, 'error');
});

window.addEventListener('unhandledrejection', (e) => {
  log('❌ Promise 错误: ' + e.reason, 'error');
});

log('📦 应用已加载，请点击"初始化 SDK"开始', 'info');
