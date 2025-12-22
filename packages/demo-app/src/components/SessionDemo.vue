<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  log: [msg: string, type: string];
}>();

const counter = ref(0);
const inputValue = ref('');
const selectedOption = ref('option1');

function handleClick() {
  counter.value++;
  emit('log', `🖱️ 点击计数: ${counter.value}`, 'info');
}

function handleInput() {
  emit('log', `⌨️ 输入内容已记录（已脱敏）`, 'info');
}

function handleScroll() {
  emit('log', `📜 滚动事件已记录`, 'info');
}
</script>

<template>
  <section class="demo-section">
    <div class="section-header">
      <h2 class="section-title">🎬 会话回放演示</h2>
      <p class="section-desc">在此区域进行操作，然后触发错误，可在 Dashboard 中回放完整过程</p>
    </div>
    
    <div class="demo-grid">
      <div class="demo-card">
        <div class="card-header">
          <h3>交互操作</h3>
          <span class="badge recording">● 录制中</span>
        </div>
        
        <div class="interaction-area">
          <div class="control-group">
            <label>点击计数器</label>
            <button class="counter-btn" @click="handleClick">
              点击我 ({{ counter }})
            </button>
          </div>
          
          <div class="control-group">
            <label>文本输入</label>
            <input 
              v-model="inputValue" 
              type="text" 
              placeholder="输入内容（会自动脱敏）"
              @input="handleInput"
              class="text-input"
            >
          </div>
          
          <div class="control-group">
            <label>下拉选择</label>
            <select v-model="selectedOption" class="select-input">
              <option value="option1">选项 1</option>
              <option value="option2">选项 2</option>
              <option value="option3">选项 3</option>
            </select>
          </div>
          
          <div class="control-group">
            <label>滚动区域</label>
            <div class="scroll-area" @scroll="handleScroll">
              <div class="scroll-content">
                <p v-for="i in 20" :key="i">滚动内容行 {{ i }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="demo-card">
        <div class="card-header">
          <h3>录制特性</h3>
        </div>
        <ul class="feature-list">
          <li>✓ DOM 变化录制</li>
          <li>✓ 鼠标移动轨迹</li>
          <li>✓ 点击事件记录</li>
          <li>✓ 滚动位置追踪</li>
          <li>✓ 输入自动脱敏</li>
          <li>✓ 循环缓冲 30 秒</li>
        </ul>
        
        <div class="info-box">
          <div class="info-icon">💡</div>
          <div class="info-text">
            <strong>提示</strong>
            <p>触发错误后，会自动保存错误前 10 秒的操作录制</p>
          </div>
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

.badge.recording {
  background: rgba(239, 68, 68, 0.2);
  color: var(--danger);
  animation: pulse 2s infinite;
}

.interaction-area {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-group label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.counter-btn {
  padding: 16px;
  background: var(--primary);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.counter-btn:hover {
  background: var(--primary-dark);
  transform: scale(1.02);
}

.counter-btn:active {
  transform: scale(0.98);
}

.text-input,
.select-input {
  padding: 12px 16px;
  background: var(--bg-lighter);
  border: 2px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 14px;
  transition: border-color 0.2s;
}

.text-input:focus,
.select-input:focus {
  outline: none;
  border-color: var(--primary);
}

.scroll-area {
  height: 150px;
  overflow-y: auto;
  background: var(--bg-lighter);
  border: 2px solid var(--border);
  border-radius: 8px;
  padding: 12px;
}

.scroll-content p {
  padding: 8px;
  margin-bottom: 4px;
  background: var(--bg);
  border-radius: 4px;
  font-size: 13px;
}

.feature-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.feature-list li {
  font-size: 14px;
  color: var(--text-secondary);
  padding: 12px;
  background: var(--bg-lighter);
  border-radius: 8px;
}

.info-box {
  padding: 16px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid var(--primary);
  border-radius: 12px;
  display: flex;
  gap: 12px;
}

.info-icon {
  font-size: 24px;
}

.info-text strong {
  display: block;
  margin-bottom: 4px;
  color: var(--primary);
}

.info-text p {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

@media (max-width: 768px) {
  .demo-grid {
    grid-template-columns: 1fr;
  }
}
</style>
