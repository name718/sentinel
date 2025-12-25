<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import SessionReplayPlayer from '../components/SessionReplayPlayer.vue';
import ErrorStatusBadge from '../components/ErrorStatusBadge.vue';
import { authFetch } from '../composables/useAuth';
import { API_BASE } from '../config';

type ErrorStatus = 'open' | 'processing' | 'resolved' | 'ignored';

interface ErrorDetail {
  id: number;
  type: string;
  message: string;
  count: number;
  url: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  status?: ErrorStatus;
  resolvedAt?: string;
  resolvedBy?: string;
  fingerprint?: string;
  timestamp?: number;
  userAgent?: string;
  parsedStack?: Array<{
    file: string;
    line: number;
    column: number;
    originalFile?: string;
    originalLine?: number;
    originalColumn?: number;
    originalName?: string;
  }>;
  breadcrumbs?: Array<{
    type: string;
    data: any;
    timestamp: number;
  }>;
  sessionReplay?: {
    sessionId: string;
    events: unknown[];
    startTime: number;
    endTime: number;
  };
}

const route = useRoute();
const router = useRouter();

const error = ref<ErrorDetail | null>(null);
const loading = ref(true);
const activeTab = ref<'details' | 'replay' | 'similar'>('details');
const similarErrors = ref<any[]>([]);

const errorId = computed(() => Number(route.params.id));

async function fetchErrorDetail() {
  loading.value = true;
  try {
    const res = await authFetch(`${API_BASE}/errors/${errorId.value}?version=1.0.0`);
    if (res.ok) {
      error.value = await res.json();
      // 获取同类错误
      if (error.value?.fingerprint) {
        fetchSimilarErrors(error.value.fingerprint);
      }
    } else {
      router.push('/errors');
    }
  } catch (e) {
    console.error('获取错误详情失败:', e);
  }
  loading.value = false;
}

async function fetchSimilarErrors(fingerprint: string) {
  try {
    const dsn = localStorage.getItem('currentDsn') || '';
    const res = await authFetch(`${API_BASE}/errors/group/${fingerprint}/sessions?dsn=${dsn}&limit=20`);
    if (res.ok) {
      const data = await res.json();
      similarErrors.value = data.sessions || [];
    }
  } catch (e) {
    console.error('获取同类错误失败:', e);
  }
}

async function updateStatus(status: ErrorStatus) {
  if (!error.value) return;
  try {
    const res = await authFetch(`${API_BASE}/errors/${error.value.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      const updated = await res.json();
      error.value = { ...error.value, ...updated };
    }
  } catch (e) {
    console.error('更新状态失败:', e);
  }
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN');
}

function openInVSCode(file: string, line: number, column: number) {
  const url = `vscode://file/${file}:${line}:${column}`;
  window.open(url, '_blank');
}

function goBack() {
  router.push('/errors');
}

function viewSimilarError(id: number) {
  router.push(`/errors/${id}`);
}

onMounted(() => {
  fetchErrorDetail();
});
</script>

<template>
  <div class="error-detail-page">
    <!-- 顶部导航 -->
    <div class="page-header">
      <button class="btn-back" @click="goBack">
        ← 返回错误列表
      </button>
      <div class="header-actions">
        <button class="btn-refresh" @click="fetchErrorDetail">
          🔄 刷新
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 错误详情 -->
    <div v-else-if="error" class="detail-container">
      <!-- 错误概览卡片 -->
      <div class="overview-card">
        <div class="overview-header">
          <div class="error-title">
            <span class="badge badge-error">{{ error.type }}</span>
            <h1>{{ error.message }}</h1>
          </div>
          <ErrorStatusBadge 
            :status="error.status || 'open'" 
            @change="updateStatus"
          />
        </div>
        <div class="overview-meta">
          <div class="meta-item">
            <span class="meta-label">错误 ID</span>
            <span class="meta-value">#{{ error.id }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">发生次数</span>
            <span class="meta-value count">{{ error.count }} 次</span>
          </div>
          <div class="meta-item" v-if="error.timestamp">
            <span class="meta-label">最近发生</span>
            <span class="meta-value">{{ formatTime(error.timestamp) }}</span>
          </div>
          <div class="meta-item" v-if="error.fingerprint">
            <span class="meta-label">指纹</span>
            <span class="meta-value fingerprint">{{ error.fingerprint.slice(0, 16) }}...</span>
          </div>
        </div>
      </div>

      <!-- 标签页 -->
      <div class="tabs">
        <button 
          class="tab" 
          :class="{ active: activeTab === 'details' }"
          @click="activeTab = 'details'"
        >
          📋 错误详情
        </button>
        <button 
          class="tab" 
          :class="{ active: activeTab === 'replay' }"
          @click="activeTab = 'replay'"
        >
          🎬 会话回放
          <span v-if="error.sessionReplay" class="badge-dot"></span>
        </button>
        <button 
          class="tab" 
          :class="{ active: activeTab === 'similar' }"
          @click="activeTab = 'similar'"
        >
          📊 同类错误 ({{ similarErrors.length }})
        </button>
      </div>

      <!-- 标签页内容 -->
      <div class="tab-content">
        <!-- 错误详情 -->
        <div v-show="activeTab === 'details'" class="details-panel">
          <div class="detail-section">
            <label>页面 URL</label>
            <p class="url">{{ error.url }}</p>
          </div>

          <div class="detail-section" v-if="error.userAgent">
            <label>用户代理</label>
            <p class="user-agent">{{ error.userAgent }}</p>
          </div>

          <div class="detail-section" v-if="error.resolvedAt">
            <label>解决信息</label>
            <p class="resolved-info">
              {{ error.resolvedBy ? `由 ${error.resolvedBy} ` : '' }}于 {{ formatTime(new Date(error.resolvedAt).getTime()) }} 标记
            </p>
          </div>

          <div class="detail-section" v-if="error.stack">
            <label>原始堆栈</label>
            <pre class="stack">{{ error.stack }}</pre>
          </div>

          <div class="detail-section" v-if="error.parsedStack?.length">
            <label>🗺️ SourceMap 解析结果</label>
            <div class="parsed-stack">
              <div class="frame" v-for="(frame, i) in error.parsedStack" :key="i">
                <div class="frame-row">
                  <div class="frame-original" v-if="frame.originalFile">
                    📍 {{ frame.originalFile }}:{{ frame.originalLine }}:{{ frame.originalColumn }}
                    <span v-if="frame.originalName" class="frame-name">({{ frame.originalName }})</span>
                  </div>
                  <div class="frame-compiled" v-else>
                    {{ frame.file }}:{{ frame.line }}:{{ frame.column }}
                  </div>
                  <button 
                    class="btn-open-ide"
                    @click="openInVSCode(
                      frame.originalFile || frame.file, 
                      frame.originalLine || frame.line, 
                      frame.originalColumn || frame.column
                    )"
                    title="在 VS Code 中打开"
                  >
                    📂 打开
                  </button>
                </div>
                <div v-if="frame.originalFile" class="frame-compiled">
                  ← {{ frame.file }}:{{ frame.line }}:{{ frame.column }}
                </div>
              </div>
            </div>
          </div>

          <div class="detail-section" v-if="!error.parsedStack?.length && error.filename">
            <label>📍 错误位置</label>
            <div class="error-location">
              <span class="location-text">
                {{ error.filename }}:{{ error.lineno }}:{{ error.colno }}
              </span>
              <button 
                class="btn-open-ide"
                @click="openInVSCode(error.filename!, error.lineno || 1, error.colno || 1)"
              >
                📂 打开
              </button>
            </div>
            <p class="hint">💡 上传 SourceMap 可以看到原始源码位置</p>
          </div>

          <div class="detail-section" v-if="error.breadcrumbs?.length">
            <label>用户行为轨迹</label>
            <div class="breadcrumbs">
              <div class="crumb" v-for="(crumb, i) in error.breadcrumbs" :key="i">
                <span class="crumb-type">{{ crumb.type }}</span>
                <span class="crumb-data">{{ JSON.stringify(crumb.data) }}</span>
                <span class="crumb-time">{{ formatTime(crumb.timestamp) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 会话回放 -->
        <div v-show="activeTab === 'replay'" class="replay-panel">
          <SessionReplayPlayer :replay="error.sessionReplay || null" />
        </div>

        <!-- 同类错误 -->
        <div v-show="activeTab === 'similar'" class="similar-panel">
          <div v-if="similarErrors.length === 0" class="empty-similar">
            <p>暂无同类错误记录</p>
          </div>
          <div v-else class="similar-list">
            <div 
              v-for="item in similarErrors" 
              :key="item.id" 
              class="similar-item"
              :class="{ current: item.id === error.id }"
              @click="viewSimilarError(item.id)"
            >
              <div class="similar-info">
                <span class="similar-id">#{{ item.id }}</span>
                <span class="similar-time">{{ formatTime(item.timestamp) }}</span>
              </div>
              <div class="similar-url">{{ item.url }}</div>
              <div class="similar-meta">
                <span v-if="item.hasReplay" class="has-replay">🎬 有回放</span>
                <ErrorStatusBadge :status="item.status || 'open'" :readonly="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.error-detail-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: var(--bg-lighter);
  border-color: var(--primary);
  color: var(--primary);
}

.btn-refresh {
  padding: 8px 16px;
  background: var(--primary);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh:hover {
  background: var(--primary-dark);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  color: var(--text-secondary);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.overview-card {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.error-title {
  flex: 1;
}

.error-title h1 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin: 8px 0 0 0;
  word-break: break-word;
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.badge-error {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.overview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 600;
}

.meta-value {
  font-size: 14px;
  color: var(--text);
}

.meta-value.count {
  color: var(--primary);
  font-weight: 600;
}

.meta-value.fingerprint {
  font-family: Monaco, monospace;
  font-size: 12px;
  color: var(--text-secondary);
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: var(--bg-light);
  border-radius: 12px 12px 0 0;
  overflow: hidden;
}

.tab {
  padding: 14px 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  position: relative;
}

.tab:hover {
  color: var(--text);
  background: var(--bg-lighter);
}

.tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
  background: var(--bg-light);
}

.badge-dot {
  position: absolute;
  top: 10px;
  right: 16px;
  width: 6px;
  height: 6px;
  background: var(--success);
  border-radius: 50%;
}

.tab-content {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-top: none;
  border-radius: 0 0 12px 12px;
  padding: 24px;
  min-height: 400px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  text-transform: uppercase;
  font-weight: 600;
}

.detail-section p {
  color: var(--text);
  margin: 0;
}

.url {
  font-size: 13px;
  color: var(--primary);
  word-break: break-all;
}

.user-agent {
  font-size: 12px;
  color: var(--text-secondary);
  word-break: break-all;
}

.resolved-info {
  font-size: 13px;
  color: var(--success);
}

.stack {
  background: var(--bg);
  color: #e2e8f0;
  padding: 16px;
  border-radius: 8px;
  font-size: 12px;
  font-family: Monaco, monospace;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
  border: 1px solid var(--border);
  max-height: 300px;
  overflow-y: auto;
}

.parsed-stack {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  font-family: Monaco, monospace;
  font-size: 12px;
}

.frame {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}

.frame:last-child {
  border-bottom: none;
}

.frame-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.frame-original {
  color: #4ade80;
}

.frame-compiled {
  color: var(--text-secondary);
  font-size: 11px;
}

.frame-name {
  color: #fbbf24;
}

.btn-open-ide {
  padding: 4px 10px;
  background: var(--bg-lighter);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-open-ide:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.error-location {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 8px;
}

.location-text {
  font-family: Monaco, monospace;
  font-size: 13px;
  color: var(--text);
}

.hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 8px 0 0 0;
}

.breadcrumbs {
  max-height: 300px;
  overflow-y: auto;
}

.crumb {
  display: flex;
  gap: 12px;
  padding: 10px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  margin-bottom: 6px;
  font-size: 12px;
}

.crumb-type {
  font-weight: 600;
  color: var(--primary);
  min-width: 60px;
}

.crumb-data {
  flex: 1;
  color: var(--text);
  word-break: break-all;
}

.crumb-time {
  color: var(--text-secondary);
  white-space: nowrap;
}

/* 同类错误 */
.empty-similar {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.similar-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.similar-item {
  padding: 14px 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.similar-item:hover {
  border-color: var(--primary);
  background: var(--bg-lighter);
}

.similar-item.current {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
}

.similar-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
}

.similar-id {
  font-weight: 600;
  color: var(--text);
}

.similar-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.similar-url {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  word-break: break-all;
}

.similar-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.has-replay {
  font-size: 11px;
  color: var(--success);
}
</style>
