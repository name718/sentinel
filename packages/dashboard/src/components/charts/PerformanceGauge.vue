<script setup lang="ts">
import { computed } from 'vue';
import EChart from './EChart.vue';
import type { EChartsOption } from 'echarts';

const props = defineProps<{
  title: string;
  value: number;
  max: number;
  unit?: string;
  theme?: 'light' | 'dark';
  thresholds?: { good: number; warning: number };
}>();

// 根据阈值获取颜色
function getColor(value: number): string {
  const { good = 1000, warning = 2500 } = props.thresholds || {};
  if (value <= good) return '#10b981';
  if (value <= warning) return '#f59e0b';
  return '#ef4444';
}

const chartOption = computed<EChartsOption>(() => ({
  series: [
    {
      type: 'gauge',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max: props.max,
      splitNumber: 5,
      itemStyle: {
        color: getColor(props.value)
      },
      progress: {
        show: true,
        width: 20,
        roundCap: true
      },
      pointer: {
        show: false
      },
      axisLine: {
        lineStyle: {
          width: 20,
          color: [[1, props.theme === 'dark' ? '#1e293b' : '#f1f5f9']]
        },
        roundCap: true
      },
      axisTick: {
        show: false
      },
      splitLine: {
        show: false
      },
      axisLabel: {
        show: false
      },
      title: {
        show: true,
        offsetCenter: [0, '70%'],
        fontSize: 14,
        color: props.theme === 'dark' ? '#94a3b8' : '#64748b'
      },
      detail: {
        valueAnimation: true,
        offsetCenter: [0, '20%'],
        fontSize: 28,
        fontWeight: 'bold',
        formatter: `{value}${props.unit || 'ms'}`,
        color: getColor(props.value)
      },
      data: [
        {
          value: props.value,
          name: props.title
        }
      ]
    }
  ]
}));
</script>

<template>
  <div class="gauge-card">
    <EChart :option="chartOption" :theme="theme" height="200px" />
  </div>
</template>

<style scoped>
.gauge-card {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}
</style>
