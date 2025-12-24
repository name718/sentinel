<script setup lang="ts">
import { ref } from 'vue';
import SessionReplayPlayer from './SessionReplayPlayer.vue';
import ErrorStatusBadge from './ErrorStatusBadge.vue';

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

defineProps<{
  error: ErrorDetail | null;
}>();

defineEmits<{
  close: [];
  updateStatus: [id: number, status: ErrorStatus];
}>();

const activeTab = ref<'details' | 'replay'>('details');

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN');
}

/**
 * 在 VS Code 中打开文件
 */
function openInVSCode(file: string, line: number, column: number) {
  // 使用 VS Code URL Scheme
  const url = `vscode://file/${file}:${line}:${column}`;
  window.open(url, '_blank');
}
</script>

<template>
  <div v-if="error" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>错误详情 #{{ error.id }}</h2>
        <button class="modal-close" @click="$emit('close')">✕</button>
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
      </div>
      
      <div class="modal-body">
        <!-- 错误详情标签页 -->
        <div v-show="activeTab === 'details'" class="tab-content">
          <div class="detail-row">
            <div class="detail-section">
              <label>类型</label>
              <span class="badge badge-error">{{ error.type }}</span>
            </div>
            <div class="detail-section">
              <label>状态</label>
              <ErrorStatusBadge 
                :status="error.status || 'open'" 
                @change="$emit('updateStatus', error.id, $event)"
              />
            </div>
            <div class="detail-section">
              <label>发生次数</label>
              <span class="badge badge-count">{{ error.count }} 次</span>
            </div>
          </div>
          <div class="detail-section" v-if="error.resolvedAt">
            <label>解决信息</label>
            <p class="resolved-info">
              {{ error.resolvedBy ? `由 ${error.resolvedBy} ` : '' }}于 {{ new Date(error.resolvedAt).toLocaleString('zh-CN') }} 标记
            </p>
          </div>
          <div class="detail-section">
            <label>错误信息</label>
            <p>{{ error.message }}</p>
          </div>
          <div class="detail-section">
            <label>页面 URL</label>
            <p class="url">{{ error.url }}</p>
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
          
          <!-- 没有 parsedStack 时，显示简单的打开按钮 -->
          <div class="detail-section" v-if="!error.parsedStack?.length && error.filename">
            <label>📍 错误位置</label>
            <div class="error-location">
              <span class="location-text">
                {{ error.filename }}:{{ error.lineno }}:{{ error.colno }}
              </span>
              <button 
                class="btn-open-ide"
                @click="openInVSCode(error.filename!, error.lineno || 1, error.colno || 1)"
                title="在 VS Code 中打开"
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
        
        <!-- 会话回放标签页 -->
        <div v-show="activeTab === 'replay'" class="tab-content">
          <SessionReplayPlayer :replay="error.sessionReplay || null" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  width: 90%;
  max-width: 1200px;
  max-height: 90vh;
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
.modal-header h2 { 
  font-size: 18px; 
  margin: 0;
  color: var(--text);
}
.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: color 0.2s;
}
.modal-close:hover {
  color: var(--text);
}

/* 标签页 */
.tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}
.tab {
  padding: 12px 24px;
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
  top: 8px;
  right: 16px;
  width: 6px;
  height: 6px;
  background: var(--success);
  border-radius: 50%;
}

.modal-body { 
  padding: 20px; 
  overflow-y: auto; 
  flex: 1;
}
.tab-content {
  animation: fadeIn 0.2s;
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.detail-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}
.detail-row .detail-section {
  flex: 0 0 auto;
}
.detail-section { margin-bottom: 20px; }
.detail-section label { 
  display: block; 
  font-size: 12px; 
  color: var(--text-secondary); 
  margin-bottom: 6px; 
  text-transform: uppercase; 
  font-weight: 600;
}
.detail-section p { 
  color: var(--text); 
  margin: 0; 
}
.detail-section .url { 
  font-size: 13px; 
  color: var(--primary); 
  word-break: break-all; 
}
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.badge-error { 
  background: rgba(239, 68, 68, 0.1); 
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.2);
}
.badge-count { 
  background: rgba(99, 102, 241, 0.1); 
  color: var(--primary);
  border: 1px solid rgba(99, 102, 241, 0.2);
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
  padding: 8px 0; 
  border-bottom: 1px solid var(--border);
}
.frame:last-child { border-bottom: none; }
.frame-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.frame-original { color: #4ade80; }
.frame-compiled { color: var(--text-secondary); font-size: 11px; }
.frame-name { color: #fbbf24; }
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
.resolved-info {
  font-size: 13px;
  color: var(--success);
  margin: 0;
}
.breadcrumbs { max-height: 200px; overflow-y: auto; }
.crumb {
  display: flex;
  gap: 12px;
  padding: 8px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  margin-bottom: 4px;
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
.crumb-time { color: var(--text-secondary); }
</style>
