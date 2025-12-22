<script setup lang="ts">
defineProps<{
  initialized: boolean;
}>();

defineEmits<{
  init: [];
}>();
</script>

<template>
  <header class="header">
    <div class="container">
      <div class="logo">
        <span class="logo-icon">🔍</span>
        <span class="logo-text">Monitor SDK</span>
        <span class="badge">Demo</span>
      </div>
      
      <nav class="nav">
        <a href="http://localhost:5174" target="_blank" class="nav-link">
          📊 Dashboard
        </a>
        <button 
          class="btn-init" 
          :class="{ active: initialized }"
          @click="$emit('init')"
        >
          <span class="status-dot" :class="{ active: initialized }"></span>
          {{ initialized ? 'SDK 已启动' : '启动 SDK' }}
        </button>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.header {
  background: var(--bg-light);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.badge {
  padding: 4px 12px;
  background: var(--primary);
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.nav {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.nav-link:hover {
  color: var(--text);
}

.btn-init {
  padding: 10px 20px;
  background: var(--bg-lighter);
  border: 2px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-init:hover {
  border-color: var(--primary);
  background: var(--primary);
}

.btn-init.active {
  background: var(--success);
  border-color: var(--success);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-secondary);
}

.status-dot.active {
  background: white;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
