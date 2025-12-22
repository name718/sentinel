<script setup lang="ts">
import { ref } from 'vue';
import WebVitalsScore from '../components/WebVitalsScore.vue';
import ResourceWaterfallChart from '../components/ResourceWaterfallChart.vue';
import LongTaskAnalysis from '../components/LongTaskAnalysis.vue';

interface PerformanceData {
  id: number;
  url: string;
  fp?: number;
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  domReady?: number | null;
  load?: number | null;
  timestamp: number;
  longTasks?: any[];
  resources?: any[];
  webVitalsScore?: any;
}

defineProps<{
  performance: PerformanceData[];
}>();

defineEmits<{
  refresh: [];
}>();

const selectedPerf = ref<PerformanceData | null>(null);

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN');
}

function formatDuration(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return '-';
  return `${ms}ms`;
}

function viewDetail(perf: PerformanceData) {
  selectedPerf.value = perf;
}

function closeDetail() {
  selectedPerf.value = null;
}
</script>

<template>
  <div class="page">
    <h1 class="page-title">⚡ 性能数据</h1>
    
    <div class="toolbar">
      <button class="btn btn-primary" @click="$emit('refresh')">🔄 刷新</button>
    </div>

    <div class="card">
      <div class="card-body">
        <div v-if="performance.length === 0" class="empty">暂无性能数据</div>
        <table v-else class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>页面</th>
              <th>FCP</th>
              <th>LCP</th>
              <th>FID</th>
              <th>CLS</th>
              <th>TTFB</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="perf in performance" :key="perf.id">
              <td>#{{ perf.id }}</td>
              <td class="url-cell">{{ perf.url }}</td>
              <td>{{ formatDuration(perf.fcp) }}</td>
              <td>{{ formatDuration(perf.lcp) }}</td>
              <td>{{ formatDuration(perf.fid) }}</td>
              <td>{{ perf.cls?.toFixed(3) || '-' }}</td>
              <td>{{ formatDuration(perf.ttfb) }}</td>
              <td>{{ formatTime(perf.timestamp) }}</td>
              <td>
                <button class="btn btn-sm" @click="viewDetail(perf)">详情</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 性能详情弹窗 -->
    <div v-if="selectedPerf" class="modal-overlay" @click.self="closeDetail">
      <div class="modal-large">
        <div class="modal-header">
          <h2>性能详情 #{{ selectedPerf.id }}</h2>
          <button class="modal-close" @click="closeDetail">✕</button>
        </div>
        <div class="modal-body">
          <!-- Web Vitals 评分 -->
          <section class="detail-section">
            <h3>📊 Core Web Vitals 评分</h3>
            <WebVitalsScore :data="selectedPerf" />
          </section>

          <!-- 长任务分析 -->
          <section v-if="selectedPerf.longTasks?.length" class="detail-section">
            <h3>⏱️ 长任务分析</h3>
            <LongTaskAnalysis :tasks="selectedPerf.longTasks" />
          </section>

          <!-- 资源瀑布图 -->
          <section v-if="selectedPerf.resources?.length" class="detail-section">
            <h3>📊 资源加载瀑布图</h3>
            <ResourceWaterfallChart :resources="selectedPerf.resources" />
          </section>

          <!-- 基础指标 -->
          <section class="detail-section">
            <h3>📈 基础指标</h3>
            <div class="metrics-grid">
              <div class="metric-item">
                <div class="metric-label">FP (首次绘制)</div>
                <div class="metric-value">{{ formatDuration(selectedPerf.fp) }}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">DOM Ready</div>
                <div class="metric-value">{{ formatDuration(selectedPerf.domReady) }}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Load</div>
                <div class="metric-value">{{ formatDuration(selectedPerf.load) }}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-title { 
  font-size: 24px; 
  margin-bottom: 24px; 
  color: #1e293b; 
}
.toolbar { 
  margin-bottom: 16px; 
  display: flex; 
  gap: 8px; 
}
.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  background: #6366f1;
  color: white;
  transition: all 0.2s;
}
.btn:hover { opacity: 0.9; }
.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
  background: #6366f1;
  color: white;
}
.card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 24px;
}
.card-body { padding: 20px; }
.empty { text-align: center; color: #64748b; padding: 40px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
.table th { font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; }
.table tr:hover { background: #f8fafc; }
.url-cell { 
  max-width: 200px; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  white-space: nowrap; 
  font-size: 12px; 
  color: #64748b; 
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.modal-large {
  background: #ffffff;
  border-radius: 12px;
  width: 95%;
  max-width: 1400px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.modal-header h2 { font-size: 20px; margin: 0; }
.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #64748b;
}
.modal-body { 
  padding: 24px; 
  overflow-y: auto; 
}
.detail-section {
  margin-bottom: 32px;
}
.detail-section h3 {
  font-size: 18px;
  margin-bottom: 16px;
  color: #1e293b;
}
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.metric-item {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  text-align: center;
}
.metric-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}
.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}
</style>
