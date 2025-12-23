import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// 在 Vue 挂载前初始化主题，避免闪烁
function initThemeEarly() {
  const stored = localStorage.getItem('monitor-dashboard-theme');
  let theme: 'light' | 'dark' = 'dark';
  
  if (stored === 'light') {
    theme = 'light';
  } else if (stored === 'dark') {
    theme = 'dark';
  } else if (stored === 'system' || !stored) {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  document.documentElement.setAttribute('data-theme', theme);
}

initThemeEarly();

createApp(App).use(router).mount('#app');
