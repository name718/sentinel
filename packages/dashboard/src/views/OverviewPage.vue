<script setup lang="ts">
import StatsGrid from '../components/StatsGrid.vue';
import ErrorTrendChart from '../components/ErrorTrendChart.vue';
import ErrorGroupList from '../components/ErrorGroupList.vue';

defineProps<{
  stats: Array<{ label: string; value: number; icon: string; color: string }>;
  trendData: Array<{ time: string; count: number }>;
  errorGroups: any[];
}>();

defineEmits<{
  refreshGroups: [];
}>();
</script>

<template>
  <div class="page">
    <h1 class="page-title">📈 监控概览</h1>
    <StatsGrid :stats="stats" />
    <ErrorTrendChart :data="trendData" />
    <ErrorGroupList :groups="errorGroups" @refresh="$emit('refreshGroups')" />
  </div>
</template>

<style scoped>
.page-title { 
  font-size: 24px; 
  margin-bottom: 24px; 
  color: #1e293b; 
}
</style>
