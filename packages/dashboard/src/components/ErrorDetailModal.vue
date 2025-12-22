<script setup lang="ts">
interface ErrorDetail {
  id: number;
  type: string;
  message: string;
  count: number;
  url: string;
  stack?: string;
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
}

defineProps<{
  error: ErrorDetail | null;
}>();

defineEmits<{
  close: [];
}>();

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN');
}
</script>

<template>
  <div v-if="error" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <h2>错误详情 #{{ error.id }}</h2>
        <button class="modal-close" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <div class="detail-section">
          <label>类型</label>
          <span class="badge badge-error">{{ error.type }}</span>
        </div>
        <div class="detail-section">
          <label>错误信息</label>
          <p>{{ error.message }}</p>
        </div>
        <div class="detail-section">
          <label>发生次数</label>
          <span class="badge badge-count">{{ error.count }} 次</span>
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
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: #ffffff;
  border-radius: 12px;
  width: 800px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h2 { font-size: 18px; margin: 0; }
.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #64748b;
}
.modal-body { padding: 20px; overflow-y: auto; }
.detail-section { margin-bottom: 20px; }
.detail-section label { 
  display: block; 
  font-size: 12px; 
  color: #64748b; 
  margin-bottom: 6px; 
  text-transform: uppercase; 
}
.detail-section p { color: #1e293b; margin: 0; }
.detail-section .url { font-size: 13px; color: #6366f1; word-break: break-all; }
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.badge-error { background: #fef2f2; color: #dc2626; }
.badge-count { background: #f0f9ff; color: #0369a1; }
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
  margin: 0;
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
.crumb-type { font-weight: 600; color: #6366f1; min-width: 60px; }
.crumb-data { flex: 1; color: #1e293b; word-break: break-all; }
.crumb-time { color: #64748b; }
</style>
