<script setup lang="ts">
defineProps<{
  activeTab: 'errors' | 'performance' | 'overview';
  dsn: string;
}>();

defineEmits<{
  'update:activeTab': [tab: 'errors' | 'performance' | 'overview'];
}>();
</script>

<template>
  <aside class="sidebar">
    <div class="logo">
      <span class="logo-icon">📊</span>
      <span class="logo-text">监控平台</span>
    </div>
    <nav class="nav">
      <a 
        class="nav-item" 
        :class="{ active: activeTab === 'overview' }" 
        @click="$emit('update:activeTab', 'overview')"
      >
        <span>📈</span> 概览
      </a>
      <a 
        class="nav-item" 
        :class="{ active: activeTab === 'errors' }" 
        @click="$emit('update:activeTab', 'errors')"
      >
        <span>🐛</span> 错误列表
      </a>
      <a 
        class="nav-item" 
        :class="{ active: activeTab === 'performance' }" 
        @click="$emit('update:activeTab', 'performance')"
      >
        <span>⚡</span> 性能数据
      </a>
    </nav>
    <div class="sidebar-footer">
      <div class="dsn-badge">DSN: {{ dsn }}</div>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  background: #1e293b;
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
}
.logo {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.logo-icon { font-size: 28px; }
.logo-text { font-size: 18px; font-weight: 600; }
.nav { flex: 1; padding: 16px 0; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}
.nav-item:hover { background: rgba(255,255,255,0.05); color: white; }
.nav-item.active { background: #6366f1; color: white; }
.sidebar-footer { padding: 16px 20px; border-top: 1px solid rgba(255,255,255,0.1); }
.dsn-badge {
  background: rgba(255,255,255,0.1);
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  color: #94a3b8;
}
</style>
