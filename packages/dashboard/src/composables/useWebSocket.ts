import { ref, onUnmounted, computed } from 'vue';
import { useAuth } from './useAuth';
import { useProject } from './useProject';

export interface WebSocketMessage {
  type: 'error' | 'performance' | 'alert' | 'auth_success';
  data?: any;
  dsn?: string;
  timestamp?: number;
  message?: string;
}

export interface WebSocketStats {
  connected: boolean;
  reconnectAttempts: number;
  lastConnected: Date | null;
  messagesReceived: number;
}

export function useWebSocket() {
  const { token } = useAuth();
  const { currentProject } = useProject();
  
  const ws = ref<WebSocket | null>(null);
  const connected = ref(false);
  const reconnectAttempts = ref(0);
  const lastConnected = ref<Date | null>(null);
  const messagesReceived = ref(0);
  const lastMessage = ref<WebSocketMessage | null>(null);
  const connectionError = ref<string | null>(null);
  
  // 消息监听器
  const messageListeners = ref<Map<string, ((message: WebSocketMessage) => void)[]>>(new Map());
  
  // 连接状态
  const stats = computed<WebSocketStats>(() => ({
    connected: connected.value,
    reconnectAttempts: reconnectAttempts.value,
    lastConnected: lastConnected.value,
    messagesReceived: messagesReceived.value
  }));
  
  // WebSocket 服务器地址
  const getWebSocketUrl = () => {
    // 开发环境使用代理
    if (import.meta.env.DEV) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}/ws`;
    }
    
    // 生产环境使用环境变量或默认值
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_API_BASE_URL?.replace(/^https?:\/\//, '') || window.location.host;
    return `${protocol}//${host}/ws`;
  };
  
  // 连接 WebSocket
  const connect = () => {
    if (!token.value || !currentProject.value?.dsn) {
      console.warn('[WebSocket] 缺少认证信息或项目信息');
      connectionError.value = '缺少认证信息或项目信息';
      return;
    }
    
    if (ws.value?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] 已经连接');
      return;
    }
    
    try {
      const wsUrl = getWebSocketUrl();
      console.log(`[WebSocket] 连接到: ${wsUrl}`);
      
      ws.value = new WebSocket(wsUrl);
      connectionError.value = null;
      
      ws.value.onopen = () => {
        console.log('[WebSocket] 连接已建立');
        connected.value = true;
        lastConnected.value = new Date();
        reconnectAttempts.value = 0;
        
        // 发送认证消息
        if (ws.value && token.value && currentProject.value?.dsn) {
          ws.value.send(JSON.stringify({
            type: 'auth',
            token: token.value,
            dsn: currentProject.value.dsn
          }));
        }
      };
      
      ws.value.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('[WebSocket] 收到消息:', message);
          
          messagesReceived.value++;
          lastMessage.value = message;
          
          // 触发消息监听器
          const listeners = messageListeners.value.get(message.type) || [];
          listeners.forEach(listener => {
            try {
              listener(message);
            } catch (error) {
              console.error('[WebSocket] 消息监听器错误:', error);
            }
          });
          
          // 触发通用监听器
          const allListeners = messageListeners.value.get('*') || [];
          allListeners.forEach(listener => {
            try {
              listener(message);
            } catch (error) {
              console.error('[WebSocket] 通用监听器错误:', error);
            }
          });
        } catch (error) {
          console.error('[WebSocket] 消息解析错误:', error);
        }
      };
      
      ws.value.onclose = (event) => {
        console.log('[WebSocket] 连接已关闭:', event.code, event.reason);
        connected.value = false;
        
        // 如果不是主动关闭，尝试重连
        if (event.code !== 1000 && reconnectAttempts.value < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.value), 30000);
          console.log(`[WebSocket] ${delay}ms 后尝试重连 (${reconnectAttempts.value + 1}/5)`);
          
          setTimeout(() => {
            reconnectAttempts.value++;
            connect();
          }, delay);
        }
      };
      
      ws.value.onerror = (error) => {
        console.error('[WebSocket] 连接错误:', error);
        connectionError.value = '连接失败';
        connected.value = false;
      };
      
    } catch (error) {
      console.error('[WebSocket] 创建连接失败:', error);
      connectionError.value = '创建连接失败';
    }
  };
  
  // 断开连接
  const disconnect = () => {
    if (ws.value) {
      ws.value.close(1000, 'User disconnected');
      ws.value = null;
    }
    connected.value = false;
    reconnectAttempts.value = 0;
  };
  
  // 发送消息
  const send = (message: any) => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message));
      return true;
    }
    console.warn('[WebSocket] 连接未建立，无法发送消息');
    return false;
  };
  
  // 添加消息监听器
  const on = (type: string, listener: (message: WebSocketMessage) => void) => {
    if (!messageListeners.value.has(type)) {
      messageListeners.value.set(type, []);
    }
    messageListeners.value.get(type)!.push(listener);
    
    // 返回取消监听的函数
    return () => {
      const listeners = messageListeners.value.get(type);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  };
  
  // 移除所有监听器
  const off = (type?: string) => {
    if (type) {
      messageListeners.value.delete(type);
    } else {
      messageListeners.value.clear();
    }
  };
  
  // 组件卸载时清理
  onUnmounted(() => {
    disconnect();
    off();
  });
  
  return {
    // 状态
    connected,
    stats,
    lastMessage,
    connectionError,
    
    // 方法
    connect,
    disconnect,
    send,
    on,
    off
  };
}