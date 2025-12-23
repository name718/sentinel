<script setup lang="ts">
import { computed } from 'vue';
import EChart from './EChart.vue';
import type { EChartsOption } from 'echarts';

interface PerformanceMetric {
  name: string;
  value: number;
  threshold?: { good: number; warning: number };
}

const props = defineProps<{
  data: PerformanceMetric[];
  theme?: 'light' | 'dark';
}>();

function getColor(value: number, threshold?: { good: number; warning: number }): string {
  if (!threshold) return '#6366f1';
  if (value <= threshold.good) return '#10b981';
  if (value <= threshold.warning) return '#f59e0b';
  return '#ef4444';
}

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
      type: 'shadow'
    },
    formatter: (params: any) => {
      const data = params[0];
      return `${data.name}: ${data.value}ms`;
    }
  },
  xAxis: {
    type: 'category',
    data: props.data.map(d => d.name),
    axisLabel: {
      interval: 0,
      rotate: 0
    }
  },
  yAxis: {
    type: 'value',
    name: 'ms',
    nameTextStyle: {
      padding: [0, 30, 0, 0]
    }
  },
  series: [
    {
      type: 'bar',
      barWidth: '50%',
      itemStyle: {
        borderRadius: [6, 6, 0, 0]
      },
      data: props.data.map(d => ({
        value: d.value,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: getColor(d.value, d.threshold) },
              { offset: 1, color: getColor(d.value, d.threshold) + '80' }
            ]
          }
        }
      }))
    }
  ]
}));
</script>

<template>
  <div class="bar-card">
    <div class="chart-header">
      <h3 class="chart-title">⚡ 性能指标</h3>
    </div>
    <EChart :option="chartOption" :theme="theme" height="280px" />
  </div>
</template>

<style scoped>
.bar-card {
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
