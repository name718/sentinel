import { ref, type Ref } from 'vue';
import { authFetch } from './useAuth';

export function useErrorData(apiBase: string, dsn: string, timeRange: Ref<string>) {
  const errors = ref<any[]>([]);
  const errorGroups = ref<any[]>([]);
  const trendData = ref<{ time: string; count: number }[]>([]);
  const stats = ref({ totalErrors: 0, totalPerf: 0, errorRate: 0 });
  const loading = ref(false);
  const selectedError = ref<any>(null);

  // 时间范围转换
  function getTimeRangeMs() {
    const now = Date.now();
    switch (timeRange.value) {
      case '1h': return now - 60 * 60 * 1000;
      case '24h': return now - 24 * 60 * 60 * 1000;
      case '7d': return now - 7 * 24 * 60 * 60 * 1000;
      case '30d': return now - 30 * 24 * 60 * 60 * 1000;
      default: return now - 24 * 60 * 60 * 1000;
    }
  }

  // 获取错误列表
  async function fetchErrors() {
    loading.value = true;
    try {
      const startTime = getTimeRangeMs();
      const res = await authFetch(`${apiBase}/errors?dsn=${dsn}&pageSize=1000&startTime=${startTime}`);
      const data = await res.json();
      errors.value = data.list || [];
      stats.value.totalErrors = data.total || 0;
      calculateTrend();
    } catch (e) {
      console.error('获取错误列表失败:', e);
    }
    loading.value = false;
  }

  // 获取错误分组
  async function fetchErrorGroups() {
    try {
      const res = await authFetch(`${apiBase}/errors/stats/groups?dsn=${dsn}`);
      const data = await res.json();
      errorGroups.value = data.groups || [];
    } catch (e) {
      console.error('获取错误分组失败:', e);
    }
  }

  // 获取错误详情
  async function fetchErrorDetail(id: number) {
    try {
      const res = await authFetch(`${apiBase}/errors/${id}?version=1.0.0`);
      selectedError.value = await res.json();
    } catch (e) {
      console.error('获取错误详情失败:', e);
    }
  }

  // 计算趋势数据
  function calculateTrend() {
    const buckets = new Map<string, number>();
    const interval = timeRange.value === '1h' ? 5 * 60 * 1000 :
                     timeRange.value === '24h' ? 60 * 60 * 1000 :
                     timeRange.value === '7d' ? 6 * 60 * 60 * 1000 :
                     24 * 60 * 60 * 1000;
    
    errors.value.forEach(err => {
      const bucket = Math.floor(err.timestamp / interval) * interval;
      const key = new Date(bucket).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: timeRange.value === '1h' || timeRange.value === '24h' ? '2-digit' : undefined,
        minute: timeRange.value === '1h' ? '2-digit' : undefined
      });
      buckets.set(key, (buckets.get(key) || 0) + 1);
    });
    
    trendData.value = Array.from(buckets.entries())
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  function closeDetail() {
    selectedError.value = null;
  }

  return {
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
  };
}
