<script setup lang="ts">
import { ref } from 'vue';
import { Monitor } from '@monitor/sdk';

const emit = defineEmits<{
  log: [msg: string, type: string];
}>();

const errorCount = ref(0);

function triggerBatchErrors(count: number) {
  emit('log', `🔔 批量触发 ${count} 个错误，测试告警阈值...`, 'warn');
  
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      try {
        throw new Error(`批量测试错误 #${i + 1}`);
      } catch (e) {
        Monitor.getInstance().captureError(e as Error);
        errorCount.value++;
      }
    }, i * 100);
  }
  
  setTimeout(() => {
    emit('log', `✅ 已触发 ${count} 个错误，检查告警是否触发`, 'success');
  }, count * 100 + 200);
}

function triggerNewError() {
  const timestamp = Date.now();
  emit('log', `🆕 触发新类型错误，测试新错误告警...`, 'warn');
  
  try {
    throw new Error(`新错误类型_${timestamp}`);
  } catch (e) {
    Monitor.getInstance().captureError(e as Error);
    emit('log', `✅ 新错误已上报，如配置了新错误告警将收到通知`, 'success');
  }
}

function triggerSpikeErrors() {
  emit('log', `📈 快速触发错误激增，测试激增告警...`, 'warn');
  
  const errors = 15;
  for (let i = 0; i < errors; i++) {
    try {
      throw new Error(`激增测试错误 #${i + 1}`);
    } catch (e) {
      Monitor.getInstance().captureError(e as Error);
    }
  }
  
  emit('log', `✅ 已在短时间内触发 ${errors} 个错误`, 'success');
}
</script>

<template>
  <section class="demo-section">
    <div class="section-header">
      <h2 class="section-title">🔔 告警系统演示</h2>
      <p class="section-desc">测试不同类型的告警规则触发条件</p>
    </div>
    
    <div class="demo-grid">
      <div class="demo-card">
        <div class="card-header">
          <h3>告警触发测试</h3>
          <span class="badge">3 种规则</span>
        </div>
        <div class="button-grid">
          <button class="demo-btn btn-alert" @click="triggerNewError">
            <span class="btn-icon">🆕</span>
            <span class="btn-text">新错误告警</span>
            <span class="btn-hint">首次出现的错误</span>
          </button>
          <button class="demo-btn btn-alert" @click="triggerBatchErrors(10)">
            <span class="btn-icon">📊</span>
            <span class="btn-text">阈值告警</span>
            <span class="btn-hint">触发 10 个错误</span>
          </button>
          <button class="demo-btn btn-alert" @click="triggerSpikeErrors">
            <span class="btn-icon">📈</span>
            <span class="btn-text">激增告警</span>
            <span class="btn-hint">短时间大量错误</span>
          </button>
        </div>
        <div class="stats">
          <span>本次会话已触发: {{ errorCount }} 个错误</span>
        </div>
      </div>
      
      <div class="demo-card">
        <div class="card-header">
          <h3>告警规则说明</h3>
        </div>
        <ul class="rule-list">
          <li>
            <span class="rule-icon">🆕</span>
            <div class="rule-content">
              <strong>新错误告警</strong>
              <p>首次出现的错误类型立即发送告警</p>
            </div>
          </li>
          <li>
            <span class="rule-icon">📊</span>
            <div class="rule-content">
              <strong>阈值告警</strong>
              <p>错误累计次数超过设定阈值时告警</p>
            </div>
          </li>
          <li>
            <span class="rule-icon">📈</span>
            <div class="rule-content">
              <strong>激增告警</strong>
              <p>时间窗口内错误数突然增加时告警</p>
            </div>
          </li>
        </ul>
        <div class="tip">
          💡 在 Dashboard 的告警配置页面设置规则和收件人
        </div>
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
  grid-template-columns: 1fr 1fr;
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
  background: var(--primary);
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.button-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.demo-btn {
  padding: 16px 20px;
  background: var(--bg-lighter);
  border: 2px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
}

.demo-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}

.btn-alert:hover {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
}

.btn-icon {
  font-size: 24px;
}

.btn-text {
  font-weight: 600;
}

.btn-hint {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-secondary);
}

.stats {
  margin-top: 16px;
  padding: 12px;
  background: var(--bg-lighter);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
}

.rule-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rule-list li {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--bg-lighter);
  border-radius: 8px;
}

.rule-icon {
  font-size: 24px;
}

.rule-content strong {
  display: block;
  font-size: 14px;
  margin-bottom: 4px;
}

.rule-content p {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.tip {
  margin-top: 20px;
  padding: 12px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid var(--primary);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .demo-grid {
    grid-template-columns: 1fr;
  }
}
</style>
