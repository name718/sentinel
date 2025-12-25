/**
 * 项目管理 composable
 * 管理当前选中的项目，支持项目切换
 */
import { ref, computed, watch } from 'vue';
import { authFetch } from './useAuth';
import { API_BASE } from '../config';

export interface Project {
  id: number;
  dsn: string;
  name: string;
  description?: string;
  platform: string;
  owner_id: number;
  user_role: string;
  error_count: number;
  perf_count: number;
  created_at: string;
}

const STORAGE_KEY = 'monitor_current_project';

// 全局状态
const projects = ref<Project[]>([]);
const currentProject = ref<Project | null>(null);
const loading = ref(false);

// 当前 DSN（响应式）- 没有项目时返回空字符串
const currentDsn = computed(() => currentProject.value?.dsn || '');

// 从 localStorage 恢复
function restoreProject() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const project = JSON.parse(saved);
      // 验证项目是否还在列表中
      if (projects.value.length > 0) {
        const found = projects.value.find(p => p.id === project.id);
        if (found) {
          currentProject.value = found;
          return;
        }
      } else {
        // 列表还没加载，先用缓存的
        currentProject.value = project;
        return;
      }
    }
  } catch (e) {
    // ignore
  }
  // 默认选第一个项目
  if (projects.value.length > 0) {
    currentProject.value = projects.value[0];
  }
}

// 保存到 localStorage
function saveProject() {
  if (currentProject.value) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentProject.value));
  }
}

// 获取项目列表
async function fetchProjects() {
  loading.value = true;
  try {
    const res = await authFetch(`${API_BASE}/projects`);
    if (res.ok) {
      const data = await res.json();
      projects.value = data.projects || [];
      
      // 恢复或设置当前项目
      if (currentProject.value) {
        // 检查当前项目是否还存在
        const found = projects.value.find(p => p.id === currentProject.value?.id);
        if (found) {
          currentProject.value = found;
        } else if (projects.value.length > 0) {
          currentProject.value = projects.value[0];
        }
      } else {
        restoreProject();
      }
    }
  } catch (e) {
    console.error('获取项目列表失败:', e);
  }
  loading.value = false;
}

// 切换项目
function switchProject(project: Project) {
  currentProject.value = project;
  saveProject();
}

// 监听项目变化，保存到 localStorage
watch(currentProject, () => {
  saveProject();
});

export function useProject() {
  return {
    projects,
    currentProject,
    currentDsn,
    loading,
    fetchProjects,
    switchProject
  };
}
