<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

const props = defineProps<{
  option: EChartsOption;
  theme?: 'light' | 'dark';
  height?: string;
}>();

const chartRef = ref<HTMLDivElement>();
let chartInstance: echarts.ECharts | null = null;

// 获取主题配置
function getThemeConfig(theme: 'light' | 'dark') {
  const isDark = theme === 'dark';
  return {
    backgroundColor: 'transparent',
    textStyle: {
      color: isDark ? '#94a3b8' : '#64748b'
    },
    title: {
      textStyle: {
        color: isDark ? '#f1f5f9' : '#1e293b'
      }
    },
    legend: {
      textStyle: {
        color: isDark ? '#94a3b8' : '#64748b'
      }
    },
    tooltip: {
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      borderColor: isDark ? '#334155' : '#e2e8f0',
      textStyle: {
        color: isDark ? '#f1f5f9' : '#1e293b'
      }
    },
    xAxis: {
      axisLine: {
        lineStyle: { color: isDark ? '#334155' : '#e2e8f0' }
      },
      axisLabel: {
        color: isDark ? '#94a3b8' : '#64748b'
      },
      splitLine: {
        lineStyle: { color: isDark ? '#1e293b' : '#f1f5f9' }
      }
    },
    yAxis: {
      axisLine: {
        lineStyle: { color: isDark ? '#334155' : '#e2e8f0' }
      },
      axisLabel: {
        color: isDark ? '#94a3b8' : '#64748b'
      },
      splitLine: {
        lineStyle: { color: isDark ? '#1e293b' : '#f1f5f9' }
      }
    }
  };
}

// 合并主题配置
const mergedOption = computed(() => {
  const themeConfig = getThemeConfig(props.theme || 'dark');
  return echarts.util.merge(themeConfig, props.option, true);
});

function initChart() {
  if (!chartRef.value) return;
  
  chartInstance = echarts.init(chartRef.value);
  chartInstance.setOption(mergedOption.value);
}

function resizeChart() {
  chartInstance?.resize();
}

watch(() => props.option, () => {
  chartInstance?.setOption(mergedOption.value, true);
}, { deep: true });

watch(() => props.theme, () => {
  chartInstance?.setOption(mergedOption.value, true);
});

onMounted(() => {
  initChart();
  window.addEventListener('resize', resizeChart);
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeChart);
  chartInstance?.dispose();
});
</script>

<template>
  <div ref="chartRef" class="echart" :style="{ height: height || '300px' }"></div>
</template>

<style scoped>
.echart {
  width: 100%;
}
</style>
