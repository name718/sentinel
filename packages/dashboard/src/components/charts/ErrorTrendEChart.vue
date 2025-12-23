<script setup lang="ts">
import { computed } from 'vue';
import EChart from './EChart.vue';
import type { EChartsOption } from 'echarts';

interface TrendData {
  time: string;
  count: number;
}

const props = defineProps<{
  data: TrendData[];
  theme?: 'light' | 'dark';
}>();

const chartOption = computed<EChartsOption>(() => ({
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    top: '10%',
    containLabel: true
  },
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'cross',
      label: {
        backgroundColor: '#6366f1'
      }
    }
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: props.data.map(d => d.time)
  },
  yAxis: {
    type: 'value',
    minInterval: 1
  },
  series: [
    {
      name: '错误数量',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      sampling: 'lttb',
      itemStyle: {
        color: '#ef4444'
      },
      lineStyle: {
        width: 3,
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [
            { offset: 0, color: '#ef4444' },
            { offset: 1, color: '#f97316' }
          ]
        }
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(239, 68, 68, 0.3)' },
            { offset: 1, color: 'rgba(239, 68, 68, 0.05)' }
          ]
        }
      },
      data: props.data.map(d => d.count)
    }
  ]
}));
</script>

<template>
  <div class="chart-card">
    <div class="chart-header">
      <h3 class="chart-title">📈 错误趋势</h3>
    </div>
    <EChart :option="chartOption" :theme="theme" height="280px" />
  </div>
</template>

<style scoped>
.chart-card {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}

.chart-header {
  margin-bottom: 16px;
}

.chart-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}
</style>
