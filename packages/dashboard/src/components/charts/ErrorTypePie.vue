<script setup lang="ts">
import { computed } from 'vue';
import EChart from './EChart.vue';
import type { EChartsOption } from 'echarts';

interface ErrorTypeData {
  type: string;
  count: number;
}

const props = defineProps<{
  data: ErrorTypeData[];
  theme?: 'light' | 'dark';
}>();

const colors = ['#ef4444', '#f59e0b', '#6366f1', '#10b981', '#8b5cf6'];

const chartOption = computed<EChartsOption>(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c} ({d}%)'
  },
  legend: {
    orient: 'vertical',
    right: '5%',
    top: 'center',
    itemGap: 12,
    textStyle: {
      fontSize: 12
    }
  },
  series: [
    {
      name: '错误类型',
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
        borderColor: props.theme === 'dark' ? '#1e293b' : '#ffffff',
        borderWidth: 2
      },
      label: {
        show: false
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold'
        },
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.3)'
        }
      },
      labelLine: {
        show: false
      },
      data: props.data.map((item, index) => ({
        value: item.count,
        name: item.type,
        itemStyle: {
          color: colors[index % colors.length]
        }
      }))
    }
  ]
}));
</script>

<template>
  <div class="pie-card">
    <div class="chart-header">
      <h3 class="chart-title">🎯 错误类型分布</h3>
    </div>
    <EChart :option="chartOption" :theme="theme" height="250px" />
  </div>
</template>

<style scoped>
.pie-card {
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
