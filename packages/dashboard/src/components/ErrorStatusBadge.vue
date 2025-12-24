<script setup lang="ts">
import { ref, computed } from 'vue';

type ErrorStatus = 'open' | 'processing' | 'resolved' | 'ignored';

const props = defineProps<{
  status: ErrorStatus;
  editable?: boolean;
}>();

const emit = defineEmits<{
  change: [status: ErrorStatus];
}>();

const showDropdown = ref(false);

const statusConfig: Record<ErrorStatus, { label: string; icon: string; color: string; bg: string }> = {
  open: { label: '待处理', icon: '🔴', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  processing: { label: '处理中', icon: '🟡', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
  resolved: { label: '已解决', icon: '🟢', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
  ignored: { label: '已忽略', icon: '⚪', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' }
};

const currentConfig = computed(() => statusConfig[props.status]);

const allStatuses: ErrorStatus[] = ['open', 'processing', 'resolved', 'ignored'];

function selectStatus(status: ErrorStatus) {
  if (status !== props.status) {
    emit('change', status);
  }
  showDropdown.value = false;
}

function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.closest('.status-dropdown-wrapper')) {
    showDropdown.value = false;
  }
}

// 点击外部关闭
if (typeof window !== 'undefined') {
  document.addEventListener('click', handleClickOutside);
}
</script>

<template>
  <div class="status-dropdown-wrapper">
    <button 
      class="status-badge" 
      :style="{ 
        color: currentConfig.color, 
        background: currentConfig.bg,
        borderColor: currentConfig.color + '33'
      }"
      @click.stop="showDropdown = !showDropdown"
    >
      <span class="status-icon">{{ currentConfig.icon }}</span>
      <span class="status-label">{{ currentConfig.label }}</span>
      <span class="dropdown-arrow">▼</span>
    </button>
    
    <div v-if="showDropdown" class="status-dropdown">
      <button 
        v-for="s in allStatuses" 
        :key="s"
        class="status-option"
        :class="{ active: s === status }"
        @click.stop="selectStatus(s)"
      >
        <span class="status-icon">{{ statusConfig[s].icon }}</span>
        <span>{{ statusConfig[s].label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.status-dropdown-wrapper {
  position: relative;
  display: inline-block;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.2s;
}

.status-badge:hover {
  filter: brightness(0.95);
}

.status-icon {
  font-size: 10px;
}

.dropdown-arrow {
  font-size: 8px;
  margin-left: 2px;
  opacity: 0.6;
}

.status-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 120px;
  overflow: hidden;
}

.status-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--text);
  transition: background 0.15s;
}

.status-option:hover {
  background: var(--bg);
}

.status-option.active {
  background: var(--primary);
  color: white;
}
</style>
