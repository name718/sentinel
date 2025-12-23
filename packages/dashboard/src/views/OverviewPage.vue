<script setup lang="ts">
import { computed } from 'vue';
import ErrorTrendEChart from '../components/charts/ErrorTrendEChart.vue';
import ErrorTypePie from '../components/charts/ErrorTypePie.vue';
import PerformanceBar from '../components/charts/PerformanceBar.vue';

interface Stats {
  totalErrors: number;
  totalPerf: number;
  errorGroups: number;
  affectedPages: number;
}

interface ErrorGroup {
  fingerprint: string;
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
}

const props = defineProps<{
  stats: Stats;
  trendData: any[];
  errorGroups: ErrorGroup[];
  recentErrors: any[];
  theme?: 'light' | 'dark';
}>();

const emit = defineEmits<{
  viewError: [id: number];
  refreshGroups: [];
  compareSessions: [fingerprint: string];
}>();

// 计算错误类型分布
const errorTypeData = computed(() => {
  const typeMap = new Map<string, number>();
  props.recentErrors.forEach(error => {
    const type = error.type || 'unknown';
    typeMap.set(type, (typeMap.get(type) || 0) + 1);
  });
  return Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));
});

// 模拟性能数据（实际应从 props 传入）
const performanceData = computed(() => [
  { name: 'FCP', value: 1200, threshold: { good: 1800, warning: 3000 } },
  { name: 'LCP', value: 2500, threshold: { good: 2500, warning: 4000 } },
  { name: 'TTFB', value: 800, threshold: { good: 800, warning: 1800 } },
  { name: 'DOM Ready', value: 1500, threshold: { good: 2000, warning: 3500 } },
  { name: 'Load', value: 3200, threshold: { good: 3000, warning: 5000 } }
]);

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN');
}

function getTimeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}
</script>

<template>
  <div class="overview-page">
    <div class="page-header">
      <h1 class="page-title">监控概览</h1>
      <p class="page-desc">实时监控应用健康状况</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon error">🐛</div>
        <div class="stat-content">
          <div class="stat-label">错误总数</div>
          <div class="stat-value">{{ stats.totalErrors }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon perf">⚡</div>
        <div class="stat-content">
          <div class="stat-label">性能记录</div>
          <div class="stat-value">{{ stats.totalPerf }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon group">📊</div>
        <div class="stat-content">
          <div class="stat-label">错误分组</div>
          <div class="stat-value">{{ stats.errorGroups }}</div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon page">📄</div>
        <div class="stat-content">
          <div class="stat-label">影响页面</div>
          <div class="stat-value">{{ stats.affectedPages }}</div>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-grid">
      <ErrorTrendEChart :data="trendData" :theme="theme" />
      <ErrorTypePie :data="errorTypeData" :theme="theme" />
    </div>

    <!-- 性能指标 -->
    <div class="performance-section">
      <PerformanceBar :data="performanceData" :theme="theme" />
    </div>

    <div class="content-grid">
      <!-- 错误分组 -->
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">错误分组</h2>
          <button class="btn-refresh" @click="$emit('refreshGroups')">
            🔄 刷新
          </button>
        </div>
        <div class="panel-body">
          <div v-if="errorGroups.length === 0" class="empty-state">
            <div class="empty-icon">✨</div>
            <p>暂无错误分组</p>
          </div>
          <div v-else class="error-groups">
            <div 
              v-for="group in errorGroups.slice(0, 5)" 
              :key="group.fingerprint"
              class="error-group-item"
            >
              <div class="group-main">
                <div class="group-message">{{ group.message }}</div>
                <div class="group-meta">
                  <span class="group-count">{{ group.count }} 次</span>
                  <span class="group-time">{{ getTimeAgo(group.lastSeen) }}</span>
                </div>
              </div>
              <div class="group-actions">
                <button 
                  class="btn-compare" 
                  @click="$emit('compareSessions', group.fingerprint)"
                  :title="`对比 ${group.count} 个 Session`"
                >
                  🔍 对比
                </button>
                <div class="group-badge">{{ group.count }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近错误 -->
      <div class="panel">
        <div class="panel-header">
          <h2 class="panel-title">最近错误</h2>
        </div>
        <div class="panel-body">
          <div v-if="recentErrors.length === 0" class="empty-state">
            <div class="empty-icon">✨</div>
            <p>暂无错误记录</p>
          </div>
          <div v-else class="recent-errors">
            <div 
              v-for="error in recentErrors" 
              :key="error.id"
              class="recent-error-item"
              @click="$emit('viewError', error.id)"
            >
              <div class="error-type-badge">{{ error.type }}</div>
              <div class="error-content">
                <div class="error-message">{{ error.message }}</div>
                <div class="error-meta">
                  <span class="error-url">{{ error.url }}</span>
                  <span class="error-time">{{ getTimeAgo(error.timestamp) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.overview-page {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.page-desc {
  color: var(--text-secondary);
  font-size: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-icon.error {
  background: rgba(239, 68, 68, 0.1);
}

.stat-icon.perf {
  background: rgba(245, 158, 11, 0.1);
}

.stat-icon.group {
  background: rgba(99, 102, 241, 0.1);
}

.stat-icon.page {
  background: rgba(16, 185, 129, 0.1);
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
}

/* 图表区域 */
.charts-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.performance-section {
  margin-bottom: 24px;
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.panel {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.panel-header {
  padding: 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
}

.btn-refresh {
  padding: 6px 12px;
  background: var(--bg-lighter);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-refresh:hover {
  background: var(--border);
  color: var(--text);
}

.panel-body {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.error-groups,
.recent-errors {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.error-group-item {
  padding: 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  transition: all 0.2s;
}

.error-group-item:hover {
  border-color: var(--primary);
}

.group-main {
  flex: 1;
  min-width: 0;
}

.group-message {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.group-count {
  color: var(--danger);
  font-weight: 600;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-compare {
  padding: 6px 12px;
  background: var(--bg-lighter);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.btn-compare:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.group-badge {
  padding: 4px 12px;
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.recent-error-item {
  padding: 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.recent-error-item:hover {
  border-color: var(--primary);
  transform: translateX(4px);
}

.error-type-badge {
  padding: 4px 8px;
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  height: fit-content;
}

.error-content {
  flex: 1;
  min-width: 0;
}

.error-message {
  font-size: 14px;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.error-url {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
