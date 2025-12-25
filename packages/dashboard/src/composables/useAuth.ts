/**
 * 认证状态管理 Composable
 */
import { ref, computed } from 'vue';
import { API_BASE } from '../config';

const TOKEN_KEY = 'monitor-auth-token';
const USER_KEY = 'monitor-auth-user';

/** 用户类型 */
export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

/** 认证响应 */
interface AuthResponse {
  user: User;
  token: string;
}

// 全局状态
const token = ref<string | null>(localStorage.getItem(TOKEN_KEY));
const user = ref<User | null>(
  localStorage.getItem(USER_KEY) 
    ? JSON.parse(localStorage.getItem(USER_KEY)!) 
    : null
);
const loading = ref(false);
const error = ref<string | null>(null);

/**
 * 全局 API 请求封装，自动处理 401
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const currentToken = token.value;
  
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };
  
  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }
  
  const response = await fetch(url, { ...options, headers });
  
  // 401 时清除认证并跳转登录
  if (response.status === 401) {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    
    // 跳转登录页（避免循环）
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
  
  return response;
}

/**
 * 认证管理 Composable
 */
export function useAuth() {
  const isAuthenticated = computed(() => !!token.value && !!user.value);

  /** 设置认证信息 */
  function setAuth(authResponse: AuthResponse) {
    token.value = authResponse.token;
    user.value = authResponse.user;
    localStorage.setItem(TOKEN_KEY, authResponse.token);
    localStorage.setItem(USER_KEY, JSON.stringify(authResponse.user));
  }

  /** 清除认证信息 */
  function clearAuth() {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /** 注册 */
  async function register(email: string, password: string, name: string, code?: string): Promise<boolean> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        error.value = data.error || '注册失败';
        return false;
      }

      setAuth(data);
      return true;
    } catch (e) {
      error.value = '网络错误，请稍后重试';
      return false;
    } finally {
      loading.value = false;
    }
  }

  /** 登录 */
  async function login(email: string, password: string): Promise<{ success: boolean; attemptsLeft?: number }> {
    loading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        error.value = data.error || '登录失败';
        return { success: false, attemptsLeft: data.attemptsLeft };
      }

      setAuth(data);
      return { success: true };
    } catch (e) {
      error.value = '网络错误，请稍后重试';
      return { success: false };
    } finally {
      loading.value = false;
    }
  }

  /** 登出 */
  function logout() {
    clearAuth();
  }

  /** 获取当前用户 */
  async function fetchCurrentUser(): Promise<boolean> {
    if (!token.value) return false;

    try {
      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token.value}` },
      });

      if (!response.ok) {
        clearAuth();
        return false;
      }

      const data = await response.json();
      user.value = data.user;
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return true;
    } catch {
      clearAuth();
      return false;
    }
  }

  /** 获取认证请求头 */
  function getAuthHeaders(): Record<string, string> {
    if (!token.value) return {};
    return { 'Authorization': `Bearer ${token.value}` };
  }

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    fetchCurrentUser,
    getAuthHeaders,
  };
}
