<script setup lang="ts">
import { Monitor } from '@monitor/sdk';

const emit = defineEmits<{
  log: [msg: string, type: string];
}>();

function triggerError(type: string) {
  emit('log', `🐛 触发 ${type} 错误...`, 'warn');
  
  try {
    switch (type) {
      case 'TypeError':
        // @ts-expect-error 故意触发错误
        null.toString();
        break;
      case 'ReferenceError':
        // @ts-expect-error 故意触发错误
        undefinedVariable.method();
        break;
      case 'RangeError':
        const arr: number[] = [];
        arr.length = -1;
        break;
      case 'Promise':
        Promise.reject(new Error('Unhandled Promise Rejection'));
        break;
      case 'Custom':
        throw new Error('这是一个自定义错误消息');
    }
  } catch (e) {
    Monitor.getInstance().captureError(e as Error);
    emit('log', `✅ 错误已捕获并上报`, 'success');
  }
}

function triggerUncaught() {
  emit('log', `💥 触发未捕获错误...`, 'warn');
  setTimeout(() => {
    // @ts-expect-error 故意触发错误
    window.nonExistentFunction();
  }, 100);
}
</script>

<template>
  <section class="demo-section">
    <div class="section-header">
      <h2 class="section-title">🐛 错误监控演示</h2>
      <p class="section-desc">点击按钮触发不同类型的错误，查看 SDK 如何捕获和上报</p>
    </div>
    
    <div class="demo-grid">
      <div class="demo-card">
        <div class="card-header">
          <h3>常见错误类型</h3>
          <span class="badge">5 种</span>
        </div>
        <div class="button-grid">
          <button class="demo-btn btn-error" @click="triggerError('TypeError')">
            <span class="btn-icon">⚠️</span>
            <span class="btn-text">TypeError</span>
          </button>
          <button class="demo-btn btn-error" @click="triggerError('ReferenceError')">
            <span class="btn-icon">🔍</span>
            <span class="btn-text">ReferenceError</span>
          </button>
          <button class="demo-btn btn-error" @click="triggerError('RangeError')">
            <span class="btn-icon">📏</span>
            <span class="btn-text">RangeError</span>
          </button>
          <button class="demo-btn btn-error" @click="triggerError('Promise')">
            <span class="btn-icon">⚡</span>
            <span class="btn-text">Promise Rejection</span>
          </button>
          <button class="demo-btn btn-error" @click="triggerError('Custom')">
            <span class="btn-icon">🎯</span>
            <span class="btn-text">自定义错误</span>
          </button>
          <button class="demo-btn btn-danger" @click="triggerUncaught">
            <span class="btn-icon">💥</span>
            <span class="btn-text">未捕获错误</span>
          </button>
        </div>
      </div>
      
      <div class="demo-card">
        <div class="card-header">
          <h3>错误特性</h3>
        </div>
        <ul class="feature-list">
          <li>✓ 自动捕获全局错误</li>
          <li>✓ Promise 异常监控</li>
          <li>✓ 错误堆栈追踪</li>
          <li>✓ 用户行为轨迹</li>
          <li>✓ 错误聚合分析</li>
          <li>✓ SourceMap 还原</li>
        </ul>
      </div>
    </div>
  </section>
</template>


<style scoped>
.demo-section {
  padding: 60px 0;
  border-top: 1px solid var(--border);
}

.section-header {
  text-align: center;
  margin-bottom: 48px;
}

.section-title {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 12px;
}

.section-desc {
  color: var(--text-secondary);
  font-size: 16px;
}

.demo-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.demo-card {
  padding: 32px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.card-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.badge {
  padding: 4px 12px;
  background: var(--bg-lighter);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.demo-btn {
  padding: 16px;
  background: var(--bg-lighter);
  border: 2px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 12px;
}

.demo-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}

.btn-error:hover {
  border-color: var(--warning);
  background: rgba(245, 158, 11, 0.1);
}

.btn-danger:hover {
  border-color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
}

.btn-icon {
  font-size: 20px;
}

.btn-text {
  flex: 1;
  text-align: left;
}

.feature-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feature-list li {
  font-size: 14px;
  color: var(--text-secondary);
  padding: 12px;
  background: var(--bg-lighter);
  border-radius: 8px;
}

@media (max-width: 768px) {
  .demo-grid {
    grid-template-columns: 1fr;
  }
  
  .button-grid {
    grid-template-columns: 1fr;
  }
}
</style>
