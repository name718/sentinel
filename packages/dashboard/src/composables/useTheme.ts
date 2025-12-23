import { ref, onMounted } from 'vue';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'monitor-dashboard-theme';

// 全局状态（单例）
const currentTheme = ref<Theme>('system');
const resolvedTheme = ref<'light' | 'dark'>('dark');

/**
 * 主题管理 Composable
 * 
 * 功能：
 * - 支持 light/dark/system 三种模式
 * - 自动检测系统主题偏好
 * - 持久化到 localStorage
 * - 平滑过渡切换
 */
export function useTheme() {
  // 获取系统主题偏好
  function getSystemTheme(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // 解析实际主题
  function resolveTheme(theme: Theme): 'light' | 'dark' {
    if (theme === 'system') {
      return getSystemTheme();
    }
    return theme;
  }

  // 应用主题到 DOM
  function applyTheme(theme: 'light' | 'dark') {
    const root = document.documentElement;
    
    // 添加过渡类
    root.classList.add('theme-transition');
    
    // 设置主题属性
    root.setAttribute('data-theme', theme);
    
    // 更新 meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#0f172a' : '#ffffff');
    }
    
    // 移除过渡类（延迟以确保过渡完成）
    setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 300);
  }

  // 设置主题
  function setTheme(theme: Theme) {
    currentTheme.value = theme;
    resolvedTheme.value = resolveTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(resolvedTheme.value);
  }

  // 切换主题（在 light 和 dark 之间切换）
  function toggleTheme() {
    const newTheme = resolvedTheme.value === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }

  // 初始化
  function initTheme() {
    // 从 localStorage 读取
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      currentTheme.value = stored;
    } else {
      // 默认跟随系统
      currentTheme.value = 'system';
    }
    
    resolvedTheme.value = resolveTheme(currentTheme.value);
    applyTheme(resolvedTheme.value);
    
    // 监听系统主题变化
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        if (currentTheme.value === 'system') {
          resolvedTheme.value = e.matches ? 'dark' : 'light';
          applyTheme(resolvedTheme.value);
        }
      });
    }
  }

  // 组件挂载时初始化
  onMounted(() => {
    initTheme();
  });

  return {
    currentTheme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    initTheme
  };
}
