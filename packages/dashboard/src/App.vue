<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

// 配置
const API_BASE = '/api';
const DSN = 'demo-app';

// 状态
const activeTab = ref<'errors' | 'performance' | 'overview'>('overview');
const errors = ref<any[]>([]);
const performance = ref<any[]>([]);
const errorGroups = ref<any[]>([]);
const selectedError = ref<any>(null);
const loading = ref(false);
const stats = ref({ totalErrors: 0, totalPerf: 0, errorRate: 0 });

// 统计数据
const overviewStats = computed(() => [
  { label: '错误总数', value: stats.value.totalErrors, icon: '🐛', color: '#ef4444' },
  { label: '性能记录', value: stats.value.totalPerf, icon: '⚡', color: '#f59e0b' },
  { label: '错误分组', value: errorGroups.value.length, icon: '📊', color: '#6366f1' },
  { label: '影响页面', value: new Set(errors.value.map(e => e.url)).size, icon: '📄', color: '#10b981' }
]);

// API 请求
async function fetchErrors() {
  loading.value = true;
  try {
    const res = await fetch(`${API_BASE}/errors?dsn=${DSN}&pageSize=50`);
    const data = await res.json();
    errors.value = data.list || [];
    stats.value.totalErrors = data.total || 0;
  } catch (e) {
    console.error('获取错误列表失败:', e);
  }
  loading.value = false;
}

async function fetchPerformance() {
  try {
    const res = await fetch(`${API_BASE}/performance?dsn=${DSN}&pageSize=50`);
    const data = await res.json();
    performance.value = data.list || [];
    stats.value.totalPerf = data.total || 0;
  } catch (e) {
    console.error('获取性能数据失败:', e);
  }
}

async function fetchErrorGroups() {
  try {
    const res = await fetch(`${API_BASE}/errors/stats/groups?dsn=${DSN}`);
    const data = await res.json();
    errorGroups.value = data.groups || [];
  } catch (e) {
    console.error('获取错误分组失败:', e);
  }
}

async function fetchErrorDetail(id: number) {
  try {
    const res = await fetch(`${API_BASE}/errors/${id}?version=1.0.0`);
    selectedError.value = await res.json();
  } catch (e) {
    console.error('获取错误详情失败:', e);
  }
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN');
}

function formatDuration(ms: number | null) {
  if (ms === null || ms === undefined) return '-';
  return `${ms}ms`;
}

function closeDetail() {
  selectedError.value = null;
}

// 初始化
onMounted(() => {
  fetchErrors();
  fetchPerformance();
  fetchErrorGroups();
});
</script>

<template>
  <div class="dashboard">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="logo">
        <span class="logo-icon">📊</span>
        <span class="logo-text">监控平台</span>
      </div>
      <nav class="nav">
        <a class="nav-item" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">
          <span>📈</span> 概览
        </a>
        <a class="nav-item" :class="{ active: activeTab === 'errors' }" @click="activeTab = 'errors'">
          <span>🐛</span> 错误列表
        </a>
        <a class="nav-item" :class="{ active: activeTab === 'performance' }" @click="activeTab = 'performance'">
          <span>⚡</span> 性能数据
        </a>
      </nav>
      <div class="sidebar-footer">
        <div class="dsn-badge">DSN: {{ DSN }}</div>
      </div>
    </aside>

    <!-- 主内容区 -->
    <main class="main">
      <!-- 概览页 -->
      <div v-if="activeTab === 'overview'" class="page">
        <h1 class="page-title">📈 监控概览</h1>
        
        <!-- 统计卡片 -->
        <div class="stats-grid">
          <div class="stat-card" v-for="stat in overviewStats" :key="stat.label">
            <div class="stat-icon" :style="{ background: stat.color + '20', color: stat.color }">
              {{ stat.icon }}
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
          </div>
        </div>

        <!-- 错误分组 -->
        <div class="card">
          <div class="card-header">
            <h2>🔥 热门错误</h2>
            <button class="btn btn-sm" @click="fetchErrorGroups">刷新</button>
          </div>
          <div class="card-body">
            <div v-if="errorGroups.length === 0" class="empty">暂无数据</div>
            <div v-else class="error-groups">
              <div class="group-item" v-for="group in errorGroups.slice(0, 5)" :key="group.fingerprint">
                <div class="group-header">
                  <span class="group-type">{{ group.type }}</span>
                  <span class="group-count">{{ group.totalCount }} 次</span>
                </div>
                <div class="group-message">{{ group.normalizedMessage || group.message }}</div>
                <div class="group-meta">
                  首次: {{ formatTime(group.firstSeen) }} | 
                  最近: {{ formatTime(group.lastSeen) }} |
                  影响 {{ group.affectedUrls }} 个页面
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 错误列表页 -->
      <div v-if="activeTab === 'errors'" class="page">
        <h1 class="page-title">🐛 错误列表</h1>
        
        <div class="toolbar">
          <button class="btn" @click="fetchErrors" :disabled="loading">
            {{ loading ? '加载中...' : '🔄 刷新' }}
          </button>
        </div>

        <div class="card">
          <div class="card-body">
            <div v-if="errors.length === 0" class="empty">暂无错误记录</div>
            <table v-else class="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>类型</th>
                  <th>错误信息</th>
                  <th>次数</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="err in errors" :key="err.id">
                  <td>#{{ err.id }}</td>
                  <td><span class="badge badge-error">{{ err.type }}</span></td>
                  <td class="msg-cell">{{ err.message.substring(0, 50) }}{{ err.message.length > 50 ? '...' : '' }}</td>
                  <td><span class="badge badge-count">{{ err.count }}</span></td>
                  <td>{{ formatTime(err.timestamp) }}</td>
                  <td>
                    <button class="btn btn-sm btn-primary" @click="fetchErrorDetail(err.id)">详情</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 性能数据页 -->
      <div v-if="activeTab === 'performance'" class="page">
        <h1 class="page-title">⚡ 性能数据</h1>
        
        <div class="toolbar">
          <button class="btn" @click="fetchPerformance">🔄 刷新</button>
        </div>

        <div class="card">
          <div class="card-body">
            <div v-if="performance.length === 0" class="empty">暂无性能数据</div>
            <table v-else class="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>页面</th>
                  <th>FP</th>
                  <th>FCP</th>
                  <th>LCP</th>
                  <th>TTFB</th>
                  <th>DOM Ready</th>
                  <th>Load</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="perf in performance" :key="perf.id">
                  <td>#{{ perf.id }}</td>
                  <td class="url-cell">{{ perf.url }}</td>
                  <td>{{ formatDuration(perf.fp) }}</td>
                  <td>{{ formatDuration(perf.fcp) }}</td>
                  <td>{{ formatDuration(perf.lcp) }}</td>
                  <td>{{ formatDuration(perf.ttfb) }}</td>
                  <td>{{ formatDuration(perf.domReady) }}</td>
                  <td>{{ formatDuration(perf.load) }}</td>
                  <td>{{ formatTime(perf.timestamp) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>

    <!-- 错误详情弹窗 -->
    <div v-if="selectedError" class="modal-overlay" @click.self="closeDetail">
      <div class="modal">
        <div class="modal-header">
          <h2>错误详情 #{{ selectedError.id }}</h2>
          <button class="modal-close" @click="closeDetail">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-section">
            <label>类型</label>
            <span class="badge badge-error">{{ selectedError.type }}</span>
          </div>
          <div class="detail-section">
            <label>错误信息</label>
            <p>{{ selectedError.message }}</p>
          </div>
          <div class="detail-section">
            <label>发生次数</label>
            <span class="badge badge-count">{{ selectedError.count }} 次</span>
          </div>
          <div class="detail-section">
            <label>页面 URL</label>
            <p class="url">{{ selectedError.url }}</p>
          </div>
          <div class="detail-section" v-if="selectedError.stack">
            <label>原始堆栈</label>
            <pre class="stack">{{ selectedError.stack }}</pre>
          </div>
          <div class="detail-section" v-if="selectedError.parsedStack?.length">
            <label>🗺️ SourceMap 解析结果</label>
            <div class="parsed-stack">
              <div class="frame" v-for="(frame, i) in selectedError.parsedStack" :key="i">
                <template v-if="frame.originalFile">
                  <div class="frame-original">
                    📍 {{ frame.originalFile }}:{{ frame.originalLine }}:{{ frame.originalColumn }}
                    <span v-if="frame.originalName" class="frame-name">({{ frame.originalName }})</span>
                  </div>
                  <div class="frame-compiled">← {{ frame.file }}:{{ frame.line }}:{{ frame.column }}</div>
                </template>
                <template v-else>
                  <div class="frame-compiled">{{ frame.file }}:{{ frame.line }}:{{ frame.column }}</div>
                </template>
              </div>
            </div>
          </div>
          <div class="detail-section" v-if="selectedError.breadcrumbs?.length">
            <label>用户行为轨迹</label>
            <div class="breadcrumbs">
              <div class="crumb" v-for="(crumb, i) in selectedError.breadcrumbs" :key="i">
                <span class="crumb-type">{{ crumb.type }}</span>
                <span class="crumb-data">{{ JSON.stringify(crumb.data) }}</span>
                <span class="crumb-time">{{ formatTime(crumb.timestamp) }}</span>
              </div>
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
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --bg: #f1f5f9;
  --sidebar-bg: #1e293b;
  --card-bg: #ffffff;
  --text: #1e293b;
  --text-light: #64748b;
  --border: #e2e8f0;
}
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.dashboard { display: flex; min-height: 100vh; background: var(--bg); }

/* 侧边栏 */
.sidebar {
  width: 240px;
  background: var(--sidebar-bg);
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
}
.logo {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.logo-icon { font-size: 28px; }
.logo-text { font-size: 18px; font-weight: 600; }
.nav { flex: 1; padding: 16px 0; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}
.nav-item:hover { background: rgba(255,255,255,0.05); color: white; }
.nav-item.active { background: var(--primary); color: white; }
.sidebar-footer { padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.1); }
.dsn-badge {
  background: rgba(255,255,255,0.1);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #94a3b8;
}

/* 主内容 */
.main { flex: 1; margin-left: 240px; padding: 24px; }
.page-title { font-size: 24px; margin-bottom: 24px; color: var(--text); }
.toolbar { margin-bottom: 16px; display: flex; gap: 8px; }

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  background: var(--card-bg);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.stat-value { font-size: 28px; font-weight: 700; color: var(--text); }
.stat-label { font-size: 13px; color: var(--text-light); }

/* 卡片 */
.card {
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 24px;
}
.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-header h2 { font-size: 16px; }
.card-body { padding: 20px; }
.empty { text-align: center; color: var(--text-light); padding: 40px; }

/* 按钮 */
.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  background: var(--card-bg);
  border: 1px solid var(--border);
  transition: all 0.2s;
}
.btn:hover { background: var(--bg); }
.btn-sm { padding: 4px 10px; font-size: 12px; }
.btn-primary { background: var(--primary); color: white; border: none; }
.btn-primary:hover { opacity: 0.9; }

/* 徽章 */
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.badge-error { background: #fef2f2; color: #dc2626; }
.badge-count { background: #f0f9ff; color: #0369a1; }
</style>

<style>
/* 表格 */
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border); }
.table th { font-weight: 600; color: var(--text-light); font-size: 12px; text-transform: uppercase; }
.table tr:hover { background: #f8fafc; }
.msg-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.url-cell { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; color: var(--text-light); }

/* 错误分组 */
.error-groups { display: flex; flex-direction: column; gap: 12px; }
.group-item {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid var(--danger);
}
.group-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.group-type { font-weight: 600; color: var(--danger); }
.group-count { font-size: 14px; color: var(--text-light); }
.group-message { font-size: 14px; color: var(--text); margin-bottom: 8px; word-break: break-all; }
.group-meta { font-size: 12px; color: var(--text-light); }

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: var(--card-bg);
  border-radius: 12px;
  width: 800px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h2 { font-size: 18px; }
.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-light);
}
.modal-body { padding: 20px; overflow-y: auto; }
.detail-section { margin-bottom: 20px; }
.detail-section label { display: block; font-size: 12px; color: var(--text-light); margin-bottom: 6px; text-transform: uppercase; }
.detail-section p { color: var(--text); }
.detail-section .url { font-size: 13px; color: var(--primary); word-break: break-all; }

/* 堆栈 */
.stack {
  background: #1e293b;
  color: #e2e8f0;
  padding: 16px;
  border-radius: 8px;
  font-size: 12px;
  font-family: Monaco, monospace;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.parsed-stack {
  background: #1e293b;
  border-radius: 8px;
  padding: 16px;
  font-family: Monaco, monospace;
  font-size: 12px;
}
.frame { padding: 8px 0; border-bottom: 1px solid #334155; }
.frame:last-child { border-bottom: none; }
.frame-original { color: #4ade80; }
.frame-compiled { color: #64748b; font-size: 11px; }
.frame-name { color: #fbbf24; }

/* 面包屑 */
.breadcrumbs { max-height: 200px; overflow-y: auto; }
.crumb {
  display: flex;
  gap: 12px;
  padding: 8px;
  background: #f8fafc;
  border-radius: 4px;
  margin-bottom: 4px;
  font-size: 12px;
}
.crumb-type { font-weight: 600; color: var(--primary); min-width: 60px; }
.crumb-data { flex: 1; color: var(--text); word-break: break-all; }
.crumb-time { color: var(--text-light); }
</style>
