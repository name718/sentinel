<script setup lang="ts">
interface ErrorGroup {
  fingerprint: string;
  type: string;
  message: string;
  normalizedMessage?: string;
  totalCount: number;
  firstSeen: number;
  lastSeen: number;
  affectedUrls: number;
}

defineProps<{
  groups: ErrorGroup[];
  loading?: boolean;
}>();

defineEmits<{
  refresh: [];
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
        <div class="group-item" v-for="group in groups.slice(0, 5)" :key="group.fingerprint">
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
</template>

<style scoped>
.card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 24px;
}
.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-header h2 { font-size: 16px; margin: 0; }
.card-body { padding: 20px; }
.empty { text-align: center; color: #64748b; padding: 40px; }
.btn {
  padding: 4px 10px;
  font-size: 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}
.btn:hover { background: #f1f5f9; }
.error-groups { display: flex; flex-direction: column; gap: 12px; }
.group-item {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 4px solid #ef4444;
}
.group-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.group-type { font-weight: 600; color: #ef4444; }
.group-count { font-size: 14px; color: #64748b; }
.group-message { font-size: 14px; color: #1e293b; margin-bottom: 8px; word-break: break-all; }
.group-meta { font-size: 12px; color: #64748b; }
</style>
