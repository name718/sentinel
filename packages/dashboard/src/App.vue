<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import Sidebar from './components/Sidebar.vue';
import TopBar from './components/TopBar.vue';
import ErrorDetailModal from './components/ErrorDetailModal.vue';
import SessionCompare from './components/SessionCompare.vue';
import OverviewPage from './views/OverviewPage.vue';
import ErrorsPage from './views/ErrorsPage.vue';
import PerformancePage from './views/PerformancePage.vue';
import { useErrorData } from './composables/useErrorData';
import { usePerformanceData } from './composables/usePerformanceData';
import { useErrorFilters } from './composables/useErrorFilters';
import { useTheme } from './composables/useTheme';

const API_BASE = '/api';
const DSN = 'demo-app';

const activeTab = ref<'overview' | 'errors' | 'performance'>('overview');
const timeRange = ref<'1h' | '24h' | '7d' | '30d'>('24h');

// 主题管理
const { resolvedTheme, toggleTheme, initTheme } = useTheme();

// Session 对比状态
const showSessionCompare = ref(false);
const compareSessions = ref<any[]>([]);
const compareFingerprint = ref('');

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

// 获取同一指纹的所有 Session
async function handleCompareSessions(fingerprint: string) {
  try {
    const response = await fetch(`${API_BASE}/errors/group/${fingerprint}/sessions?dsn=${DSN}&limit=10`);
    const data = await response.json();
    
    if (data.sessions && data.sessions.length > 0) {
      compareSessions.value = data.sessions;
      compareFingerprint.value = fingerprint;
      showSessionCompare.value = true;
    } else {
      alert('没有找到相关的 Session 数据');
    }
  } catch (error) {
    console.error('Failed to fetch sessions:', error);
    alert('获取 Session 数据失败');
  }
}

function closeSessionCompare() {
  showSessionCompare.value = false;
  compareSessions.value = [];
  compareFingerprint.value = '';
}

function viewSessionDetail(id: number) {
  closeSessionCompare();
  fetchErrorDetail(id);
}

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
        :theme="resolvedTheme"
        @update:timeRange="(range) => timeRange = range as typeof timeRange"
        @toggleTheme="toggleTheme"
      />
      
      <div class="page-content">
        <OverviewPage
          v-if="activeTab === 'overview'"
          :stats="overviewStats"
          :trendData="trendData"
          :errorGroups="errorGroups"
          :recentErrors="errors.slice(0, 5)"
          :theme="resolvedTheme"
          @viewError="fetchErrorDetail"
          @refreshGroups="fetchErrorGroups"
          @compareSessions="handleCompareSessions"
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
    
    <SessionCompare 
      v-if="showSessionCompare"
      :sessions="compareSessions"
      :fingerprint="compareFingerprint"
      @close="closeSessionCompare"
      @viewSession="viewSessionDetail"
    />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 深色主题（默认） */
:root,
:root[data-theme="dark"] {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --primary-light: #818cf8;
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
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
  --card-bg: #1e293b;
}

/* 浅色主题 */
:root[data-theme="light"] {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --primary-light: #a5b4fc;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --bg: #f8fafc;
  --bg-light: #ffffff;
  --bg-lighter: #f1f5f9;
  --text: #1e293b;
  --text-secondary: #64748b;
  --border: #e2e8f0;
  --sidebar-width: 240px;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --card-bg: #ffffff;
}

/* 主题切换过渡 */
.theme-transition,
.theme-transition *,
.theme-transition *::before,
.theme-transition *::after {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease !important;
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
