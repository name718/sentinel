<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import type { User } from '../composables/useAuth';
import type { Project } from '../composables/useProject';
import type { RefreshInterval } from '../composables/useAutoRefresh';
import RefreshControl from './RefreshControl.vue';

const props = defineProps<{
  timeRange: string;
  theme: 'light' | 'dark';
  user?: User | null;
  projects: Project[];
  currentProject: Project | null;
  refreshInterval?: RefreshInterval;
  isRefreshing?: boolean;
  lastRefreshTime?: Date | null;
}>();

const emit = defineEmits<{
  'update:timeRange': [range: string];
  'update:refreshInterval': [interval: RefreshInterval];
  'toggleTheme': [];
  'logout': [];
  'switchProject': [project: Project];
  'refresh': [];
}>();

const timeOptions = [
  { value: '1h', label: '最近 1 小时' },
  { value: '24h', label: '最近 24 小时' },
  { value: '7d', label: '最近 7 天' },
  { value: '30d', label: '最近 30 天' },
];

const showProjectDropdown = ref(false);

function selectProject(project: Project) {
  emit('switchProject', project);
  showProjectDropdown.value = false;
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.project-selector')) {
    showProjectDropdown.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

const platformIcons: Record<string, string> = {
  web: '🌐',
  'react-native': '📱',
  electron: '🖥️',
  node: '⚙️'
};
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <!-- 项目选择器 -->
      <div class="project-selector">
        <button 
          class="project-trigger"
          @click.stop="showProjectDropdown = !showProjectDropdown"
        >
          <span class="project-icon">{{ platformIcons[currentProject?.platform || 'web'] || '📦' }}</span>
          <span class="project-name">{{ currentProject?.name || '选择项目' }}</span>
          <svg class="dropdown-arrow" :class="{ open: showProjectDropdown }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        
        <div v-if="showProjectDropdown" class="project-dropdown">
          <div class="dropdown-header">切换项目</div>
          <div class="dropdown-list">
            <button
              v-for="project in projects"
              :key="project.id"
              class="dropdown-item"
              :class="{ active: currentProject?.id === project.id }"
              @click="selectProject(project)"
            >
              <span class="item-icon">{{ platformIcons[project.platform] || '📦' }}</span>
              <div class="item-content">
                <span class="item-name">{{ project.name }}</span>
                <span class="item-stats">{{ project.error_count }} 错误 · {{ project.perf_count }} 性能</span>
              </div>
              <span v-if="currentProject?.id === project.id" class="item-check">✓</span>
            </button>
            <div v-if="projects.length === 0" class="dropdown-empty">
              暂无项目
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="topbar-right">
      <!-- 自动刷新控制 -->
      <RefreshControl
        v-if="refreshInterval !== undefined"
        :interval="refreshInterval"
        :isRefreshing="isRefreshing || false"
        :lastRefreshTime="lastRefreshTime || null"
        @update:interval="$emit('update:refreshInterval', $event)"
        @refresh="$emit('refresh')"
      />
      
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

/* 项目选择器 */
.project-selector {
  position: relative;
}

.project-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 180px;
}

.project-trigger:hover {
  border-color: var(--primary);
  background: var(--bg-lighter);
}

.project-icon {
  font-size: 16px;
}

.project-name {
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-arrow {
  width: 16px;
  height: 16px;
  color: var(--text-secondary);
  transition: transform 0.2s;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.project-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  min-width: 280px;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  overflow: hidden;
  z-index: 100;
}

.dropdown-header {
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border);
}

.dropdown-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 8px;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.dropdown-item:hover {
  background: var(--bg-lighter);
}

.dropdown-item.active {
  background: rgba(99, 102, 241, 0.1);
}

.item-icon {
  font-size: 20px;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-name {
  display: block;
  font-weight: 500;
  margin-bottom: 2px;
}

.item-stats {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
}

.item-check {
  color: var(--primary);
  font-weight: 600;
}

.dropdown-empty {
  padding: 24px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
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
