<script setup lang="ts">
interface PerformanceData {
  id: number;
  url: string;
  fp: number | null;
  fcp: number | null;
  lcp: number | null;
  ttfb: number | null;
  domReady: number | null;
  load: number | null;
  timestamp: number;
}

defineProps<{
  performance: PerformanceData[];
}>();

defineEmits<{
  refresh: [];
}>();

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN');
}

function formatDuration(ms: number | null) {
  if (ms === null || ms === undefined) return '-';
  return `${ms}ms`;
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
              <th>FP</th>
              <th>FCP</th>
              <th>LCP</th>
              <th>TTFB</th>
              <th>DOM Ready</th>
              <th>Load</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="perf in performance" :key="perf.id">
              <td>#{{ perf.id }}</td>
              <td class="url-cell">{{ perf.url }}</td>
              <td>{{ formatDuration(perf.fp) }}</td>
              <td>{{ formatDuration(perf.fcp) }}</td>
              <td>{{ formatDuration(perf.lcp) }}</td>
              <td>{{ formatDuration(perf.ttfb) }}</td>
              <td>{{ formatDuration(perf.domReady) }}</td>
              <td>{{ formatDuration(perf.load) }}</td>
              <td>{{ formatTime(perf.timestamp) }}</td>
            </tr>
          </tbody>
        </table>
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
</style>
