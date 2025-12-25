<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import ErrorTrendEChart from '../components/charts/ErrorTrendEChart.vue';
import ErrorTypePie from '../components/charts/ErrorTypePie.vue';
import PerformanceBar from '../components/charts/PerformanceBar.vue';
import ErrorStatusBadge from '../components/ErrorStatusBadge.vue';

type ErrorStatus = 'open' | 'processing' | 'resolved' | 'ignored';

interface Stats {
  totalErrors: number;
  totalPerf: number;
  errorGroups: number;
  affectedPages: number;
}

interface ErrorGroup {
  fingerprint: string;
  message: string;
  count?: number;
  totalCount?: number;
  firstSeen: number;
  lastSeen: number;
  status?: ErrorStatus;
}

interface PerformanceRecord {
  id: number;
  fp?: number;
  fcp?: number;
  lcp?: number;
  ttfb?: number;
  domReady?: number;
  load?: number;
  cls?: number;
  fid?: number;
  timestamp?: number;
}

const props = defineProps<{
  stats: Stats;
  trendData: any[];
  errorGroups: ErrorGroup[];
  recentErrors: any[];
  performance?: PerformanceRecord[];
  theme?: 'light' | 'dark';
}>();

const emit = defineEmits<{
  viewError: [id: number];
  refreshGroups: [];
  compareSessions: [fingerprint: string];
  updateGroupStatus: [fingerprint: string, status: ErrorStatus];
}>();

const router = useRouter();

// 计算错误类型分布
const errorTypeData = computed(() => {
  const typeMap = new Map<string, number>();
  props.recentErrors.forEach(error => {
    const type = error.type || 'unknown';
    typeMap.set(type, (typeMap.get(type) || 0) + 1);
  });
  return Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));
});

// 计算性能数据平均值
const performanceData = computed(() => {
  const records = props.performance || [];
  if (records.length === 0) {
    return [
      { name: 'FCP', value: 0, threshold: { good: 1800, warning: 3000 } },
      { name: 'LCP', value: 0, threshold: { good: 2500, warning: 4000 } },
      { name: 'TTFB', value: 0, threshold: { good: 800, warning: 1800 } },
      { name: 'DOM Ready', value: 0, threshold: { good: 2000, warning: 3500 } },
      { name: 'Load', value: 0, threshold: { good: 3000, warning: 5000 } }
    ];
  }

  // 计算各指标平均值
  const avg = (key: keyof PerformanceRecord) => {
    const values = records.map(r => r[key]).filter((v): v is number => typeof v === 'number' && v > 0);
    return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  };

  return [
    { name: 'FCP', value: avg('fcp'), threshold: { good: 1800, warning: 3000 } },
    { name: 'LCP', value: avg('lcp'), threshold: { good: 2500, warning: 4000 } },
    { name: 'TTFB', value: avg('ttfb'), threshold: { good: 800, warning: 1800 } },
    { name: 'DOM Ready', value: avg('domReady'), threshold: { good: 2000, warning: 3500 } },
    { name: 'Load', value: avg('load'), threshold: { good: 3000, warning: 5000 } }
  ];
});

// 计算错误率（错误数/性能记录数，近似 PV）
const errorRate = computed(() => {
  if (props.stats.totalPerf === 0) return 0;
  return ((props.stats.totalErrors / props.stats.totalPerf) * 100).toFixed(2);
});

// 计算未解决错误数
const unresolvedErrors = computed(() => {
  return props.errorGroups.filter(g => g.status === 'open' || !g.status).length;
});

// 计算 Web Vitals 评分
const webVitalsScore = computed(() => {
  const records = props.performance || [];
  if (records.length === 0) return { score: 0, level: 'unknown' };
  
  const avg = (key: keyof PerformanceRecord) => {
    const values = records.map(r => r[key]).filter((v): v is number => typeof v === 'number' && v > 0);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };
  
  const lcp = avg('lcp');
  const fcp = avg('fcp');
  const cls = avg('cls');
  
  // 简单评分：LCP < 2.5s, FCP < 1.8s, CLS < 0.1 为优秀
  let score = 100;
  if (lcp > 4000) score -= 30;
  else if (lcp > 2500) score -= 15;
  if (fcp > 3000) score -= 30;
  else if (fcp > 1800) score -= 15;
  if (cls > 0.25) score -= 30;
  else if (cls > 0.1) score -= 15;
  
  const level = score >= 80 ? 'good' : score >= 50 ? 'needs-improvement' : 'poor';
  return { score: Math.max(0, score), level };
});

// 计算今日错误数（最近24小时）
const todayErrors = computed(() => {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return props.recentErrors.filter(e => e.timestamp > oneDayAgo).length;
});

// 计算错误趋势（与前一时段对比）
const errorTrend = computed(() => {
  if (props.trendData.length < 2) return { direction: 'stable', percentage: 0 };
  
  const mid = Math.floor(props.trendData.length / 2);
  const firstHalf = props.trendData.slice(0, mid).reduce((sum, d) => sum + d.count, 0);
  const secondHalf = props.trendData.slice(mid).reduce((sum, d) => sum + d.count, 0);
  
  if (firstHalf === 0) return { direction: 'stable', percentage: 0 };
  
  const change = ((secondHalf - firstHalf) / firstHalf) * 100;
  return {
    direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
    percentage: Math.abs(Math.round(change))
  };
});

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

function goToErrorDetail(id: number) {
  router.push(`/errors/${id}`);
}
</script>

<template>
  <div class="overview-page">
    <div class="page-header">
      <h1 class="page-title">监控概览</h1>
      <p class="page-desc">实时监控应用健康状况</p>
    </div>

    <!-- 核心指标卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon error">🐛</div>
        <div class="stat-content">
          <div class="stat-label">错误总数</div>
          <div class="stat-value">{{ stats.totalErrors }}</div>
          <div class="stat-sub" v-if="errorTrend.direction !== 'stable'">
            <span :class="['trend', errorTrend.direction]">
              {{ errorTrend.direction === 'up' ? '↑' : '↓' }} {{ errorTrend.percentage }}%
            </span>
            <span class="trend-label">较前期</span>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon warning">⚠️</div>
        <div class="stat-content">
          <div class="stat-label">未解决错误</div>
          <div class="stat-value" :class="{ 'text-danger': unresolvedErrors > 0 }">{{ unresolvedErrors }}</div>
          <div class="stat-sub">
            <span class="sub-text">共 {{ stats.errorGroups }} 个分组</span>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon rate">📉</div>
        <div class="stat-content">
          <div class="stat-label">错误率</div>
          <div class="stat-value" :class="{ 'text-danger': Number(errorRate) > 1, 'text-warning': Number(errorRate) > 0.5 }">
            {{ errorRate }}%
          </div>
          <div class="stat-sub">
            <span class="sub-text">错误数/访问量</span>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon perf">⚡</div>
        <div class="stat-content">
          <div class="stat-label">性能评分</div>
          <div class="stat-value" :class="['score-' + webVitalsScore.level]">
            {{ webVitalsScore.score }}
          </div>
          <div class="stat-sub">
            <span :class="['score-badge', webVitalsScore.level]">
              {{ webVitalsScore.level === 'good' ? '优秀' : webVitalsScore.level === 'needs-improvement' ? '待优化' : '较差' }}
            </span>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon today">📅</div>
        <div class="stat-content">
          <div class="stat-label">今日错误</div>
          <div class="stat-value">{{ todayErrors }}</div>
          <div class="stat-sub">
            <span class="sub-text">最近 24 小时</span>
          </div>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon page">📄</div>
        <div class="stat-content">
          <div class="stat-label">影响页面</div>
          <div class="stat-value">{{ stats.affectedPages }}</div>
          <div class="stat-sub">
            <span class="sub-text">{{ stats.totalPerf }} 次访问</span>
          </div>
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
              :class="{ 
                'group-resolved': group.status === 'resolved', 
                'group-ignored': group.status === 'ignored' 
              }"
            >
              <div class="group-main">
                <div class="group-message">{{ group.message }}</div>
                <div class="group-meta">
                  <span class="group-count">{{ group.totalCount || group.count || 0 }} 次</span>
                  <span class="group-time">{{ getTimeAgo(group.lastSeen) }}</span>
                </div>
              </div>
              <div class="group-actions">
                <ErrorStatusBadge 
                  :status="group.status || 'open'" 
                  @change="$emit('updateGroupStatus', group.fingerprint, $event)"
                />
                <button 
                  class="btn-compare" 
                  @click="$emit('compareSessions', group.fingerprint)"
                  :title="`对比 ${group.totalCount || group.count || 0} 个 Session`"
                >
                  🔍 对比
                </button>
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
              @click="goToErrorDetail(error.id)"
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
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
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
  flex-shrink: 0;
}

.stat-icon.error {
  background: rgba(239, 68, 68, 0.1);
}

.stat-icon.warning {
  background: rgba(245, 158, 11, 0.1);
}

.stat-icon.rate {
  background: rgba(139, 92, 246, 0.1);
}

.stat-icon.perf {
  background: rgba(16, 185, 129, 0.1);
}

.stat-icon.today {
  background: rgba(59, 130, 246, 0.1);
}

.stat-icon.page {
  background: rgba(99, 102, 241, 0.1);
}

.stat-content {
  flex: 1;
  min-width: 0;
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
  line-height: 1.2;
}

.stat-value.text-danger {
  color: #ef4444;
}

.stat-value.text-warning {
  color: #f59e0b;
}

.stat-value.score-good {
  color: #10b981;
}

.stat-value.score-needs-improvement {
  color: #f59e0b;
}

.stat-value.score-poor {
  color: #ef4444;
}

.stat-sub {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.trend {
  font-size: 13px;
  font-weight: 600;
}

.trend.up {
  color: #ef4444;
}

.trend.down {
  color: #10b981;
}

.trend-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.sub-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.score-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.score-badge.good {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.score-badge.needs-improvement {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.score-badge.poor {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
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

.error-group-item.group-resolved {
  opacity: 0.7;
  border-left: 3px solid #10b981;
}

.error-group-item.group-ignored {
  opacity: 0.5;
  border-left: 3px solid #6b7280;
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
