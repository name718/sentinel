<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import Sidebar from './components/Sidebar.vue';
import TimeSelector from './components/TimeSelector.vue';
import ErrorDetailModal from './components/ErrorDetailModal.vue';
import OverviewPage from './views/OverviewPage.vue';
import ErrorsPage from './views/ErrorsPage.vue';
import PerformancePage from './views/PerformancePage.vue';
import { useErrorData } from './composables/useErrorData';
import { usePerformanceData } from './composables/usePerformanceData';
import { useErrorFilters } from './composables/useErrorFilters';

// 配置
const API_BASE = '/api';
const DSN = 'demo-app';

// 状态
const activeTab = ref<'errors' | 'performance' | 'overview'>('overview');
const timeRange = ref<'1h' | '24h' | '7d' | '30d'>('24h');

// 使用组合式函数
const {
  errors,
  errorGroups,
  trendData,
  stats,
  loading,
  selectedError,
  fetchErrors,
  fetchErrorGroups,
  fetchErrorDetail,
  closeDetail,
  calculateTrend
} = useErrorData(API_BASE, DSN, timeRange);

const {
  performance,
  perfStats,
  fetchPerformance
} = usePerformanceData(API_BASE, DSN, timeRange);

const {
  searchKeyword,
  errorTypeFilter,
  currentPage,
  pageSize,
  filteredErrors,
  paginatedErrors,
  errorTypes,
  totalPages,
  resetFilters,
  changePage
} = useErrorFilters(errors);

// 概览统计
const overviewStats = computed(() => [
  { label: '错误总数', value: stats.value.totalErrors, icon: '🐛', color: '#ef4444' },
  { label: '性能记录', value: perfStats.value.totalPerf, icon: '⚡', color: '#f59e0b' },
  { label: '错误分组', value: errorGroups.value.length, icon: '📊', color: '#6366f1' },
  { label: '影响页面', value: new Set(errors.value.map(e => e.url)).size, icon: '📄', color: '#10b981' }
]);

// 监听时间范围变化
watch(timeRange, () => {
  fetchErrors();
  fetchPerformance();
});

// 初始化
onMounted(() => {
  fetchErrors();
  fetchPerformance();
  fetchErrorGroups();
});
</script>

<template>
  <div class="dashboard">
    <Sidebar :activeTab="activeTab" :dsn="DSN" @update:activeTab="activeTab = $event" />
    
    <main class="main">
      <TimeSelector v-model="timeRange" />

      <OverviewPage
        v-if="activeTab === 'overview'"
        :stats="overviewStats"
        :trendData="trendData"
        :errorGroups="errorGroups"
        @refreshGroups="fetchErrorGroups"
      />

      <ErrorsPage
        v-if="activeTab === 'errors'"
        v-model:searchKeyword="searchKeyword"
        v-model:errorTypeFilter="errorTypeFilter"
        :errorTypes="errorTypes"
        :errors="paginatedErrors"
        :currentPage="currentPage"
        :totalPages="totalPages"
        :totalCount="filteredErrors.length"
        :loading="loading"
        @reset="resetFilters"
        @refresh="fetchErrors"
        @viewDetail="fetchErrorDetail"
        @changePage="changePage"
      />

      <PerformancePage
        v-if="activeTab === 'performance'"
        :performance="performance"
        @refresh="fetchPerformance"
      />
    </main>

    <ErrorDetailModal :error="selectedError" @close="closeDetail" />
  </div>
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
  background: #f1f5f9;
}
.dashboard { 
  display: flex; 
  min-height: 100vh; 
}
.main { 
  flex: 1; 
  margin-left: 240px; 
  padding: 24px; 
}
</style>
