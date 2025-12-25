<template>
  <footer class="footer">
    <div class="footer-glow"></div>
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <div class="logo">
            <div class="logo-icon">
              <svg viewBox="0 0 32 32" fill="none">
                <defs>
                  <linearGradient id="footer-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#6366f1"/>
                    <stop offset="50%" stop-color="#8b5cf6"/>
                    <stop offset="100%" stop-color="#a855f7"/>
                  </linearGradient>
                </defs>
                <circle cx="16" cy="16" r="14" stroke="url(#footer-logo-gradient)" stroke-width="2" fill="none"/>
                <circle cx="16" cy="16" r="6" fill="url(#footer-logo-gradient)"/>
              </svg>
            </div>
            <span class="logo-text">Sentinel</span>
          </div>
          <p>轻量级前端监控平台<br>让问题无处遁形</p>
          <div class="social-links">
            <a href="https://github.com/name718/sentinel" target="_blank" class="social-link">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            </a>
          </div>
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
          <a href="https://github.com/name718/sentinel/releases" target="_blank">更新日志</a>
          <a href="https://github.com/name718/sentinel#readme" target="_blank">文档</a>
        </div>
        
        <div class="footer-links">
          <h4>联系</h4>
          <a href="#contact">联系我们</a>
          <a href="https://github.com/name718/sentinel/issues" target="_blank">反馈问题</a>
        </div>
      </div>
      
      <div class="footer-bottom">
        <p>© 2025 Sentinel. 开源项目，AGPL-3.0 许可证（禁止商用）</p>
        <p class="made-with">Made with 💜 for developers</p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  position: relative;
  padding: 100px 0 40px;
  background: linear-gradient(180deg, var(--bg) 0%, #0d0d14 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.footer-glow {
  position: absolute;
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
  width: 800px;
  height: 400px;
  background: radial-gradient(ellipse, rgba(99, 102, 241, 0.08) 0%, transparent 60%);
  filter: blur(60px);
  pointer-events: none;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  position: relative;
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
  gap: 12px;
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 16px;
}

.logo-icon {
  width: 32px;
  height: 32px;
}

.logo-icon svg {
  width: 100%;
  height: 100%;
}

.logo-text {
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.footer-brand p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
  margin-bottom: 24px;
}

.social-links {
  display: flex;
  gap: 12px;
}

.social-link {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: var(--text-secondary);
  transition: all 0.3s;
}

.social-link:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: var(--primary);
  color: var(--text);
  transform: translateY(-2px);
}

.social-link svg {
  width: 20px;
  height: 20px;
}

.footer-links h4 {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 24px;
  color: var(--text);
}

.footer-links a {
  display: block;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 14px;
  transition: all 0.2s;
}

.footer-links a:hover {
  color: var(--primary-light);
  transform: translateX(4px);
}

.footer-bottom {
  padding-top: 40px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-bottom p {
  font-size: 13px;
  color: var(--text-secondary);
}

.made-with {
  opacity: 0.7;
}

@media (max-width: 768px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
    gap: 40px;
  }
  .footer-brand {
    grid-column: span 2;
  }
  .footer-bottom {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
}
</style>
