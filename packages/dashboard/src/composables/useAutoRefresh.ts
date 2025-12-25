import { ref, onUnmounted, watch, type Ref } from 'vue';

export type RefreshInterval = 'off' | '10s' | '30s' | '1m' | '5m';

export interface UseAutoRefreshOptions {
  defaultInterval?: RefreshInterval;
  onRefresh: () => void | Promise<void>;
  enabled?: Ref<boolean>;
}

export function useAutoRefresh(options: UseAutoRefreshOptions) {
  const { defaultInterval = 'off', onRefresh, enabled } = options;
  
  const interval = ref<RefreshInterval>(defaultInterval);
  const isRefreshing = ref(false);
  const lastRefreshTime = ref<Date | null>(null);
  let timer: ReturnType<typeof setInterval> | null = null;

  const intervalMs: Record<RefreshInterval, number> = {
    'off': 0,
    '10s': 10 * 1000,
    '30s': 30 * 1000,
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
  };

  const intervalLabels: Record<RefreshInterval, string> = {
    'off': '关闭',
    '10s': '10 秒',
    '30s': '30 秒',
    '1m': '1 分钟',
    '5m': '5 分钟',
  };

  async function refresh() {
    if (isRefreshing.value) return;
    
    isRefreshing.value = true;
    try {
      await onRefresh();
      lastRefreshTime.value = new Date();
    } catch (e) {
      console.error('Auto refresh failed:', e);
    } finally {
      isRefreshing.value = false;
    }
  }

  function startTimer() {
    stopTimer();
    const ms = intervalMs[interval.value];
    if (ms > 0 && (!enabled || enabled.value)) {
      timer = setInterval(refresh, ms);
    }
  }

  function stopTimer() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function setInterval(newInterval: RefreshInterval) {
    interval.value = newInterval;
  }

  // 监听 interval 变化
  watch(interval, () => {
    startTimer();
  });

  // 监听 enabled 变化
  if (enabled) {
    watch(enabled, (val) => {
      if (val) {
        startTimer();
      } else {
        stopTimer();
      }
    });
  }

  // 组件卸载时清理
  onUnmounted(() => {
    stopTimer();
  });

  return {
    interval,
    isRefreshing,
    lastRefreshTime,
    intervalLabels,
    refresh,
    setInterval,
    startTimer,
    stopTimer,
  };
}
