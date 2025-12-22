<template>
  <section class="hero">
    <div class="hero-content">
      <h1 class="hero-title">
        <span class="gradient-text">前端监控 SDK</span>
        <br>
        功能演示
      </h1>
      <p class="hero-desc">
        体验完整的错误监控、性能分析、会话回放功能
      </p>
      <div class="hero-features">
        <div class="feature-tag">🐛 错误捕获</div>
        <div class="feature-tag">⚡ 性能监控</div>
        <div class="feature-tag">🎬 会话回放</div>
        <div class="feature-tag">🗺️ SourceMap</div>
      </div>
    </div>
    
    <div class="hero-visual">
      <div class="visual-card card-1">
        <div class="card-icon">📊</div>
        <div class="card-text">实时监控</div>
      </div>
      <div class="visual-card card-2">
        <div class="card-icon">🔍</div>
        <div class="card-text">错误追踪</div>
      </div>
      <div class="visual-card card-3">
        <div class="card-icon">⚡</div>
        <div class="card-text">性能分析</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding: 80px 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.hero-title {
  font-size: 48px;
  font-weight: 800;
  line-height: 1.2;
  margin-bottom: 24px;
}

.gradient-text {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-desc {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: 32px;
}

.hero-features {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.feature-tag {
  padding: 8px 16px;
  background: var(--bg-lighter);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.hero-visual {
  position: relative;
  height: 400px;
}

.visual-card {
  position: absolute;
  padding: 24px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  animation: float 3s ease-in-out infinite;
}

.card-icon {
  font-size: 48px;
}

.card-text {
  font-size: 16px;
  font-weight: 600;
}

.card-1 {
  top: 0;
  left: 0;
  animation-delay: 0s;
}

.card-2 {
  top: 120px;
  right: 60px;
  animation-delay: 0.5s;
}

.card-3 {
  bottom: 0;
  left: 80px;
  animation-delay: 1s;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

@media (max-width: 768px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  
  .hero-title {
    font-size: 36px;
  }
  
  .hero-visual {
    height: 300px;
  }
}
</style>
