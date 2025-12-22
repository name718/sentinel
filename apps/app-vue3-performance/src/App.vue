<script setup lang="ts">
</script>

<template>
  <div class="app-container">
    <h1 class="app-title">Vue3 性能实验</h1>
    <p class="app-description">这是一个基于 Vue3 + Vite 的性能实验子应用</p>
    <div class="app-content">
      <p>当前应用运行模式：<span class="mode">{{ (window as any).__POWERED_BY_QIANKUN__ ? '微前端模式' : '独立运行模式' }}</span></p>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  padding: 20px;
  text-align: center;
  background-color: #2d3748;
  min-height: 100vh;
  color: #ffffff;
}

.app-title {
  font-size: 2rem;
  color: #3b82f6;
  margin-bottom: 1rem;
}

.app-description {
  font-size: 1.1rem;
  color: #a0aec0;
  margin-bottom: 2rem;
}

.app-content {
  background-color: #1a1a1a;
  padding: 20px;
  border-radius: 8px;
  display: inline-block;
  text-align: left;
}

.mode {
  color: #48bb78;
  font-weight: 600;
}
</style>
