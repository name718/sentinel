<script setup lang="ts">
defineProps<{
  timeRange: string;
  dsn: string;
  theme: 'light' | 'dark';
}>();

defineEmits<{
  'update:timeRange': [range: string];
  'toggleTheme': [];
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
      
      <!-- 主题切换按钮 -->
      <button 
        class="theme-toggle" 
        @click="$emit('toggleTheme')"
        :title="theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'"
      >
        <!-- 太阳图标（浅色模式时显示） -->
        <svg v-if="theme === 'light'" class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <!-- 月亮图标（深色模式时显示） -->
        <svg v-else class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>
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

/* 主题切换按钮 */
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.theme-toggle:hover {
  background: var(--bg-lighter);
  color: var(--text);
  border-color: var(--primary);
}

.theme-icon {
  width: 20px;
  height: 20px;
}
</style>
