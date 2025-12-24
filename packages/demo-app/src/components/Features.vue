<template>
  <section class="features">
    <h2 class="section-title">核心功能</h2>
    
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">🐛</div>
        <h3>错误监控</h3>
        <p>自动捕获 JavaScript 错误、Promise 异常、资源加载失败</p>
        <ul class="feature-list">
          <li>全局错误捕获</li>
          <li>错误聚合分析</li>
          <li>SourceMap 还原</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>性能监控</h3>
        <p>采集 Core Web Vitals 和页面加载性能指标</p>
        <ul class="feature-list">
          <li>FCP、LCP、FID、CLS</li>
          <li>资源加载瀑布图</li>
          <li>长任务分析</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">🎬</div>
        <h3>会话回放</h3>
        <p>录制用户操作，错误发生时可回放完整过程</p>
        <ul class="feature-list">
          <li>DOM 变化录制</li>
          <li>鼠标轨迹追踪</li>
          <li>隐私自动脱敏</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">🔔</div>
        <h3>告警通知</h3>
        <p>灵活的告警规则配置，支持邮件实时通知</p>
        <ul class="feature-list">
          <li>新错误即时告警</li>
          <li>阈值/激增告警</li>
          <li>冷却防重复</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">📋</div>
        <h3>状态管理</h3>
        <p>错误生命周期管理，支持批量操作和状态流转</p>
        <ul class="feature-list">
          <li>待处理/处理中/已解决</li>
          <li>批量状态变更</li>
          <li>处理人追踪</li>
        </ul>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">👤</div>
        <h3>用户追踪</h3>
        <p>记录用户行为轨迹，了解错误发生前的操作</p>
        <ul class="feature-list">
          <li>点击事件追踪</li>
          <li>路由变化记录</li>
          <li>API 请求监控</li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features {
  padding: 80px 0;
}

.section-title {
  font-size: 36px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 60px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.feature-card {
  padding: 32px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  transition: all 0.3s;
}

.feature-card:hover {
  transform: translateY(-4px);
  border-color: var(--primary);
  box-shadow: 0 8px 32px rgba(99, 102, 241, 0.2);
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.feature-card h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 12px;
}

.feature-card p {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 16px;
  line-height: 1.6;
}

.feature-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feature-list li {
  font-size: 13px;
  color: var(--text-secondary);
  padding-left: 20px;
  position: relative;
}

.feature-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--success);
  font-weight: 600;
}
</style>
