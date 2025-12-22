<script setup lang="ts">
import { ref } from 'vue';

interface Log {
  time: string;
  msg: string;
  type: string;
}

defineProps<{
  logs: Log[];
}>();

defineEmits<{
  clear: [];
}>();

const isExpanded = ref(true);

function formatTime(time: string) {
  return time;
}
</script>

<template>
  <div class="console" :class="{ collapsed: !isExpanded }">
    <div class="console-header" @click="isExpanded = !isExpanded">
      <div class="header-left">
        <span class="console-icon">💻</span>
        <span class="console-title">实时日志</span>
        <span class="log-count">{{ logs.length }}</span>
      </div>
      <div class="header-right">
        <button class="btn-clear" @click.stop="$emit('clear')" v-if="logs.length > 0">
          清空
        </button>
        <button class="btn-toggle">
          {{ isExpanded ? '▼' : '▲' }}
        </button>
      </div>
    </div>
    
    <div class="console-body" v-show="isExpanded">
      <div class="log-list">
        <div 
          v-for="(log, i) in logs" 
          :key="i" 
          class="log-item"
          :class="`log-${log.type}`"
        >
          <span class="log-time">{{ formatTime(log.time) }}</span>
          <span class="log-message">{{ log.msg }}</span>
        </div>
        <div v-if="logs.length === 0" class="log-empty">
          暂无日志，开始操作后会显示实时日志
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.console {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #0a0f1e;
  border-top: 2px solid var(--border);
  z-index: 1000;
  transition: all 0.3s;
  box-shadow: 0 -4px 24px rgba(0,0,0,0.5);
}

.console.collapsed {
  bottom: -250px;
}

.console-header {
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  user-select: none;
  background: #0f1419;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.console-icon {
  font-size: 20px;
}

.console-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}

.log-count {
  padding: 2px 8px;
  background: var(--primary);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

.header-right {
  display: flex;
  gap: 8px;
}

.btn-clear,
.btn-toggle {
  padding: 6px 12px;
  background: var(--bg-lighter);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear:hover,
.btn-toggle:hover {
  background: var(--border);
}

.console-body {
  height: 250px;
  overflow-y: auto;
  padding: 0;
}

.log-list {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
}

.log-item {
  padding: 8px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  gap: 16px;
  transition: background 0.2s;
}

.log-item:hover {
  background: rgba(255,255,255,0.02);
}

.log-time {
  color: #64748b;
  min-width: 80px;
}

.log-message {
  flex: 1;
  color: var(--text);
}

.log-info .log-message {
  color: #60a5fa;
}

.log-success .log-message {
  color: #4ade80;
}

.log-warn .log-message {
  color: #fbbf24;
}

.log-error .log-message {
  color: #f87171;
}

.log-empty {
  padding: 40px 24px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

/* 滚动条样式 */
.console-body::-webkit-scrollbar {
  width: 8px;
}

.console-body::-webkit-scrollbar-track {
  background: #0a0f1e;
}

.console-body::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

.console-body::-webkit-scrollbar-thumb:hover {
  background: var(--bg-lighter);
}
</style>
