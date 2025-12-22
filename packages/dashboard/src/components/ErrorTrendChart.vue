<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TrendData {
  time: string;
  count: number;
}

const props = defineProps<{
  data: TrendData[];
}>();

const chartData = computed(() => ({
  labels: props.data.map(d => d.time),
  datasets: [{
    label: '错误数量',
    data: props.data.map(d => d.count),
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    fill: true,
    tension: 0.4
  }]
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      mode: 'index' as const,
      intersect: false
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { precision: 0 }
    }
  }
};
</script>

<template>
  <div class="card">
    <div class="card-header">
      <h2>📊 错误趋势</h2>
    </div>
    <div class="card-body">
      <div class="chart-container">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 24px;
}
.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}
.card-header h2 { font-size: 16px; margin: 0; }
.card-body { padding: 20px; }
.chart-container {
  height: 300px;
  position: relative;
}
</style>
