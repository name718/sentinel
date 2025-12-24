<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Monitor } from '@monitor/sdk';
import Header from './components/Header.vue';
import Hero from './components/Hero.vue';
import Features from './components/Features.vue';
import ErrorDemo from './components/ErrorDemo.vue';
import AlertDemo from './components/AlertDemo.vue';
import SessionDemo from './components/SessionDemo.vue';
import Console from './components/Console.vue';

const CONFIG = {
  dsn: 'demo-app',
  reportUrl: 'http://localhost:3000/api/report',
  serverUrl: 'http://localhost:3000'
};

const logs = ref<{ time: string; msg: string; type: string }[]>([]);

function log(msg: string, type = 'info') {
  const time = new Date().toLocaleTimeString();
  logs.value.push({ time, msg, type });
}

function initSDK() {
  try {
    const monitor = Monitor.getInstance();
    monitor.init({
      dsn: CONFIG.dsn,
      reportUrl: CONFIG.reportUrl,
      maxBreadcrumbs: 20,
      batchSize: 3,
      reportInterval: 5000,
      errorSampleRate: 1.0,
      performanceSampleRate: 1.0,
      enableSessionReplay: true,
      sessionReplay: {
        maxDuration: 30,
        maskAllInputs: true,
        errorReplayDuration: 10,
      },
    });

    monitor.setUser({
      id: 'demo_' + Math.random().toString(36).substr(2, 9),
      username: 'demo_user',
      email: 'demo@example.com'
    });

    monitor.setContext({
      version: '1.0.0',
      environment: 'demo',
    });

    log('✅ SDK 初始化成功', 'success');
  } catch (e) {
    log('❌ 初始化失败: ' + (e as Error).message, 'error');
  }
}

onMounted(() => {
  initSDK();
});

defineExpose({ log });
</script>

<template>
  <div class="app">
    <Header />
    
    <main class="main">
      <Hero />
      <Features />
      <ErrorDemo @log="log" />
      <AlertDemo @log="log" />
      <SessionDemo @log="log" />
    </main>

    <Console :logs="logs" @clear="logs = []" />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --bg: #0f172a;
  --bg-light: #1e293b;
  --bg-lighter: #334155;
  --text: #f1f5f9;
  --text-secondary: #94a3b8;
  --border: #334155;
  --card-bg: #1e293b;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

.app {
  min-height: 100vh;
  padding-bottom: 300px;
}

.main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}
</style>
