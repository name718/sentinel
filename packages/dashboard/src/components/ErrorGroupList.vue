<script setup lang="ts">
import ErrorStatusBadge from './ErrorStatusBadge.vue';

type ErrorStatus = 'open' | 'processing' | 'resolved' | 'ignored';

interface ErrorGroup {
  fingerprint: string;
  type: string;
  message: string;
  normalizedMessage?: string;
  totalCount: number;
  firstSeen: number;
  lastSeen: number;
  affectedUrls: number;
  status?: ErrorStatus;
}

defineProps<{
  groups: ErrorGroup[];
  loading?: boolean;
}>();

defineEmits<{
  refresh: [];
  updateGroupStatus: [fingerprint: string, status: ErrorStatus];
}>();

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN');
}
</script>

<template>
  <div class="card">
    <div class="card-header">
      <h2>🔥 热门错误</h2>
      <button class="btn btn-sm" @click="$emit('refresh')">刷新</button>
    </div>
    <div class="card-body">
      <div v-if="groups.length === 0" class="empty">暂无数据</div>
      <div v-else class="error-groups">
        <div 
          class="group-item" 
          v-for="group in groups.slice(0, 5)" 
          :key="group.fingerprint"
          :class="{ 'group-resolved': group.status === 'resolved', 'group-ignored': group.status === 'ignored' }"
        >
          <div class="group-header">
            <span class="group-type">{{ group.type }}</span>
            <div class="group-header-right">
              <ErrorStatusBadge 
                :status="group.status || 'open'" 
                @change="$emit('updateGroupStatus', group.fingerprint, $event)"
              />
              <span class="group-count">{{ group.totalCount }} 次</span>
            </div>
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
</template>

<style scoped>
.card {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 24px;
}
.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-header h2 { 
  font-size: 16px; 
  margin: 0;
  color: var(--text);
}
.card-body { padding: 20px; }
.empty { 
  text-align: center; 
  color: var(--text-secondary); 
  padding: 40px; 
}
.btn {
  padding: 4px 10px;
  font-size: 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: var(--bg);
  border: 1px solid var(--border);
  color: var(--text);
  transition: all 0.2s;
}
.btn:hover { 
  background: var(--bg-lighter);
}
.error-groups { 
  display: flex; 
  flex-direction: column; 
  gap: 12px; 
}
.group-item {
  padding: 16px;
  background: var(--bg);
  border-radius: 8px;
  border-left: 4px solid #ef4444;
  transition: opacity 0.2s;
}
.group-item.group-resolved {
  border-left-color: #10b981;
  opacity: 0.7;
}
.group-item.group-ignored {
  border-left-color: #6b7280;
  opacity: 0.5;
}
.group-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center;
  margin-bottom: 8px; 
}
.group-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
.group-type { 
  font-weight: 600; 
  color: #ef4444; 
}
.group-count { 
  font-size: 14px; 
  color: var(--text-secondary); 
}
.group-message { 
  font-size: 14px; 
  color: var(--text); 
  margin-bottom: 8px; 
  word-break: break-all; 
}
.group-meta { 
  font-size: 12px; 
  color: var(--text-secondary); 
}
</style>
