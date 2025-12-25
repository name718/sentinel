<script setup lang="ts">
import { ref } from 'vue';

const features = [
  {
    icon: '🐛',
    title: '错误监控',
    desc: '自动捕获 JS 错误、Promise 异常、资源加载失败，支持 SourceMap 还原'
  },
  {
    icon: '⚡',
    title: '性能分析',
    desc: 'Core Web Vitals 指标采集，FCP/LCP/FID/CLS 全覆盖，资源加载瀑布图'
  },
  {
    icon: '🎬',
    title: '会话回放',
    desc: '录制用户操作轨迹，错误发生时自动保存回放，快速定位问题'
  },
  {
    icon: '🔔',
    title: '智能告警',
    desc: '新错误、错误激增、阈值告警，邮件通知，冷却机制防止轰炸'
  },
  {
    icon: '📦',
    title: '多项目管理',
    desc: '一个平台管理多个应用，团队协作，成员权限控制'
  },
  {
    icon: '🔧',
    title: '构建集成',
    desc: 'Vite/Webpack 插件，构建时自动上传 SourceMap，零配置接入'
  }
];

const codeExample = `import { Monitor } from '@monitor/sdk';

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
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="container">
        <div class="hero-badge">🚀 开源免费 · 轻量高效</div>
        <h1 class="hero-title">
          前端监控<br>
          <span class="gradient-text">从未如此简单</span>
        </h1>
        <p class="hero-desc">
          一行代码接入，实时错误追踪、性能分析、用户行为回放<br>
          帮助你快速定位问题，提升用户体验
        </p>
        
        <!-- 邮箱订阅表单 -->
        <div class="subscribe-form">
          <form @submit.prevent="handleSubscribe">
            <input 
              v-model="email"
              type="email" 
              placeholder="输入邮箱，获取最新动态"
              :disabled="submitting"
            />
            <button type="submit" :disabled="submitting || !email">
              {{ submitting ? '提交中...' : '立即订阅' }}
            </button>
          </form>
          <p v-if="submitStatus === 'success'" class="form-message success">✓ {{ submitMessage }}</p>
          <p v-if="submitStatus === 'error'" class="form-message error">{{ submitMessage }}</p>
        </div>
        
        <div class="hero-stats">
          <div class="stat">
            <div class="stat-value">< 10KB</div>
            <div class="stat-label">SDK 体积</div>
          </div>
          <div class="stat">
            <div class="stat-value">0 依赖</div>
            <div class="stat-label">纯净实现</div>
          </div>
          <div class="stat">
            <div class="stat-value">TypeScript</div>
            <div class="stat-label">完整类型</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features">
      <div class="container">
        <div class="section-header">
          <h2>核心功能</h2>
          <p>全方位监控你的前端应用</p>
        </div>
        <div class="features-grid">
          <div v-for="feature in features" :key="feature.title" class="feature-card">
            <div class="feature-icon">{{ feature.icon }}</div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- SDK Section -->
    <section id="sdk" class="sdk">
      <div class="container">
        <div class="sdk-content">
          <div class="sdk-info">
            <h2>一行代码<br><span class="gradient-text">快速接入</span></h2>
            <p>支持 Vue、React、原生 JS 等所有前端框架，npm 安装即可使用</p>
            <div class="sdk-steps">
              <div class="step">
                <span class="step-num">1</span>
                <span>安装 SDK</span>
              </div>
              <div class="step">
                <span class="step-num">2</span>
                <span>初始化配置</span>
              </div>
              <div class="step">
                <span class="step-num">3</span>
                <span>开始监控</span>
              </div>
            </div>
          </div>
          <div class="sdk-code">
            <div class="code-header">
              <span class="dot red"></span>
              <span class="dot yellow"></span>
              <span class="dot green"></span>
              <span class="filename">main.ts</span>
            </div>
            <pre><code>{{ codeExample }}</code></pre>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="pricing">
      <div class="container">
        <div class="section-header">
          <h2>简单透明的价格</h2>
          <p>开源免费，自托管无限制</p>
        </div>
        <div class="pricing-grid">
          <div class="pricing-card">
            <div class="pricing-badge">开源版</div>
            <div class="pricing-price">
              <span class="price">免费</span>
            </div>
            <ul class="pricing-features">
              <li>✓ 完整源代码</li>
              <li>✓ 无限项目</li>
              <li>✓ 无限数据</li>
              <li>✓ 自托管部署</li>
              <li>✓ 社区支持</li>
            </ul>
            <a href="https://github.com/name718/sentinel" class="btn-outline">查看源码</a>
          </div>
          <div class="pricing-card featured">
            <div class="pricing-badge">云服务</div>
            <div class="pricing-price">
              <span class="price">即将推出</span>
            </div>
            <ul class="pricing-features">
              <li>✓ 托管服务</li>
              <li>✓ 自动扩容</li>
              <li>✓ 数据备份</li>
              <li>✓ 优先支持</li>
              <li>✓ SLA 保障</li>
            </ul>
            <a href="#" class="btn-primary-outline">敬请期待</a>
          </div>
        </div>
      </div>
    </section>

    <!-- Contact / CTA Section -->
    <section id="contact" class="cta">
      <div class="container">
        <h2>对 Monitor 感兴趣？</h2>
        <p>留下邮箱，我们会第一时间联系你</p>
        
        <div class="subscribe-form cta-form">
          <form @submit.prevent="handleSubscribe">
            <input 
              v-model="email"
              type="email" 
              placeholder="your@email.com"
              :disabled="submitting"
            />
            <button type="submit" :disabled="submitting || !email">
              {{ submitting ? '提交中...' : '联系我' }}
            </button>
          </form>
          <p v-if="submitStatus === 'success'" class="form-message success">✓ {{ submitMessage }}</p>
          <p v-if="submitStatus === 'error'" class="form-message error">{{ submitMessage }}</p>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Hero */
.hero {
  position: relative;
  padding: 180px 0 120px;
  text-align: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 1000px;
  height: 1000px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
  pointer-events: none;
}

.hero-badge {
  display: inline-block;
  padding: 8px 16px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--primary-light);
  margin-bottom: 24px;
}

.hero-title {
  font-size: 64px;
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 24px;
}

.gradient-text {
  background: var(--gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-desc {
  font-size: 20px;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto 40px;
}

/* Subscribe Form */
.subscribe-form {
  max-width: 480px;
  margin: 0 auto 60px;
}

.subscribe-form form {
  display: flex;
  gap: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 8px;
}

.subscribe-form input {
  flex: 1;
  padding: 14px 20px;
  background: transparent;
  border: none;
  font-size: 16px;
  color: var(--text);
  outline: none;
}

.subscribe-form input::placeholder {
  color: var(--text-secondary);
}

.subscribe-form button {
  padding: 14px 28px;
  background: var(--gradient);
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.subscribe-form button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
}

.subscribe-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-message {
  margin-top: 12px;
  font-size: 14px;
  text-align: center;
}

.form-message.success {
  color: var(--success);
}

.form-message.error {
  color: var(--danger);
}

.hero-stats {
  display: flex;
  justify-content: center;
  gap: 60px;
}

.stat {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Features */
.features {
  padding: 120px 0;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-header h2 {
  font-size: 40px;
  font-weight: 700;
  margin-bottom: 12px;
}

.section-header p {
  font-size: 18px;
  color: var(--text-secondary);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.feature-card {
  padding: 32px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  transition: all 0.3s;
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: var(--primary);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}

.feature-icon {
  font-size: 40px;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.feature-card p {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* SDK */
.sdk {
  padding: 120px 0;
  background: var(--bg-light);
}

.sdk-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.sdk-info h2 {
  font-size: 40px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 20px;
}

.sdk-info p {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 32px;
}

.sdk-steps {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 500;
}

.step-num {
  width: 28px;
  height: 28px;
  background: var(--gradient);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}

.sdk-code {
  background: #0d0d12;
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
}

.code-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--border);
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
  margin-left: auto;
  font-size: 13px;
  color: var(--text-secondary);
}

.sdk-code pre {
  padding: 24px;
  margin: 0;
  overflow-x: auto;
}

.sdk-code code {
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 14px;
  line-height: 1.7;
  color: #e2e8f0;
}

/* Pricing */
.pricing {
  padding: 120px 0;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  max-width: 800px;
  margin: 0 auto;
}

.pricing-card {
  padding: 40px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  text-align: center;
}

.pricing-card.featured {
  border-color: var(--primary);
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.1) 0%, var(--bg-card) 100%);
}

.pricing-badge {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-light);
  margin-bottom: 24px;
}

.pricing-price {
  margin-bottom: 32px;
}

.price {
  font-size: 48px;
  font-weight: 800;
}

.pricing-features {
  list-style: none;
  text-align: left;
  margin-bottom: 32px;
}

.pricing-features li {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  font-size: 15px;
  color: var(--text-secondary);
}

.btn-outline {
  display: block;
  padding: 14px 28px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  transition: all 0.2s;
}

.btn-outline:hover {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
}

.btn-primary-outline {
  display: block;
  padding: 14px 28px;
  background: var(--gradient);
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  color: white;
}

/* CTA */
.cta {
  padding: 120px 0;
  text-align: center;
  background: linear-gradient(180deg, var(--bg) 0%, var(--bg-light) 100%);
}

.cta h2 {
  font-size: 40px;
  font-weight: 700;
  margin-bottom: 16px;
}

.cta p {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 40px;
}

.cta-form {
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 40px;
  }
  .hero-desc {
    font-size: 16px;
  }
  .subscribe-form form {
    flex-direction: column;
  }
  .subscribe-form button {
    width: 100%;
  }
  .hero-stats {
    flex-direction: column;
    gap: 24px;
  }
  .features-grid {
    grid-template-columns: 1fr;
  }
  .sdk-content {
    grid-template-columns: 1fr;
  }
  .pricing-grid {
    grid-template-columns: 1fr;
  }
}
</style>
