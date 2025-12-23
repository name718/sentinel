<script setup lang="ts">
import { useTheme } from './composables/useTheme';

// 初始化主题
useTheme();
</script>

<template>
  <router-view />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 深色主题（默认） */
:root,
:root[data-theme="dark"] {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --primary-light: #818cf8;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --bg: #0f172a;
  --bg-light: #1e293b;
  --bg-lighter: #334155;
  --text: #f1f5f9;
  --text-secondary: #94a3b8;
  --border: #334155;
  --sidebar-width: 240px;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
  --card-bg: #1e293b;
}

/* 浅色主题 */
:root[data-theme="light"] {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --primary-light: #a5b4fc;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --bg: #f8fafc;
  --bg-light: #ffffff;
  --bg-lighter: #f1f5f9;
  --text: #1e293b;
  --text-secondary: #64748b;
  --border: #e2e8f0;
  --sidebar-width: 240px;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --card-bg: #ffffff;
}

/* 主题切换过渡 */
.theme-transition,
.theme-transition *,
.theme-transition *::before,
.theme-transition *::after {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease !important;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  overflow-x: hidden;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg);
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--bg-lighter);
}
</style>
