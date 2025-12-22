<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import Sidebar from './components/Sidebar.vue';
import TopBar from './components/TopBar.vue';
import ErrorDetailModal from './components/ErrorDetailModal.vue';
import OverviewPage from './views/OverviewPage.vue';
import ErrorsPage from './views/ErrorsPage.vue';
import PerformancePage from './views/PerformancePage.vue';
import { useErrorData } from './composables/useErrorData';
import { usePerformanceData } from './composables/usePerformanceData';
import { useErrorFilters } from './composables/useErrorFilters';

const API_BASE = '/api';
const DSN = 'demo-app';

const activeTab = ref<'overview' | 'errors' | 'performance'>('overview');
const timeRange = ref<'1h' | '24h' | '7d' | '30d'>('24h');

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

const overviewStats = computed(() => ({
  totalErrors: stats.value.totalErrors,
  totalPerf: perfStats.value.totalPerf,
  errorGroups: errorGroups.value.length,
  affectedPages: new Set(errors.value.map(e => e.url)).size
}));

watch(timeRange, () => {
  fetchErrors();
  fetchPerformance();
});

onMounted(() => {
  fetchErrors();
  fetchPerformance();
  fetchErrorGroups();
});
</script>

<template>
  <div class="dashboard">
    <Sidebar :activeTab="activeTab" @update:activeTab="(tab) => activeTab = tab as typeof activeTab" />
    
    <div class="main-content">
      <TopBar 
        :timeRange="timeRange" 
        :dsn="DSN"
        @update:timeRange="(range) => timeRange = range as typeof timeRange" 
      />
      
      <div class="page-content">
        <OverviewPage
          v-if="activeTab === 'overview'"
          :stats="overviewStats"
          :trendData="trendData"
          :errorGroups="errorGroups"
          :recentErrors="errors.slice(0, 5)"
          @viewError="fetchErrorDetail"
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
      </div>
    </div>

    <ErrorDetailModal :error="selectedError" @close="closeDetail" />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --bg: #0f172a;
  --bg-light: #1e293b;
  --bg-lighter: #334155;
  --text: #f1f5f9;
  --text-secondary: #94a3b8;
  --border: #334155;
  --sidebar-width: 240px;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  overflow-x: hidden;
}

.dashboard {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex: 1;
  margin-left: var(--sidebar-width);
  display: flex;
  flex-direction: column;
}

.page-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

/* 滚动条样式 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg);
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--bg-lighter);
}
</style>
