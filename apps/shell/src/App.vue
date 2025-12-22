<script setup lang="ts">
</script>

<template>
  <div class="app-container">
    <!-- 顶部导航栏 -->
    <header class="top-nav">
      <div class="logo-section">
        <span class="logo">MFPL</span>
        <span class="project-name">Micro Frontend Performance Lab</span>
      </div>
      <div class="github-link">
        <a href="https://github.com" target="_blank">GitHub</a>
      </div>
    </header>
    
    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧侧边栏 -->
      <aside class="sidebar">
        <nav class="sidebar-nav">
          <h3 class="nav-title">实验导航</h3>
          <ul class="nav-list">
            <li class="nav-item active">
              <a href="#">性能实验</a>
            </li>
            <li class="nav-item">
              <a href="#">工程实验</a>
            </li>
            <li class="nav-item">
              <a href="#">Legacy 实验</a>
            </li>
          </ul>
        </nav>
      </aside>
      
      <!-- 子应用挂载区 -->
      <main class="subapp-container">
        <div id="subapp-viewport"></div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #1a1a1a;
  color: #ffffff;
  font-family: Inter, system-ui, sans-serif;
  overflow: hidden;
}

/* 顶部导航栏 */
.top-nav {
  height: 60px;
  background-color: #2d3748;
  border-bottom: 1px solid #4a5568;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: #3b82f6;
}

.project-name {
  font-size: 1rem;
  color: #e2e8f0;
  font-weight: 500;
}

.github-link a {
  color: #e2e8f0;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color 0.2s;
}

.github-link a:hover {
  color: #3b82f6;
}

/* 主内容区 */
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 左侧侧边栏 */
.sidebar {
  width: 250px;
  background-color: #2d3748;
  border-right: 1px solid #4a5568;
  overflow-y: auto;
  padding: 20px 0;
}

.sidebar-nav {
  padding: 0 20px;
}

.nav-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #a0aec0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 12px;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.nav-item {
  margin-bottom: 4px;
}

.nav-item a {
  display: block;
  padding: 10px 12px;
  color: #e2e8f0;
  text-decoration: none;
  border-radius: 6px;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.nav-item a:hover {
  background-color: #4a5568;
  color: #ffffff;
}

.nav-item.active a {
  background-color: #3b82f6;
  color: #ffffff;
  font-weight: 500;
}

/* 子应用挂载区 */
.subapp-container {
  flex: 1;
  background-color: #1a1a1a;
  overflow: auto;
  padding: 20px;
}

#subapp-viewport {
  width: 100%;
  min-height: 100%;
  background-color: #2d3748;
  border-radius: 8px;
  border: 1px solid #4a5568;
  overflow: hidden;
}
</style>
