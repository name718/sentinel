<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const scrolled = ref(false);
const mobileMenuOpen = ref(false);

function handleScroll() {
  scrolled.value = window.scrollY > 20;
}

onMounted(() => window.addEventListener('scroll', handleScroll));
onUnmounted(() => window.removeEventListener('scroll', handleScroll));
</script>

<template>
  <nav class="navbar" :class="{ scrolled }">
    <div class="container">
      <a href="/" class="logo">
        <span class="logo-icon">🔍</span>
        <span class="logo-text">Monitor</span>
      </a>

      <div class="nav-links" :class="{ open: mobileMenuOpen }">
        <a href="#features">功能</a>
        <a href="#sdk">SDK</a>
        <a href="#pricing">价格</a>
        <a href="https://github.com/name718/sentinel" target="_blank">GitHub</a>
      </div>

      <div class="nav-actions">
        <a href="http://localhost:5174/login" class="btn-login">登录</a>
        <a href="http://localhost:5174/register" class="btn-start">免费开始</a>
      </div>

      <button class="mobile-toggle" @click="mobileMenuOpen = !mobileMenuOpen">
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  padding: 20px 0;
  transition: all 0.3s;
}

.navbar.scrolled {
  background: rgba(10, 10, 15, 0.9);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border);
  padding: 12px 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 700;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  background: var(--gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.nav-links {
  display: flex;
  gap: 32px;
}

.nav-links a {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: color 0.2s;
}

.nav-links a:hover {
  color: var(--text);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-login {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: color 0.2s;
}

.btn-login:hover {
  color: var(--text);
}

.btn-start {
  padding: 10px 24px;
  background: var(--gradient);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
}

.mobile-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.mobile-toggle span {
  width: 24px;
  height: 2px;
  background: var(--text);
  border-radius: 2px;
}

@media (max-width: 768px) {
  .nav-links, .nav-actions {
    display: none;
  }
  .mobile-toggle {
    display: flex;
  }
}
</style>
