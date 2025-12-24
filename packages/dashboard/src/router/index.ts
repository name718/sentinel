/**
 * Vue Router 配置
 */
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginPage.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterPage.vue'),
    meta: { requiresGuest: true },
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/DashboardLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/overview',
      },
      {
        path: 'overview',
        name: 'Overview',
        component: () => import('../views/OverviewPage.vue'),
      },
      {
        path: 'errors',
        name: 'Errors',
        component: () => import('../views/ErrorsPage.vue'),
      },
      {
        path: 'performance',
        name: 'Performance',
        component: () => import('../views/PerformancePage.vue'),
      },
      {
        path: 'alerts',
        name: 'Alerts',
        component: () => import('../views/AlertsPage.vue'),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 路由守卫
router.beforeEach((to, _from, next) => {
  const { isAuthenticated } = useAuth();

  // 需要认证的页面
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ name: 'Login' });
    return;
  }

  // 已登录用户访问登录/注册页面
  if (to.meta.requiresGuest && isAuthenticated.value) {
    next({ name: 'Dashboard' });
    return;
  }

  next();
});

export default router;
