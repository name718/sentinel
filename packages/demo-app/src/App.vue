<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Monitor } from '@monitor/sdk';
import { divideNumbers, processUserData, deepNestedError, fetchData } from './utils';

// 配置
const CONFIG = {
  dsn: 'demo-app',
  reportUrl: 'http://localhost:3000/api/report',
  serverUrl: 'http://localhost:3000'
};

// 状态
const connected = ref(false);
const logs = ref<{ time: string; msg: string; type: string }[]>([]);
const selectedFiles = ref<File[]>([]);
const version = ref('1.0.0');
const errors = ref<any[]>([]);
const selectedErrorId = ref<number | null>(null);
const parsedResult = ref<any>(null);
const isDragover = ref(false);

// 日志
function log(msg: string, type = 'info') {
  const time = new Date().toLocaleTimeString();
  logs.value.push({ time, msg, type });
}

function clearConsole() {
  logs.value = [];
  log('控制台已清空', 'info');
}

// SDK 初始化
function initSDK() {
  try {
    const monitor = Monitor.getInstance();
    monitor.init({
      dsn: CONFIG.dsn,
      reportUrl: CONFIG.reportUrl,
      maxBreadcrumbs: 20,
      batchSize: 3,
      reportInterval: 5000,
      errorSampleRate: 1.0,  // 100% 错误采样
      performanceSampleRate: 0.5,  // 50% 性能采样
      enableSessionReplay: true,  // 启用会话录制
      sessionReplay: {
        maxDuration: 30,  // 最大录制 30 秒
        maskAllInputs: true,  // 屏蔽所有输入
        errorReplayDuration: 10,  // 错误发生时保留 10 秒录制
      },
      ignoreErrors: [/Script error/i],  // 忽略跨域脚本错误
      beforeSend: (event) => {
        // 可以在这里过滤或修改事件
        log('📤 beforeSend 钩子触发', 'info');
        return event;
      }
    });
    
    // 设置用户信息
    monitor.setUser({
      id: 'user_' + Math.random().toString(36).substr(2, 9),
      username: 'demo_user',
      email: 'demo@example.com'
    });
    
    // 设置上下文
    monitor.setContext({
      version: '1.0.0',
      environment: 'demo',
    });
    
    // 设置标签
    monitor.setTag('page', 'demo');
    monitor.setTag('feature', 'sourcemap');
    
    // 设置额外数据
    monitor.setExtra('buildTime', new Date().toISOString());
    
    connected.value = true;
    log('✅ SDK 初始化成功', 'success');
    log(`   DSN: ${CONFIG.dsn}`, 'info');
    log(`   用户: ${monitor.getUser()?.username}`, 'info');
    log(`   环境: ${monitor.getContext().environment}`, 'info');
  } catch (e) {
    log('❌ 初始化失败: ' + (e as Error).message, 'error');
  }
}

// 错误测试
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

function flushData() {
  Monitor.getInstance().flush();
  log('📤 已触发数据上报', 'success');
}

// 用户和上下文管理
function updateUser() {
  const userId = prompt('输入用户 ID:', 'user_123');
  const username = prompt('输入用户名:', 'test_user');
  if (userId && username) {
    Monitor.getInstance().setUser({
      id: userId,
      username: username,
      email: `${username}@example.com`
    });
    log(`✅ 用户信息已更新: ${username}`, 'success');
  }
}

function updateContext() {
  const env = prompt('输入环境:', 'production');
  const ver = prompt('输入版本:', '1.0.0');
  if (env && ver) {
    Monitor.getInstance().setContext({
      environment: env,
      version: ver
    });
    log(`✅ 上下文已更新: ${env} v${ver}`, 'success');
  }
}

function addTag() {
  const key = prompt('标签名:', 'feature');
  const value = prompt('标签值:', 'test');
  if (key && value) {
    Monitor.getInstance().setTag(key, value);
    log(`✅ 标签已添加: ${key}=${value}`, 'success');
  }
}

// 文件上传
function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragover.value = false;
  if (e.dataTransfer?.files) {
    handleFiles(e.dataTransfer.files);
  }
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files) {
    handleFiles(input.files);
  }
}

function handleFiles(files: FileList) {
  for (const file of files) {
    if (file.name.endsWith('.map')) {
      selectedFiles.value.push(file);
    }
  }
}

function removeFile(index: number) {
  selectedFiles.value.splice(index, 1);
}

async function uploadSourceMaps() {
  if (selectedFiles.value.length === 0) {
    alert('请先选择 SourceMap 文件');
    return;
  }
  if (!version.value) {
    alert('请输入版本号');
    return;
  }

  for (const file of selectedFiles.value) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dsn', CONFIG.dsn);
    formData.append('version', version.value);

    try {
      const res = await fetch(`${CONFIG.serverUrl}/api/sourcemap`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        log(`✅ ${file.name} 上传成功`, 'success');
      } else {
        log(`❌ ${file.name} 上传失败: ${data.error}`, 'error');
      }
    } catch (e) {
      log(`❌ ${file.name} 上传失败: ${e}`, 'error');
    }
  }

  selectedFiles.value = [];
  alert('上传完成！');
}

// 错误列表
async function refreshErrors() {
  try {
    const res = await fetch(`${CONFIG.serverUrl}/api/errors?dsn=${CONFIG.dsn}&pageSize=10`);
    const data = await res.json();
    errors.value = data.list || [];
  } catch (e) {
    log('获取错误列表失败: ' + e, 'error');
  }
}

async function selectError(id: number) {
  selectedErrorId.value = id;
  try {
    const res = await fetch(`${CONFIG.serverUrl}/api/errors/${id}?version=${version.value}`);
    parsedResult.value = await res.json();
  } catch (e) {
    log('获取错误详情失败: ' + e, 'error');
  }
}

// 全局错误监听
onMounted(() => {
  window.addEventListener('error', (e) => {
    log('❌ 全局错误: ' + e.message, 'error');
  });
  window.addEventListener('unhandledrejection', (e) => {
    log('❌ Promise 错误: ' + e.reason, 'error');
  });
  log('📦 应用已加载，请点击"初始化 SDK"开始', 'info');
  setTimeout(refreshErrors, 1000);
});
</script>

<template>
  <div class="app">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="nav-content">
        <div class="logo">
          <span class="logo-icon">🗺️</span>
          <span class="logo-text">SourceMap 演示</span>
          <span class="version">v1.0.0</span>
        </div>
        <div class="nav-status">
          <span class="status-dot" :class="{ active: connected }"></span>
          <span>{{ connected ? '已连接' : '未连接' }}</span>
        </div>
      </div>
    </nav>

    <div class="container">
      <!-- Hero -->
      <div class="hero">
        <h1>🗺️ SourceMap 解析演示</h1>
        <p>上传 SourceMap 文件，触发错误，查看源码位置还原</p>
      </div>

      <div class="grid">
        <!-- SDK 初始化 -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon" style="background: #f0f9ff;">⚙️</div>
            <span class="card-title">1. 初始化 SDK</span>
          </div>
          <div class="card-body">
            <p class="hint">初始化监控 SDK，开始捕获错误</p>
            <div class="btn-group">
              <button class="btn btn-primary" @click="initSDK">🔌 初始化 SDK</button>
            </div>
          </div>
        </div>

        <!-- SourceMap 上传 -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon" style="background: #f0fdf4;">📁</div>
            <span class="card-title">2. 上传 SourceMap</span>
          </div>
          <div class="card-body">
            <div class="form-group">
              <label>版本号</label>
              <input type="text" v-model="version" placeholder="输入版本号">
            </div>
            <div 
              class="upload-area" 
              :class="{ dragover: isDragover }"
              @click="($refs.fileInput as HTMLInputElement).click()"
              @dragover.prevent="isDragover = true"
              @dragleave="isDragover = false"
              @drop="handleDrop"
            >
              <div class="upload-icon">📤</div>
              <div class="upload-text">拖拽 .map 文件到这里，或点击选择</div>
              <input type="file" ref="fileInput" class="file-input" accept=".map" multiple @change="handleFileSelect">
            </div>
            <div class="file-list">
              <div class="file-item" v-for="(file, index) in selectedFiles" :key="index">
                <span>📄</span>
                <span class="file-name">{{ file.name }}</span>
                <span class="file-size">{{ (file.size / 1024).toFixed(1) }} KB</span>
                <span class="file-remove" @click="removeFile(index)">✕</span>
              </div>
            </div>
            <button class="btn btn-success" @click="uploadSourceMaps">⬆️ 上传到服务器</button>
          </div>
        </div>
      </div>

      <div class="grid">
        <!-- 错误触发 -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon" style="background: #fef2f2;">🐛</div>
            <span class="card-title">3. 触发错误</span>
          </div>
          <div class="card-body">
            <p class="hint">触发各种错误，错误会被 SDK 捕获并上报</p>
            <div class="btn-group">
              <button class="btn btn-danger" @click="testDivisionError">➗ 除零错误</button>
              <button class="btn btn-warning" @click="testUserDataError">👤 数据校验</button>
              <button class="btn btn-outline" @click="testNestedError">📚 嵌套调用</button>
              <button class="btn btn-outline" @click="testUncaughtError">💥 未捕获</button>
              <button class="btn btn-outline" @click="testPromiseError">⚡ Promise</button>
              <button class="btn btn-outline" @click="testAsyncError">🌐 异步错误</button>
            </div>
            <div style="margin-top: 16px;">
              <button class="btn btn-primary" @click="flushData">📤 立即上报</button>
              <button class="btn btn-outline" @click="refreshErrors">🔄 刷新错误列表</button>
            </div>
          </div>
        </div>

        <!-- 用户和上下文管理 -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon" style="background: #fef3c7;">👤</div>
            <span class="card-title">用户 & 上下文</span>
          </div>
          <div class="card-body">
            <p class="hint">设置用户信息和自定义上下文，将附加到所有事件</p>
            <div class="btn-group">
              <button class="btn btn-primary" @click="updateUser">👤 更新用户</button>
              <button class="btn btn-outline" @click="updateContext">🌍 更新上下文</button>
              <button class="btn btn-outline" @click="addTag">🏷️ 添加标签</button>
            </div>
            <div style="margin-top: 12px; padding: 12px; background: #f8fafc; border-radius: 6px; font-size: 12px;">
              <div><strong>当前用户:</strong> {{ Monitor.getInstance().getUser()?.username || '未设置' }}</div>
              <div><strong>环境:</strong> {{ Monitor.getInstance().getContext().environment || '未设置' }}</div>
              <div><strong>版本:</strong> {{ Monitor.getInstance().getContext().version || '未设置' }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid">
        <!-- 错误列表 -->
        <div class="card">
          <div class="card-header">
            <div class="card-icon" style="background: #fefce8;">📋</div>
            <span class="card-title">4. 选择错误查看解析</span>
          </div>
          <div class="card-body">
            <div class="error-list">
              <div v-if="errors.length === 0" class="empty-state">暂无错误记录</div>
              <div 
                v-for="err in errors" 
                :key="err.id" 
                class="error-item"
                :class="{ selected: selectedErrorId === err.id }"
                @click="selectError(err.id)"
              >
                <span class="error-type">{{ err.type }}</span>
                <span class="error-id">#{{ err.id }}</span>
                <div class="error-msg">{{ err.message.substring(0, 60) }}{{ err.message.length > 60 ? '...' : '' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SourceMap 解析结果 -->
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-header">
          <div class="card-icon" style="background: #eff6ff;">🔍</div>
          <span class="card-title">5. SourceMap 解析结果</span>
        </div>
        <div class="card-body">
          <div v-if="!parsedResult" class="empty-state large">
            <div style="font-size: 48px; margin-bottom: 12px;">🗺️</div>
            <p>选择一个错误查看 SourceMap 解析结果</p>
            <p style="font-size: 12px; margin-top: 8px;">压缩后的堆栈将被还原为源码位置</p>
          </div>
          <div v-else>
            <div class="result-section">
              <strong>错误信息:</strong> {{ parsedResult.message }}
            </div>
            <div v-if="parsedResult.stack" class="result-section">
              <strong>原始堆栈:</strong>
              <pre class="stack-raw">{{ parsedResult.stack }}</pre>
            </div>
            <div v-if="parsedResult.parsedStack?.length" class="result-section">
              <strong>🗺️ SourceMap 解析结果:</strong>
              <div class="parsed-stack">
                <div class="stack-frame" v-for="(frame, i) in parsedResult.parsedStack" :key="i">
                  <template v-if="frame.originalFile">
                    <div class="stack-original">
                      📍 {{ frame.originalFile }}:{{ frame.originalLine }}:{{ frame.originalColumn }}
                      <span v-if="frame.originalName" class="stack-name">({{ frame.originalName }})</span>
                    </div>
                    <div class="stack-compiled">
                      ← 编译后: {{ frame.file }}:{{ frame.line }}:{{ frame.column }}
                    </div>
                  </template>
                  <template v-else>
                    <div class="stack-compiled">
                      {{ frame.file }}:{{ frame.line }}:{{ frame.column }}
                      <span class="stack-no-map">(未找到 SourceMap)</span>
                    </div>
                  </template>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>⚠️ 未找到 SourceMap 或堆栈无法解析</p>
              <p style="font-size: 12px;">请确保已上传对应版本的 SourceMap 文件</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 控制台 -->
      <div class="card">
        <div class="card-header">
          <div class="card-icon" style="background: #1e293b;">💻</div>
          <span class="card-title">实时日志</span>
          <button class="btn btn-outline" style="margin-left: auto;" @click="clearConsole">清空</button>
        </div>
        <div class="card-body">
          <div class="console">
            <div class="console-line" v-for="(item, i) in logs" :key="i">
              <span class="console-time">[{{ item.time }}]</span>
              <span :class="'console-' + item.type">{{ item.msg }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --bg: #f8fafc;
  --card-bg: #ffffff;
  --text: #1e293b;
  --text-secondary: #64748b;
  --border: #e2e8f0;
}
.app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  min-height: 100vh;
}
.navbar {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  padding: 16px 24px;
  position: sticky;
  top: 0;
  z-index: 100;
}
.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo { display: flex; align-items: center; gap: 8px; }
.logo-icon { font-size: 24px; }
.logo-text { font-size: 20px; font-weight: 600; }
.version {
  background: var(--primary);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}
.nav-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg);
  border-radius: 20px;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-secondary);
}
.status-dot.active { background: var(--success); }
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}
.hero {
  text-align: center;
  padding: 40px 24px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: white;
  border-radius: 16px;
  margin-bottom: 24px;
}
.hero h1 { font-size: 28px; margin-bottom: 8px; }
.hero p { opacity: 0.9; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}
.card {
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border);
  overflow: hidden;
}
.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 12px;
}
.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.card-title { font-weight: 600; }
.card-body { padding: 20px; }
.hint { color: var(--text-secondary); font-size: 13px; margin-bottom: 16px; }
.btn-group { display: flex; flex-wrap: wrap; gap: 8px; }
.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn:hover { transform: translateY(-1px); }
.btn-primary { background: var(--primary); color: white; }
.btn-danger { background: var(--danger); color: white; }
.btn-warning { background: var(--warning); color: white; }
.btn-success { background: var(--success); color: white; }
.btn-outline { background: transparent; border: 1px solid var(--border); }
</style>

<style>
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; }
.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 14px;
}
.form-group input:focus { outline: none; border-color: var(--primary); }
.upload-area {
  border: 2px dashed var(--border);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  margin-bottom: 16px;
  transition: all 0.2s;
  cursor: pointer;
}
.upload-area:hover { border-color: var(--primary); background: #f8fafc; }
.upload-area.dragover { border-color: var(--primary); background: #eef2ff; }
.upload-icon { font-size: 32px; margin-bottom: 8px; }
.upload-text { color: var(--text-secondary); font-size: 14px; }
.file-input { display: none; }
.file-list { margin-top: 12px; }
.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg);
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 13px;
}
.file-name { flex: 1; }
.file-size { color: var(--text-secondary); }
.file-remove { cursor: pointer; color: var(--danger); }
.error-list { max-height: 200px; overflow-y: auto; }
.error-item {
  padding: 12px;
  background: var(--bg);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;
}
.error-item:hover { background: #eef2ff; }
.error-item.selected { border: 2px solid var(--primary); }
.error-type {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: #fef2f2;
  color: #dc2626;
  margin-right: 8px;
}
.error-id { font-size: 12px; color: var(--text-secondary); }
.error-msg { font-size: 13px; margin-top: 4px; color: var(--text-secondary); }
.empty-state { text-align: center; color: var(--text-secondary); padding: 20px; }
.empty-state.large { padding: 40px; }
.result-section { margin-bottom: 16px; }
.stack-raw {
  background: #f1f5f9;
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  overflow-x: auto;
  margin-top: 8px;
  font-family: 'Monaco', monospace;
}
.parsed-stack {
  background: #1e293b;
  border-radius: 8px;
  padding: 16px;
  font-family: 'Monaco', monospace;
  font-size: 12px;
  color: #e2e8f0;
  max-height: 300px;
  overflow: auto;
  margin-top: 8px;
}
.stack-frame { padding: 8px; border-bottom: 1px solid #334155; }
.stack-frame:last-child { border-bottom: none; }
.stack-original { color: #4ade80; }
.stack-compiled { color: #64748b; font-size: 11px; }
.stack-name { color: #fbbf24; }
.stack-no-map { color: #64748b; }
.console {
  background: #1e293b;
  border-radius: 8px;
  padding: 16px;
  font-family: 'Monaco', monospace;
  font-size: 13px;
  color: #e2e8f0;
  max-height: 250px;
  overflow-y: auto;
}
.console-line { padding: 4px 0; border-bottom: 1px solid #334155; }
.console-time { color: #64748b; margin-right: 8px; }
.console-info { color: #60a5fa; }
.console-success { color: #4ade80; }
.console-error { color: #f87171; }
.console-warn { color: #fbbf24; }
</style>
