import { ref, type Ref } from 'vue';
import { authFetch } from './useAuth';

export function usePerformanceData(apiBase: string, dsn: string, timeRange: Ref<string>) {
  const performance = ref<any[]>([]);
  const perfStats = ref({ totalPerf: 0 });

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

  // 获取性能数据
  async function fetchPerformance() {
    try {
      const startTime = getTimeRangeMs();
      const res = await authFetch(`${apiBase}/performance?dsn=${dsn}&pageSize=1000&startTime=${startTime}`);
      const data = await res.json();
      performance.value = data.list || [];
      perfStats.value.totalPerf = data.total || 0;
    } catch (e) {
      console.error('获取性能数据失败:', e);
    }
  }

  return {
    performance,
    perfStats,
    fetchPerformance
  };
}
