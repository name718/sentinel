import { ref, onMounted, onUnmounted } from 'vue';
import { useWebSocket, type WebSocketMessage } from './useWebSocket';

export function useRealtimeData() {
  const { connected, on } = useWebSocket();
  
  // 实时数据更新回调
  const dataUpdateCallbacks = ref<Map<string, (() => void)[]>>(new Map());
  
  // 注册数据更新回调
  const onDataUpdate = (type: 'error' | 'performance' | 'all', callback: () => void) => {
    if (!dataUpdateCallbacks.value.has(type)) {
      dataUpdateCallbacks.value.set(type, []);
    }
    dataUpdateCallbacks.value.get(type)!.push(callback);
    
    // 返回取消注册的函数
    return () => {
      const callbacks = dataUpdateCallbacks.value.get(type);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  };
  
  // 触发数据更新回调
  const triggerDataUpdate = (type: 'error' | 'performance') => {
    // 触发特定类型的回调
    const typeCallbacks = dataUpdateCallbacks.value.get(type) || [];
    typeCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error(`[RealtimeData] ${type} 回调执行错误:`, error);
      }
    });
    
    // 触发通用回调
    const allCallbacks = dataUpdateCallbacks.value.get('all') || [];
    allCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[RealtimeData] 通用回调执行错误:', error);
      }
    });
  };
  
  // 处理错误消息
  const handleErrorMessage = (message: WebSocketMessage) => {
    console.log('[RealtimeData] 收到错误推送，触发数据刷新');
    triggerDataUpdate('error');
  };
  
  // 处理性能消息
  const handlePerformanceMessage = (message: WebSocketMessage) => {
    console.log('[RealtimeData] 收到性能推送，触发数据刷新');
    triggerDataUpdate('performance');
  };
  
  onMounted(() => {
    // 注册 WebSocket 消息监听器
    const unsubscribeError = on('error', handleErrorMessage);
    const unsubscribePerformance = on('performance', handlePerformanceMessage);
    
    // 组件卸载时清理
    onUnmounted(() => {
      unsubscribeError();
      unsubscribePerformance();
      dataUpdateCallbacks.value.clear();
    });
  });
  
  return {
    connected,
    onDataUpdate
  };
}