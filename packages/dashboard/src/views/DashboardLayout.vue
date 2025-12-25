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
import { useProject, type Project } from '../composables/useProject';
import { useAutoRefresh, type RefreshInterval } from '../composables/useAutoRefresh';
import { API_BASE } from '../config';

const route = useRoute();
const router = useRouter();
const { user, logout } = useAuth();
const { projects, currentProject, currentDsn, fetchProjects, switchProject } = useProject();

const activeTab = computed(() => {
  const path = route.path;
  if (path.includes('errors')) return 'errors';
  if (path.includes('performance')) return 'performance';
  if (path.includes('alerts')) return 'alerts';
  if (path.includes('projects')) return 'projects';
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
} = useErrorData(API_BASE, currentDsn, timeRange);

const {
  performance,
  perfStats,
  fetchPerformance
} = usePerformanceData(API_BASE, currentDsn, timeRange);

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
    const response = await authFetch(`${API_BASE}/errors/group/${fingerprint}/sessions?dsn=${currentDsn.value}&limit=10`);
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
    fetchErrorGroups();
  }
}

// 自动刷新
const {
  interval: refreshInterval,
  isRefreshing,
  lastRefreshTime,
  refresh: doRefresh,
  setInterval: setRefreshInterval,
  startTimer,
} = useAutoRefresh({
  defaultInterval: 'off',
  onRefresh: handleRefresh,
});

function handleRefreshIntervalChange(interval: RefreshInterval) {
  setRefreshInterval(interval);
}

// 切换项目时刷新数据
function handleSwitchProject(project: Project) {
  switchProject(project);
}

// 监听时间范围变化
watch(timeRange, () => {
  if (currentDsn.value) {
    fetchErrors();
    fetchPerformance();
  }
});

// 监听项目切换，刷新数据
watch(currentDsn, (newDsn) => {
  if (newDsn) {
    fetchErrors();
    fetchPerformance();
    fetchErrorGroups();
  }
});

// 是否需要选择项目
const needSelectProject = computed(() => !currentProject.value && projects.value.length > 0);
const noProjects = computed(() => projects.value.length === 0);

onMounted(async () => {
  // 先获取项目列表
  await fetchProjects();
  // 有项目且已选中时才获取数据
  if (currentDsn.value) {
    fetchErrors();
    fetchPerformance();
    fetchErrorGroups();
    // 启动自动刷新定时器
    startTimer();
  }
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
        :theme="resolvedTheme"
        :user="user"
        :projects="projects"
        :currentProject="currentProject"
        :refreshInterval="refreshInterval"
        :isRefreshing="isRefreshing"
        :lastRefreshTime="lastRefreshTime"
        @update:timeRange="(range) => timeRange = range as typeof timeRange"
        @update:refreshInterval="handleRefreshIntervalChange"
        @toggleTheme="toggleTheme"
        @logout="handleLogout"
        @switchProject="handleSwitchProject"
        @refresh="doRefresh"
      />
      
      <div class="page-content">
        <!-- 项目管理页面始终可访问 -->
        <router-view 
          v-if="activeTab === 'projects'"
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
        
        <!-- 没有项目时显示提示 -->
        <div v-else-if="noProjects" class="empty-state">
          <div class="empty-icon">📦</div>
          <h2>还没有项目</h2>
          <p>创建你的第一个监控项目开始使用</p>
          <button class="btn btn-primary" @click="handleTabChange('projects')">
            + 创建项目
          </button>
        </div>
        
        <!-- 有项目但未选择时显示提示 -->
        <div v-else-if="needSelectProject" class="empty-state">
          <div class="empty-icon">👆</div>
          <h2>请选择项目</h2>
          <p>从顶部下拉菜单选择一个项目查看数据</p>
        </div>
        
        <!-- 正常显示页面内容 -->
        <router-view 
          v-else
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}

.empty-state p {
  font-size: 14px;
  margin-bottom: 24px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
}
</style>
