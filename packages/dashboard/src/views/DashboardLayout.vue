<script setup lang="ts">
import { ref, onMounted, computed, watch, provide } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import TopBar from '../components/TopBar.vue';
import ErrorDetailModal from '../components/ErrorDetailModal.vue';
import SessionCompare from '../components/SessionCompare.vue';
import { useErrorData } from '../composables/useErrorData';
import { usePerformanceData } from '../composables/usePerformanceData';
import { useErrorFilters } from '../composables/useErrorFilters';
import { useTheme } from '../composables/useTheme';
import { useAuth, authFetch } from '../composables/useAuth';

const API_BASE = '/api';
const DSN = 'demo-app';

const route = useRoute();
const router = useRouter();
const { user, logout } = useAuth();

const activeTab = computed(() => {
  const path = route.path;
  if (path.includes('errors')) return 'errors';
  if (path.includes('performance')) return 'performance';
  if (path.includes('alerts')) return 'alerts';
  return 'overview';
});

const timeRange = ref<'1h' | '24h' | '7d' | '30d'>('24h');

// 主题管理
const { resolvedTheme, toggleTheme } = useTheme();

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
  updateErrorStatus,
  updateGroupStatus,
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

// 提供给子组件
provide('dashboardData', {
  overviewStats,
  trendData,
  errorGroups,
  errors,
  paginatedErrors,
  filteredErrors,
  performance,
  loading,
  searchKeyword,
  errorTypeFilter,
  errorTypes,
  currentPage,
  totalPages,
  resolvedTheme,
  fetchErrorDetail,
  fetchErrorGroups,
  fetchErrors,
  fetchPerformance,
  updateErrorStatus,
  updateGroupStatus,
  resetFilters,
  changePage,
});

// 获取同一指纹的所有 Session
async function handleCompareSessions(fingerprint: string) {
  try {
    const response = await authFetch(`${API_BASE}/errors/group/${fingerprint}/sessions?dsn=${DSN}&limit=10`);
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

provide('handleCompareSessions', handleCompareSessions);

function closeSessionCompare() {
  showSessionCompare.value = false;
  compareSessions.value = [];
  compareFingerprint.value = '';
}

function viewSessionDetail(id: number) {
  closeSessionCompare();
  fetchErrorDetail(id);
}

function handleTabChange(tab: string) {
  router.push(`/${tab === 'overview' ? '' : tab}`);
}

function handleLogout() {
  logout();
  router.push('/login');
}

// 根据当前路由刷新对应数据
function handleRefresh() {
  if (activeTab.value === 'performance') {
    fetchPerformance();
  } else {
    fetchErrors();
  }
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
    <Sidebar 
      :activeTab="activeTab" 
      :user="user"
      @update:activeTab="handleTabChange"
      @logout="handleLogout"
    />
    
    <div class="main-content">
      <TopBar 
        :timeRange="timeRange" 
        :dsn="DSN"
        :theme="resolvedTheme"
        :user="user"
        @update:timeRange="(range) => timeRange = range as typeof timeRange"
        @toggleTheme="toggleTheme"
        @logout="handleLogout"
      />
      
      <div class="page-content">
        <router-view 
          :stats="overviewStats"
          :trendData="trendData"
          :errorGroups="errorGroups"
          :recentErrors="errors.slice(0, 5)"
          :theme="resolvedTheme"
          :errors="paginatedErrors"
          :errorTypes="errorTypes"
          :currentPage="currentPage"
          :totalPages="totalPages"
          :totalCount="filteredErrors.length"
          :loading="loading"
          :performance="performance"
          v-model:searchKeyword="searchKeyword"
          v-model:errorTypeFilter="errorTypeFilter"
          @viewError="fetchErrorDetail"
          @refreshGroups="fetchErrorGroups"
          @compareSessions="handleCompareSessions"
          @reset="resetFilters"
          @refresh="handleRefresh"
          @viewDetail="fetchErrorDetail"
          @changePage="changePage"
          @updateStatus="updateErrorStatus"
          @updateGroupStatus="updateGroupStatus"
        />
      </div>
    </div>

    <ErrorDetailModal 
      :error="selectedError" 
      @close="closeDetail" 
      @updateStatus="updateErrorStatus"
    />
    
    <SessionCompare 
      v-if="showSessionCompare"
      :sessions="compareSessions"
      :fingerprint="compareFingerprint"
      @close="closeSessionCompare"
      @viewSession="viewSessionDetail"
    />
  </div>
</template>

<style scoped>
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
</style>
