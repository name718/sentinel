<script setup lang="ts">
defineProps<{
  timeRange: string;
  dsn: string;
}>();

defineEmits<{
  'update:timeRange': [range: string];
}>();

const timeOptions = [
  { value: '1h', label: '最近 1 小时' },
  { value: '24h', label: '最近 24 小时' },
  { value: '7d', label: '最近 7 天' },
  { value: '30d', label: '最近 30 天' },
];
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <div class="project-info">
        <span class="project-label">项目</span>
        <span class="project-name">{{ dsn }}</span>
      </div>
    </div>

    <div class="topbar-right">
      <div class="time-selector">
        <button
          v-for="option in timeOptions"
          :key="option.value"
          class="time-option"
          :class="{ active: timeRange === option.value }"
          @click="$emit('update:timeRange', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: 64px;
  background: var(--bg-light);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.project-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.project-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  padding: 4px 12px;
  background: var(--bg-lighter);
  border-radius: 6px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.time-selector {
  display: flex;
  gap: 4px;
  background: var(--bg);
  padding: 4px;
  border-radius: 8px;
}

.time-option {
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.time-option:hover {
  background: var(--bg-lighter);
  color: var(--text);
}

.time-option.active {
  background: var(--primary);
  color: white;
}
</style>
