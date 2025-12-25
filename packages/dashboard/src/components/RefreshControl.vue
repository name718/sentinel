<script setup lang="ts">
import { computed } from 'vue';
import type { RefreshInterval } from '../composables/useAutoRefresh';

const props = defineProps<{
  interval: RefreshInterval;
  isRefreshing: boolean;
  lastRefreshTime: Date | null;
}>();

const emit = defineEmits<{
  'update:interval': [value: RefreshInterval];
  refresh: [];
}>();

const intervals: RefreshInterval[] = ['off', '10s', '30s', '1m', '5m'];

const intervalLabels: Record<RefreshInterval, string> = {
  'off': '关闭',
  '10s': '10 秒',
  '30s': '30 秒',
  '1m': '1 分钟',
  '5m': '5 分钟',
};

const lastRefreshText = computed(() => {
  if (!props.lastRefreshTime) return '';
  return props.lastRefreshTime.toLocaleTimeString('zh-CN');
});
</script>

<template>
  <div class="refresh-control">
    <button 
      class="btn-refresh" 
      :class="{ refreshing: isRefreshing }"
      @click="emit('refresh')"
      :disabled="isRefreshing"
      title="立即刷新"
    >
      <span class="refresh-icon">🔄</span>
    </button>
    
    <div class="interval-selector">
      <label>自动刷新</label>
      <select 
        :value="interval" 
        @change="emit('update:interval', ($event.target as HTMLSelectElement).value as RefreshInterval)"
      >
        <option v-for="int in intervals" :key="int" :value="int">
          {{ intervalLabels[int] }}
        </option>
      </select>
    </div>
    
    <span v-if="lastRefreshTime" class="last-refresh">
      上次: {{ lastRefreshText }}
    </span>
  </div>
</template>

<style scoped>
.refresh-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-refresh {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh:hover:not(:disabled) {
  background: var(--bg-lighter);
  border-color: var(--primary);
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-refresh.refreshing .refresh-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.refresh-icon {
  font-size: 16px;
  display: inline-block;
}

.interval-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.interval-selector label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.interval-selector select {
  padding: 6px 10px;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
}

.interval-selector select:focus {
  outline: none;
  border-color: var(--primary);
}

.last-refresh {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}
</style>
