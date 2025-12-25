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
        <div class="logo-icon">
          <svg viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#6366f1"/>
                <stop offset="50%" stop-color="#8b5cf6"/>
                <stop offset="100%" stop-color="#a855f7"/>
              </linearGradient>
            </defs>
            <circle cx="16" cy="16" r="14" stroke="url(#logo-gradient)" stroke-width="2" fill="none"/>
            <circle cx="16" cy="16" r="6" fill="url(#logo-gradient)"/>
            <circle cx="16" cy="16" r="10" stroke="url(#logo-gradient)" stroke-width="1" stroke-dasharray="4 4" fill="none">
              <animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur="20s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
        <span class="logo-text">Sentinel</span>
      </a>

      <div class="nav-links" :class="{ open: mobileMenuOpen }">
        <a href="#features" class="nav-link">
          <span>功能</span>
          <span class="nav-underline"></span>
        </a>
        <a href="#sdk" class="nav-link">
          <span>SDK</span>
          <span class="nav-underline"></span>
        </a>
        <a href="#pricing" class="nav-link">
          <span>价格</span>
          <span class="nav-underline"></span>
        </a>
        <a href="https://github.com/name718/sentinel" target="_blank" class="nav-link github">
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <span>GitHub</span>
        </a>
      </div>

      <div class="nav-actions">
        <a href="#contact" class="btn-start">
          <span>联系我们</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </div>

      <button class="mobile-toggle" @click="mobileMenuOpen = !mobileMenuOpen" :class="{ active: mobileMenuOpen }">
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
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.navbar.scrolled {
  background: rgba(10, 10, 15, 0.85);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 12px 0;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
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
  gap: 12px;
  font-size: 22px;
  font-weight: 700;
}

.logo-icon {
  width: 36px;
  height: 36px;
}

.logo-icon svg {
  width: 100%;
  height: 100%;
}

.logo-text {
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  background-size: 200% 200%;
  animation: gradient-shift 5s ease infinite;
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.nav-links {
  display: flex;
  gap: 8px;
}

.nav-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  border-radius: 8px;
  transition: all 0.3s;
}

.nav-link:hover {
  color: var(--text);
  background: rgba(255, 255, 255, 0.05);
}

.nav-underline {
  position: absolute;
  bottom: 6px;
  left: 16px;
  right: 16px;
  height: 2px;
  background: linear-gradient(90deg, #6366f1, #a855f7);
  border-radius: 1px;
  transform: scaleX(0);
  transition: transform 0.3s;
}

.nav-link:hover .nav-underline {
  transform: scaleX(1);
}

.nav-link.github {
  color: var(--text);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-start {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.btn-start::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: 0.5s;
}

.btn-start:hover::before {
  left: 100%;
}

.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(99, 102, 241, 0.5);
}

.mobile-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.mobile-toggle:hover {
  background: rgba(255, 255, 255, 0.05);
}

.mobile-toggle span {
  width: 24px;
  height: 2px;
  background: var(--text);
  border-radius: 2px;
  transition: all 0.3s;
}

.mobile-toggle.active span:nth-child(1) {
  transform: rotate(45deg) translate(5px, 5px);
}

.mobile-toggle.active span:nth-child(2) {
  opacity: 0;
}

.mobile-toggle.active span:nth-child(3) {
  transform: rotate(-45deg) translate(5px, -5px);
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
