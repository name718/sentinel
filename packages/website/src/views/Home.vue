<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const features = [
  { icon: '🐛', title: '错误监控', desc: '自动捕获 JS 错误、Promise 异常、资源加载失败，智能聚合相似错误' },
  { icon: '⚡', title: '性能分析', desc: 'Core Web Vitals 全覆盖 (FCP/LCP/FID/CLS/TTFB)，资源加载瀑布图' },
  { icon: '🎬', title: '会话回放', desc: '基于 rrweb 录制用户操作，完整还原错误现场，快速定位问题' },
  { icon: '🗺️', title: 'SourceMap 解析', desc: '自动还原压缩代码到源码位置，精准定位错误行号' },
  { icon: '🔔', title: '智能告警', desc: '新错误、阈值、激增多种告警规则，邮件通知，冷却机制防轰炸' },
  { icon: '🚀', title: 'Web Worker', desc: '数据处理不阻塞主线程，零性能影响，批量上报优化' },
  { icon: '📦', title: '多项目管理', desc: '一个平台管理多个应用，项目隔离，独立 DSN 标识' },
  { icon: '🔧', title: '构建插件', desc: 'Vite/Webpack 插件，构建时自动上传 SourceMap，零配置接入' },
  { icon: '👤', title: '用户追踪', desc: '关联用户信息，追踪用户行为轨迹，面包屑记录' },
  { icon: '📊', title: '数据可视化', desc: 'ECharts 图表展示，错误趋势、性能评分、资源分析' },
  { icon: '🔐', title: '安全认证', desc: 'JWT 身份认证，项目权限控制，数据安全隔离' },
  { icon: '💻', title: 'VSCode 插件', desc: '在编辑器中直接查看错误，一键跳转源码位置' }
];

const codeExample = `import { Monitor } from '@anthropic/sentinel';

Monitor.getInstance().init({
  dsn: 'your-project-dsn',
  reportUrl: 'https://your-server.com/api/report',
  enableSessionReplay: true,
});`;

// 订阅表单
const email = ref('');
const submitting = ref(false);
const submitStatus = ref<'idle' | 'success' | 'error'>('idle');
const submitMessage = ref('');

// 粒子动画
const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationId: number;
let particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number }> = [];

function initParticles() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const resize = () => {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  resize();
  window.addEventListener('resize', resize);

  // 创建粒子
  const w = canvas.width;
  const h = canvas.height;
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.2
    });
  }

  function animate() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99, 102, 241, ${p.opacity})`;
      ctx.fill();
      
      // 连线
      particles.slice(i + 1).forEach(p2 => {
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(99, 102, 241, ${0.1 * (1 - dist / 150)})`;
          ctx.stroke();
        }
      });
    });
    
    animationId = requestAnimationFrame(animate);
  }
  animate();
}

onMounted(() => {
  initParticles();
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
});

function copyCode() {
  navigator.clipboard.writeText(codeExample);
}

async function handleSubscribe() {
  if (!email.value || submitting.value) return;
  submitting.value = true;
  submitStatus.value = 'idle';
  
  try {
    const res = await fetch('http://localhost:3000/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, source: 'website-hero' })
    });
    const data = await res.json();
    if (res.ok) {
      submitStatus.value = 'success';
      submitMessage.value = data.message || '订阅成功！';
      email.value = '';
    } else {
      submitStatus.value = 'error';
      submitMessage.value = data.error || '订阅失败';
    }
  } catch {
    submitStatus.value = 'error';
    submitMessage.value = '网络错误，请稍后重试';
  }
  submitting.value = false;
}
</script>

<template>
  <main>
    <!-- 粒子背景 -->
    <canvas ref="canvasRef" class="particles-canvas"></canvas>
    
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-glow"></div>
      <div class="hero-glow-2"></div>
      <div class="container">
        <div class="hero-badge animate-float">
          <span class="badge-dot"></span>
          开源免费 · 轻量高效
        </div>
        <h1 class="hero-title">
          <span class="title-line">前端监控</span>
          <span class="title-line gradient-text glitch" data-text="从未如此简单">从未如此简单</span>
        </h1>
        <p class="hero-desc">
          一行代码接入，实时错误追踪、性能分析、用户行为回放<br>
          帮助你快速定位问题，提升用户体验
        </p>
        
        <!-- 订阅表单 -->
        <div class="subscribe-form glass-card">
          <form @submit.prevent="handleSubscribe">
            <div class="input-wrapper">
              <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <input v-model="email" type="email" placeholder="输入邮箱，获取最新动态" :disabled="submitting" />
            </div>
            <button type="submit" class="btn-glow" :disabled="submitting || !email">
              <span>{{ submitting ? '提交中...' : '立即订阅' }}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </form>
          <p v-if="submitStatus === 'success'" class="form-message success">✓ {{ submitMessage }}</p>
          <p v-if="submitStatus === 'error'" class="form-message error">{{ submitMessage }}</p>
        </div>
        
        <div class="hero-stats">
          <div class="stat glass-card">
            <div class="stat-icon">📦</div>
            <div class="stat-content">
              <div class="stat-value counter">< 10KB</div>
              <div class="stat-label">SDK 体积</div>
            </div>
          </div>
          <div class="stat glass-card">
            <div class="stat-icon">🧹</div>
            <div class="stat-content">
              <div class="stat-value">0 依赖</div>
              <div class="stat-label">纯净实现</div>
            </div>
          </div>
          <div class="stat glass-card">
            <div class="stat-icon">💎</div>
            <div class="stat-content">
              <div class="stat-value">TypeScript</div>
              <div class="stat-label">完整类型</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 滚动指示器 -->
      <div class="scroll-indicator">
        <div class="mouse">
          <div class="wheel"></div>
        </div>
        <span>向下滚动</span>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">功能特性</span>
          <h2>全方位监控<span class="gradient-text">你的应用</span></h2>
          <p>从错误追踪到性能优化，一站式解决方案</p>
        </div>
        <div class="features-grid">
          <div v-for="(feature, index) in features" :key="feature.title" 
               class="feature-card glass-card" :style="{ animationDelay: `${index * 0.1}s` }">
            <div class="feature-icon-wrapper">
              <div class="feature-icon">{{ feature.icon }}</div>
              <div class="feature-icon-glow"></div>
            </div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.desc }}</p>
            <div class="feature-arrow">→</div>
          </div>
        </div>
      </div>
    </section>

    <!-- SDK Section -->
    <section id="sdk" class="sdk">
      <div class="container">
        <div class="sdk-content">
          <div class="sdk-info">
            <span class="section-tag">快速开始</span>
            <h2>一行代码<br><span class="gradient-text">即刻接入</span></h2>
            <p>支持 Vue、React、原生 JS 等所有前端框架</p>
            <div class="sdk-steps">
              <div class="step" v-for="(step, i) in ['安装 SDK', '初始化配置', '开始监控']" :key="i">
                <span class="step-num">{{ i + 1 }}</span>
                <span class="step-line"></span>
                <span>{{ step }}</span>
              </div>
            </div>
            <a href="https://github.com/name718/sentinel" class="btn-primary">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              查看源码
            </a>
          </div>
          <div class="sdk-code glass-card">
            <div class="code-header">
              <div class="code-dots">
                <span class="dot red"></span>
                <span class="dot yellow"></span>
                <span class="dot green"></span>
              </div>
              <span class="filename">main.ts</span>
              <button class="copy-btn" @click="copyCode">复制</button>
            </div>
            <pre><code>{{ codeExample }}</code></pre>
            <div class="code-glow"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- Tech Stack Section -->
    <section class="tech-stack">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">技术架构</span>
          <h2>现代化<span class="gradient-text">技术栈</span></h2>
          <p>基于主流技术构建，开箱即用</p>
        </div>
        <div class="tech-grid">
          <div class="tech-item glass-card">
            <div class="tech-icon">📦</div>
            <div class="tech-name">SDK</div>
            <div class="tech-desc">TypeScript + Web Worker + rrweb</div>
          </div>
          <div class="tech-item glass-card">
            <div class="tech-icon">🖥️</div>
            <div class="tech-name">Server</div>
            <div class="tech-desc">Express + PostgreSQL + JWT</div>
          </div>
          <div class="tech-item glass-card">
            <div class="tech-icon">📊</div>
            <div class="tech-name">Dashboard</div>
            <div class="tech-desc">Vue 3 + Vite + ECharts</div>
          </div>
          <div class="tech-item glass-card">
            <div class="tech-icon">🔌</div>
            <div class="tech-name">Plugins</div>
            <div class="tech-desc">Vite Plugin + Webpack Plugin</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="pricing">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">定价方案</span>
          <h2>简单透明的<span class="gradient-text">价格</span></h2>
          <p>开源免费，自托管无限制</p>
        </div>
        <div class="pricing-grid">
          <div class="pricing-card glass-card">
            <div class="pricing-header">
              <span class="pricing-badge">开源版</span>
              <div class="pricing-price">
                <span class="currency">¥</span>
                <span class="amount">0</span>
                <span class="period">/永久</span>
              </div>
            </div>
            <ul class="pricing-features">
              <li><span class="check">✓</span> 完整源代码</li>
              <li><span class="check">✓</span> 无限项目</li>
              <li><span class="check">✓</span> 无限数据</li>
              <li><span class="check">✓</span> 自托管部署</li>
              <li><span class="check">✓</span> 社区支持</li>
            </ul>
            <a href="https://github.com/name718/sentinel" class="btn-outline">立即使用</a>
          </div>
          <div class="pricing-card glass-card featured">
            <div class="featured-badge">推荐</div>
            <div class="pricing-header">
              <span class="pricing-badge">云服务</span>
              <div class="pricing-price">
                <span class="coming-soon">即将推出</span>
              </div>
            </div>
            <ul class="pricing-features">
              <li><span class="check">✓</span> 托管服务</li>
              <li><span class="check">✓</span> 自动扩容</li>
              <li><span class="check">✓</span> 数据备份</li>
              <li><span class="check">✓</span> 优先支持</li>
              <li><span class="check">✓</span> SLA 保障</li>
            </ul>
            <button class="btn-primary" disabled>敬请期待</button>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section id="contact" class="cta">
      <div class="cta-bg"></div>
      <div class="container">
        <div class="cta-content glass-card">
          <h2>准备好开始了吗？</h2>
          <p>留下邮箱，获取最新动态和专属福利</p>
          <div class="subscribe-form cta-form">
            <form @submit.prevent="handleSubscribe">
              <div class="input-wrapper">
                <input v-model="email" type="email" placeholder="your@email.com" :disabled="submitting" />
              </div>
              <button type="submit" class="btn-glow" :disabled="submitting || !email">
                {{ submitting ? '提交中...' : '订阅' }}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* 粒子画布 */
.particles-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

/* 玻璃态卡片 */
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  position: relative;
  z-index: 1;
}

/* Hero */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 120px 0;
  text-align: center;
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 60%);
  filter: blur(80px);
  animation: pulse 8s ease-in-out infinite;
}

.hero-glow-2 {
  position: absolute;
  top: 100px;
  right: -200px;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.2) 0%, transparent 60%);
  filter: blur(80px);
  animation: pulse 10s ease-in-out infinite reverse;
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; transform: translateX(-50%) scale(1); }
  50% { opacity: 0.8; transform: translateX(-50%) scale(1.1); }
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 30px;
  font-size: 14px;
  font-weight: 500;
  color: var(--primary-light);
  margin-bottom: 32px;
}

.badge-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: blink 2s ease-in-out infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.hero-title {
  font-size: 72px;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 28px;
}

.title-line {
  display: block;
}

.gradient-text {
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

/* Glitch 效果 */
.glitch {
  position: relative;
}

.glitch::before,
.glitch::after {
  content: attr(data-text);
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  background: var(--bg);
  -webkit-background-clip: text;
  background-clip: text;
}

.glitch::before {
  left: 2px;
  text-shadow: -2px 0 #ff00ff;
  animation: glitch-1 2s infinite linear alternate-reverse;
}

.glitch::after {
  left: -2px;
  text-shadow: 2px 0 #00ffff;
  animation: glitch-2 3s infinite linear alternate-reverse;
}

@keyframes glitch-1 {
  0%, 100% { clip-path: inset(0 0 95% 0); }
  20% { clip-path: inset(30% 0 50% 0); }
  40% { clip-path: inset(70% 0 10% 0); }
  60% { clip-path: inset(10% 0 80% 0); }
  80% { clip-path: inset(50% 0 30% 0); }
}

@keyframes glitch-2 {
  0%, 100% { clip-path: inset(95% 0 0 0); }
  20% { clip-path: inset(50% 0 30% 0); }
  40% { clip-path: inset(10% 0 70% 0); }
  60% { clip-path: inset(80% 0 10% 0); }
  80% { clip-path: inset(30% 0 50% 0); }
}

.hero-desc {
  font-size: 20px;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto 48px;
  line-height: 1.8;
}

/* 订阅表单 */
.subscribe-form {
  max-width: 500px;
  margin: 0 auto 64px;
  padding: 8px;
}

.subscribe-form form {
  display: flex;
  gap: 12px;
}

.input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 16px;
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
}

.subscribe-form input {
  width: 100%;
  padding: 16px 16px 16px 48px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-size: 16px;
  color: var(--text);
  outline: none;
  transition: all 0.3s;
}

.subscribe-form input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 20px rgba(99, 102, 241, 0.3);
}

.subscribe-form input::placeholder {
  color: var(--text-secondary);
}

.btn-glow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 28px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
}

.btn-glow::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: 0.5s;
}

.btn-glow:hover::before {
  left: 100%;
}

.btn-glow:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 40px rgba(99, 102, 241, 0.5);
}

.btn-glow:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-glow svg {
  width: 18px;
  height: 18px;
}

.form-message {
  margin-top: 12px;
  font-size: 14px;
  text-align: center;
}

.form-message.success { color: #10b981; }
.form-message.error { color: #ef4444; }

/* Hero Stats */
.hero-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 28px;
  transition: all 0.3s;
}

.stat:hover {
  transform: translateY(-4px);
  border-color: rgba(99, 102, 241, 0.5);
}

.stat-icon {
  font-size: 28px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* 滚动指示器 */
.scroll-indicator {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 12px;
  animation: bounce 2s infinite;
}

.mouse {
  width: 24px;
  height: 40px;
  border: 2px solid var(--text-secondary);
  border-radius: 12px;
  position: relative;
}

.wheel {
  width: 4px;
  height: 8px;
  background: var(--text-secondary);
  border-radius: 2px;
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  animation: scroll 2s infinite;
}

@keyframes scroll {
  0% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(12px); }
}

@keyframes bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(10px); }
}

/* Section 通用 */
.section-header {
  text-align: center;
  margin-bottom: 64px;
}

.section-tag {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  color: var(--primary-light);
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 48px;
  font-weight: 700;
  margin-bottom: 16px;
}

.section-header p {
  font-size: 18px;
  color: var(--text-secondary);
}

/* Features */
.features {
  padding: 140px 0;
  position: relative;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.feature-card {
  padding: 28px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--primary), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.feature-card:hover {
  transform: translateY(-8px);
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.feature-card:hover::before {
  opacity: 1;
}

.feature-icon-wrapper {
  position: relative;
  width: 64px;
  height: 64px;
  margin-bottom: 20px;
}

.feature-icon {
  font-size: 40px;
  position: relative;
  z-index: 1;
}

.feature-icon-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%);
  filter: blur(10px);
  opacity: 0;
  transition: opacity 0.3s;
}

.feature-card:hover .feature-icon-glow {
  opacity: 1;
}

.feature-card h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
}

.feature-card p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.feature-arrow {
  position: absolute;
  bottom: 24px;
  right: 24px;
  font-size: 20px;
  color: var(--primary);
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s;
}

.feature-card:hover .feature-arrow {
  opacity: 1;
  transform: translateX(0);
}

/* SDK Section */
.sdk {
  padding: 140px 0;
  background: linear-gradient(180deg, transparent 0%, rgba(99, 102, 241, 0.03) 50%, transparent 100%);
}

.sdk-content {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 80px;
  align-items: center;
}

.sdk-info h2 {
  font-size: 48px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 20px;
}

.sdk-info p {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 36px;
}

.sdk-steps {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 40px;
}

.step {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 16px;
  font-weight: 500;
}

.step-num {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.step-line {
  width: 24px;
  height: 2px;
  background: linear-gradient(90deg, var(--primary), transparent);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 40px rgba(99, 102, 241, 0.4);
}

.sdk-code {
  position: relative;
  overflow: hidden;
}

.code-header {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.code-dots {
  display: flex;
  gap: 8px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot.red { background: #ff5f57; }
.dot.yellow { background: #febc2e; }
.dot.green { background: #28c840; }

.filename {
  margin-left: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}

.copy-btn {
  margin-left: auto;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: var(--text);
}

.sdk-code pre {
  padding: 28px;
  margin: 0;
  overflow-x: auto;
}

.sdk-code code {
  font-family: 'JetBrains Mono', 'SF Mono', Monaco, monospace;
  font-size: 14px;
  line-height: 1.8;
  color: #e2e8f0;
}

.code-glow {
  position: absolute;
  bottom: -50px;
  right: -50px;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%);
  filter: blur(40px);
}

/* Tech Stack */
.tech-stack {
  padding: 140px 0;
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.03) 0%, transparent 100%);
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.tech-item {
  padding: 32px;
  text-align: center;
  transition: all 0.3s;
}

.tech-item:hover {
  transform: translateY(-4px);
  border-color: rgba(99, 102, 241, 0.5);
}

.tech-icon {
  font-size: 40px;
  margin-bottom: 16px;
}

.tech-name {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text);
}

.tech-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Pricing */
.pricing {
  padding: 140px 0;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 32px;
  max-width: 900px;
  margin: 0 auto;
}

.pricing-card {
  padding: 48px;
  text-align: center;
  position: relative;
  transition: all 0.3s;
}

.pricing-card:hover {
  transform: translateY(-8px);
}

.pricing-card.featured {
  border-color: var(--primary);
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.1) 0%, rgba(255,255,255,0.02) 100%);
}

.featured-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 20px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.pricing-header {
  margin-bottom: 32px;
}

.pricing-badge {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-light);
  margin-bottom: 20px;
}

.pricing-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.currency {
  font-size: 24px;
  color: var(--text-secondary);
}

.amount {
  font-size: 64px;
  font-weight: 800;
  background: linear-gradient(135deg, #fff, #94a3b8);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.period {
  font-size: 16px;
  color: var(--text-secondary);
}

.coming-soon {
  font-size: 32px;
  font-weight: 700;
  color: var(--primary-light);
}

.pricing-features {
  list-style: none;
  text-align: left;
  margin-bottom: 36px;
}

.pricing-features li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 15px;
  color: var(--text-secondary);
}

.check {
  color: #10b981;
  font-weight: bold;
}

.btn-outline {
  display: block;
  padding: 16px 32px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  transition: all 0.3s;
}

.btn-outline:hover {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
}

/* CTA */
.cta {
  padding: 140px 0;
  position: relative;
  overflow: hidden;
}

.cta-bg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1000px;
  height: 600px;
  background: radial-gradient(ellipse, rgba(99, 102, 241, 0.15) 0%, transparent 60%);
  filter: blur(60px);
}

.cta-content {
  max-width: 600px;
  margin: 0 auto;
  padding: 64px;
  text-align: center;
}

.cta h2 {
  font-size: 40px;
  font-weight: 700;
  margin-bottom: 16px;
}

.cta p {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 36px;
}

.cta-form {
  margin-bottom: 0;
}

.cta-form .input-wrapper input {
  padding-left: 20px;
}

/* 响应式 */
@media (max-width: 1200px) {
  .features-grid { grid-template-columns: repeat(3, 1fr); }
  .tech-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 1024px) {
  .features-grid { grid-template-columns: repeat(2, 1fr); }
  .sdk-content { grid-template-columns: 1fr; gap: 48px; }
}

@media (max-width: 768px) {
  .hero-title { font-size: 44px; }
  .hero-desc { font-size: 16px; }
  .subscribe-form form { flex-direction: column; }
  .hero-stats { flex-direction: column; gap: 16px; }
  .features-grid { grid-template-columns: 1fr; }
  .tech-grid { grid-template-columns: 1fr; }
  .pricing-grid { grid-template-columns: 1fr; }
  .section-header h2 { font-size: 36px; }
  .sdk-info h2 { font-size: 36px; }
  .cta-content { padding: 40px 24px; }
  .scroll-indicator { display: none; }
}
</style>
