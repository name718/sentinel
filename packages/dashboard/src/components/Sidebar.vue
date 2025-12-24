<script setup lang="ts">
import type { User } from '../composables/useAuth';

defineProps<{
  activeTab: string;
  user?: User | null;
}>();

defineEmits<{
  'update:activeTab': [tab: string];
  'logout': [];
}>();
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <div class="logo">
        <span class="logo-icon">🔍</span>
        <span class="logo-text">Monitor</span>
      </div>
      <div class="version">v1.0.0</div>
    </div>

    <nav class="nav">
      <button 
        class="nav-item" 
        :class="{ active: activeTab === 'overview' }"
        @click="$emit('update:activeTab', 'overview')"
      >
        <span class="nav-icon">📊</span>
        <span class="nav-text">概览</span>
      </button>

      <button 
        class="nav-item" 
        :class="{ active: activeTab === 'errors' }"
        @click="$emit('update:activeTab', 'errors')"
      >
        <span class="nav-icon">🐛</span>
        <span class="nav-text">错误监控</span>
      </button>

      <button 
        class="nav-item" 
        :class="{ active: activeTab === 'performance' }"
        @click="$emit('update:activeTab', 'performance')"
      >
        <span class="nav-icon">⚡</span>
        <span class="nav-text">性能分析</span>
      </button>

      <button 
        class="nav-item" 
        :class="{ active: activeTab === 'alerts' }"
        @click="$emit('update:activeTab', 'alerts')"
      >
        <span class="nav-icon">🔔</span>
        <span class="nav-text">告警配置</span>
      </button>

      <button 
        class="nav-item" 
        :class="{ active: activeTab === 'projects' }"
        @click="$emit('update:activeTab', 'projects')"
      >
        <span class="nav-icon">📦</span>
        <span class="nav-text">项目管理</span>
      </button>
    </nav>

    <div class="sidebar-footer">
      <div v-if="user" class="user-info">
        <div class="user-avatar">{{ user.name?.charAt(0).toUpperCase() || '?' }}</div>
        <div class="user-details">
          <span class="user-name">{{ user.name }}</span>
          <span class="user-role">{{ user.role }}</span>
        </div>
        <button class="logout-btn" @click="$emit('logout')" title="退出登录">
          <span>🚪</span>
        </button>
      </div>
      <a href="http://localhost:5173" target="_blank" class="footer-link">
        <span class="footer-icon">🎯</span>
        <span class="footer-text">Demo App</span>
      </a>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--sidebar-width);
  background: var(--bg-light);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  z-index: 100;
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid var(--border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
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

.version {
  font-size: 11px;
  color: var(--text-secondary);
  padding-left: 40px;
}

.nav {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.nav-item:hover {
  background: var(--bg-lighter);
  color: var(--text);
}

.nav-item.active {
  background: var(--primary);
  color: white;
}

.nav-icon {
  font-size: 18px;
}

.nav-text {
  flex: 1;
}

.sidebar-footer {
  padding: 16px 12px;
  border-top: 1px solid var(--border);
}

.footer-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-lighter);
  border-radius: 8px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13px;
  transition: all 0.2s;
}

.footer-link:hover {
  background: var(--border);
  color: var(--text);
}

.footer-icon {
  font-size: 16px;
}

/* 用户信息 */
.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  margin-bottom: 8px;
  background: var(--bg-lighter);
  border-radius: 8px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  background: var(--primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
}

.user-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 11px;
  color: var(--text-secondary);
}

.logout-btn {
  background: transparent;
  border: none;
  padding: 6px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: var(--border);
}
</style>
