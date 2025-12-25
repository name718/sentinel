<template>
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="logo">
            <span class="logo-icon">🔍</span>
            <span class="logo-text">Monitor</span>
          </div>
          <p>轻量级前端监控平台<br>让问题无处遁形</p>
        </div>
        
        <div class="footer-links">
          <h4>产品</h4>
          <a href="#features">功能介绍</a>
          <a href="#sdk">SDK 文档</a>
          <a href="#pricing">价格方案</a>
        </div>
        
        <div class="footer-links">
          <h4>资源</h4>
          <a href="https://github.com/name718/sentinel" target="_blank">GitHub</a>
          <a href="#">更新日志</a>
          <a href="#">API 文档</a>
        </div>
        
        <div class="footer-links">
          <h4>关于</h4>
          <a href="#">关于我们</a>
          <a href="#">联系我们</a>
          <a href="#">隐私政策</a>
        </div>
      </div>
      
      <div class="footer-bottom">
        <p>© 2025 Monitor. 开源项目，MIT 许可证</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  padding: 80px 0 40px;
  background: var(--bg-light);
  border-top: 1px solid var(--border);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 60px;
  margin-bottom: 60px;
}

.footer-brand .logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 16px;
}

.logo-icon {
  font-size: 24px;
}

.logo-text {
  background: var(--gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.footer-brand p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.footer-links h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--text);
}

.footer-links a {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: var(--text);
}

.footer-bottom {
  padding-top: 40px;
  border-top: 1px solid var(--border);
  text-align: center;
}

.footer-bottom p {
  font-size: 14px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 40px;
  }
  .footer-brand {
    grid-column: span 2;
  }
}
</style>
