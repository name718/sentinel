<script setup lang="ts">
interface WebVitalsScore {
  fcp: 'good' | 'needs-improvement' | 'poor' | null;
  lcp: 'good' | 'needs-improvement' | 'poor' | null;
  fid: 'good' | 'needs-improvement' | 'poor' | null;
  cls: 'good' | 'needs-improvement' | 'poor' | null;
  ttfb: 'good' | 'needs-improvement' | 'poor' | null;
}

interface PerformanceData {
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  webVitalsScore?: WebVitalsScore;
}

const props = defineProps<{
  data: PerformanceData;
}>();

const metrics = [
  {
    key: 'fcp',
    name: 'FCP',
    fullName: 'First Contentful Paint',
    description: '首次内容绘制',
    unit: 'ms',
    thresholds: { good: 1800, poor: 3000 }
  },
  {
    key: 'lcp',
    name: 'LCP',
    fullName: 'Largest Contentful Paint',
    description: '最大内容绘制',
    unit: 'ms',
    thresholds: { good: 2500, poor: 4000 }
  },
  {
    key: 'fid',
    name: 'FID',
    fullName: 'First Input Delay',
    description: '首次输入延迟',
    unit: 'ms',
    thresholds: { good: 100, poor: 300 }
  },
  {
    key: 'cls',
    name: 'CLS',
    fullName: 'Cumulative Layout Shift',
    description: '累积布局偏移',
    unit: '',
    thresholds: { good: 0.1, poor: 0.25 }
  },
  {       
    key: 'ttfb',
    name: 'TTFB',
    fullName: 'Time To First Byte',
    description: '首字节时间',
    unit: 'ms',
    thresholds: { good: 800, poor: 1800 }
  }
];

function getScoreColor(score: string | null): string {
  const colors = {
    good: '#10b981',
    'needs-improvement': '#f59e0b',
    poor: '#ef4444'
  };
  return colors[score as keyof typeof colors] || '#6b7280';
}

function getScoreText(score: string | null): string {
  const texts = {
    good: '优秀',
    'needs-improvement': '需改进',
    poor: '较差'
  };
  return texts[score as keyof typeof texts] || '未知';
}

function formatValue(value: number | undefined, unit: string): string {
  if (value === undefined) return '-';
  if (unit === '') return value.toFixed(3);
  return `${Math.round(value)}${unit}`;
}

function getScore(key: string): string | null {
  return props.data.webVitalsScore?.[key as keyof WebVitalsScore] || null;
}

function getValue(key: string): number | undefined {
  return props.data[key as keyof PerformanceData] as number | undefined;
}
</script>

<template>
  <div class="web-vitals">
    <div class="vitals-grid">
      <div 
        v-for="metric in metrics" 
        :key="metric.key"
        class="vital-card"
      >
        <div class="vital-header">
          <div class="vital-name">
            <span class="vital-abbr">{{ metric.name }}</span>
            <span class="vital-full">{{ metric.fullName }}</span>
          </div>
          <div 
            class="vital-score"
            :style="{ background: getScoreColor(getScore(metric.key)) }"
          >
            {{ getScoreText(getScore(metric.key)) }}
          </div>
        </div>
        <div class="vital-value">
          {{ formatValue(getValue(metric.key), metric.unit) }}
        </div>
        <div class="vital-description">{{ metric.description }}</div>
        <div class="vital-thresholds">
          <div class="threshold-item">
            <span class="threshold-dot" style="background: #10b981;"></span>
            <span class="threshold-text">优秀: &lt; {{ metric.thresholds.good }}{{ metric.unit }}</span>
          </div>
          <div class="threshold-item">
            <span class="threshold-dot" style="background: #f59e0b;"></span>
            <span class="threshold-text">需改进: {{ metric.thresholds.good }}-{{ metric.thresholds.poor }}{{ metric.unit }}</span>
          </div>
          <div class="threshold-item">
            <span class="threshold-dot" style="background: #ef4444;"></span>
            <span class="threshold-text">较差: &gt; {{ metric.thresholds.poor }}{{ metric.unit }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 总体评分 -->
    <div class="overall-score">
      <h4>📊 总体评分</h4>
      <div class="score-summary">
        <div class="score-item">
          <span class="score-label">优秀</span>
          <span class="score-count" style="color: #10b981;">
            {{ metrics.filter(m => getScore(m.key) === 'good').length }}
          </span>
        </div>
        <div class="score-item">
          <span class="score-label">需改进</span>
          <span class="score-count" style="color: #f59e0b;">
            {{ metrics.filter(m => getScore(m.key) === 'needs-improvement').length }}
          </span>
        </div>
        <div class="score-item">
          <span class="score-label">较差</span>
          <span class="score-count" style="color: #ef4444;">
            {{ metrics.filter(m => getScore(m.key) === 'poor').length }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.web-vitals {
  background: #ffffff;
  border-radius: 8px;
  padding: 20px;
}
.vitals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.vital-card {
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  transition: all 0.2s;
}
.vital-card:hover {
  border-color: #6366f1;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
}
.vital-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}
.vital-name {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.vital-abbr {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}
.vital-full {
  font-size: 11px;
  color: #64748b;
}
.vital-score {
  padding: 4px 10px;
  border-radius: 12px;
  color: white;
  font-size: 11px;
  font-weight: 600;
}
.vital-value {
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 8px;
}
.vital-description {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 16px;
}
.vital-thresholds {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.threshold-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.threshold-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.threshold-text {
  font-size: 11px;
  color: #64748b;
}
.overall-score {
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
}
.overall-score h4 {
  margin-bottom: 16px;
  font-size: 16px;
}
.score-summary {
  display: flex;
  gap: 32px;
}
.score-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.score-label {
  font-size: 13px;
  opacity: 0.9;
}
.score-count {
  font-size: 32px;
  font-weight: 700;
}
</style>
