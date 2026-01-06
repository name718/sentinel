import { ref, onUnmounted, computed, watch } from 'vue';
import { useAuth } from './useAuth';
import { useProject } from './useProject';

export interface WebSocketMessage {
  type: 'error' | 'performance' | 'alert' | 'auth_success' | 'server_shutdown' | 'pong';
  data?: any;
  dsn?: string;
  timestamp?: number;
  message?: string;
  connectionId?: string;
  serverTime?: number;
}

export interface WebSocketStats {
  connected: boolean;
  reconnectAttempts: number;
  lastConnected: Date | null;
  messagesReceived: number;
  connectionId: string | null;
  latency: number | null;
}

interface ConnectionConfig {
  maxReconnectAttempts: number;
  reconnectDelay: number;
  maxReconnectDelay: number;
  heartbeatInterval: number;
  connectionTimeout: number;
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
  const connectionId = ref<string | null>(null);
  const latency = ref<number | null>(null);
  const isReconnecting = ref(false);
  
  // 配置参数
  const config: ConnectionConfig = {
    maxReconnectAttempts: 10,
    reconnectDelay: 1000,
    maxReconnectDelay: 30000,
    heartbeatInterval: 25000, // 25秒，比服务端30秒心跳稍短
    connectionTimeout: 10000
  };
  
  // 消息监听器
  const messageListeners = ref<Map<string, ((message: WebSocketMessage) => void)[]>>(new Map());
  
  // 定时器引用
  let heartbeatTimer: NodeJS.Timeout | null = null;
  let reconnectTimer: NodeJS.Timeout | null = null;
  let connectionTimer: NodeJS.Timeout | null = null;
  let pingTimer: NodeJS.Timeout | null = null;
  
  // 连接状态
  const stats = computed<WebSocketStats>(() => ({
    connected: connected.value,
    reconnectAttempts: reconnectAttempts.value,
    lastConnected: lastConnected.value,
    messagesReceived: messagesReceived.value,
    connectionId: connectionId.value,
    latency: latency.value
  }));
  
  // WebSocket 服务器地址
  const getWebSocketUrl = () => {
    try {
      // 开发环境使用代理
      if (import.meta.env.DEV) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}/ws`;
      }
      
      // 生产环境使用环境变量或默认值
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = import.meta.env.VITE_API_BASE_URL?.replace(/^https?:\/\//, '') || window.location.host;
      return `${protocol}//${host}/ws`;
    } catch (error) {
      console.error('[WebSocket] Failed to generate URL:', error);
      return null;
    }
  };
  
  // 清理定时器
  const clearTimers = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (connectionTimer) {
      clearTimeout(connectionTimer);
      connectionTimer = null;
    }
    if (pingTimer) {
      clearTimeout(pingTimer);
      pingTimer = null;
    }
  };
  
  // 发送心跳
  const sendHeartbeat = () => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      try {
        const pingTime = Date.now();
        ws.value.send(JSON.stringify({
          type: 'ping',
          timestamp: pingTime
        }));
        
        // 设置ping超时
        pingTimer = setTimeout(() => {
          console.warn('[WebSocket] Ping timeout, connection may be dead');
          if (ws.value) {
            ws.value.close(1000, 'Ping timeout');
          }
        }, 5000);
      } catch (error) {
        console.error('[WebSocket] Failed to send heartbeat:', error);
        handleConnectionError('Heartbeat failed');
      }
    }
  };
  
  // 启动心跳
  const startHeartbeat = () => {
    clearTimers();
    heartbeatTimer = setInterval(sendHeartbeat, config.heartbeatInterval);
  };
  
  // 处理连接错误
  const handleConnectionError = (error: string) => {
    console.error('[WebSocket] Connection error:', error);
    connectionError.value = error;
    connected.value = false;
    clearTimers();
    
    // 触发重连
    if (reconnectAttempts.value < config.maxReconnectAttempts && !isReconnecting.value) {
      scheduleReconnect();
    }
  };
  
  // 计划重连
  const scheduleReconnect = () => {
    if (isReconnecting.value) return;
    
    isReconnecting.value = true;
    const delay = Math.min(
      config.reconnectDelay * Math.pow(2, reconnectAttempts.value),
      config.maxReconnectDelay
    );
    
    console.log(`[WebSocket] Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts.value + 1}/${config.maxReconnectAttempts})`);
    
    reconnectTimer = setTimeout(() => {
      reconnectAttempts.value++;
      isReconnecting.value = false;
      connect();
    }, delay);
  };
  
  // 连接 WebSocket
  const connect = () => {
    // 验证前置条件
    if (!token.value || !currentProject.value?.dsn) {
      const error = '缺少认证信息或项目信息';
      console.warn('[WebSocket]', error);
      connectionError.value = error;
      return false;
    }
    
    if (ws.value?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return true;
    }
    
    // 清理现有连接
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
    
    clearTimers();
    
    try {
      const wsUrl = getWebSocketUrl();
      if (!wsUrl) {
        throw new Error('Failed to generate WebSocket URL');
      }
      
      console.log(`[WebSocket] Connecting to: ${wsUrl}`);
      
      ws.value = new WebSocket(wsUrl);
      connectionError.value = null;
      
      // 连接超时
      connectionTimer = setTimeout(() => {
        if (ws.value?.readyState === WebSocket.CONNECTING) {
          console.error('[WebSocket] Connection timeout');
          ws.value.close();
          handleConnectionError('Connection timeout');
        }
      }, config.connectionTimeout);
      
      ws.value.onopen = () => {
        console.log('[WebSocket] Connection established');
        connected.value = true;
        lastConnected.value = new Date();
        reconnectAttempts.value = 0;
        isReconnecting.value = false;
        
        if (connectionTimer) {
          clearTimeout(connectionTimer);
          connectionTimer = null;
        }
        
        // 发送认证消息
        if (ws.value && token.value && currentProject.value?.dsn) {
          try {
            ws.value.send(JSON.stringify({
              type: 'auth',
              token: token.value,
              dsn: currentProject.value.dsn
            }));
          } catch (error) {
            console.error('[WebSocket] Failed to send auth:', error);
            handleConnectionError('Authentication failed');
          }
        }
      };
      
      ws.value.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // 处理特殊消息类型
          if (message.type === 'pong') {
            if (pingTimer) {
              clearTimeout(pingTimer);
              pingTimer = null;
            }
            
            // 计算延迟
            if (message.timestamp) {
              latency.value = Date.now() - message.timestamp;
            }
            return;
          }
          
          if (message.type === 'auth_success') {
            connectionId.value = message.connectionId || null;
            startHeartbeat();
            console.log('[WebSocket] Authentication successful');
          }
          
          if (message.type === 'server_shutdown') {
            console.warn('[WebSocket] Server is shutting down');
            connectionError.value = 'Server shutdown';
            // 服务器关闭时不要重连
            reconnectAttempts.value = config.maxReconnectAttempts;
          }
          
          console.log('[WebSocket] Message received:', message.type);
          
          messagesReceived.value++;
          lastMessage.value = message;
          
          // 触发消息监听器
          const listeners = messageListeners.value.get(message.type) || [];
          listeners.forEach(listener => {
            try {
              listener(message);
            } catch (error) {
              console.error('[WebSocket] Message listener error:', error);
            }
          });
          
          // 触发通用监听器
          const allListeners = messageListeners.value.get('*') || [];
          allListeners.forEach(listener => {
            try {
              listener(message);
            } catch (error) {
              console.error('[WebSocket] Universal listener error:', error);
            }
          });
        } catch (error) {
          console.error('[WebSocket] Message parse error:', error);
        }
      };
      
      ws.value.onclose = (event) => {
        console.log(`[WebSocket] Connection closed: ${event.code} ${event.reason}`);
        connected.value = false;
        clearTimers();
        
        // 根据关闭码决定是否重连
        if (event.code !== 1000 && event.code !== 1001 && reconnectAttempts.value < config.maxReconnectAttempts) {
          if (event.code === 1008) {
            connectionError.value = 'Authentication failed';
          } else if (event.code === 1009) {
            connectionError.value = 'Message too large';
          } else {
            connectionError.value = `Connection closed: ${event.code}`;
          }
          
          scheduleReconnect();
        } else {
          connectionError.value = event.reason || 'Connection closed';
        }
      };
      
      ws.value.onerror = (error) => {
        console.error('[WebSocket] Connection error:', error);
        handleConnectionError('Connection error');
      };
      
      return true;
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      connectionError.value = 'Failed to create connection';
      return false;
    }
  };
  
  // 断开连接
  const disconnect = () => {
    console.log('[WebSocket] Disconnecting...');
    
    // 停止重连
    reconnectAttempts.value = config.maxReconnectAttempts;
    isReconnecting.value = false;
    
    clearTimers();
    
    if (ws.value) {
      ws.value.close(1000, 'User disconnected');
      ws.value = null;
    }
    
    connected.value = false;
    connectionError.value = null;
    connectionId.value = null;
    latency.value = null;
  };
  
  // 发送消息
  const send = (message: any) => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      try {
        ws.value.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('[WebSocket] Failed to send message:', error);
        handleConnectionError('Send failed');
        return false;
      }
    }
    
    console.warn('[WebSocket] Connection not ready, cannot send message');
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
  
  // 重置连接
  const reset = () => {
    disconnect();
    reconnectAttempts.value = 0;
    connectionError.value = null;
    messagesReceived.value = 0;
    lastMessage.value = null;
  };
  
  // 监听认证状态变化
  watch([token, () => currentProject.value?.dsn], ([newToken, newDsn], [oldToken, oldDsn]) => {
    if (newToken && newDsn && (newToken !== oldToken || newDsn !== oldDsn)) {
      console.log('[WebSocket] Auth or project changed, reconnecting...');
      disconnect();
      setTimeout(() => connect(), 1000);
    } else if (!newToken || !newDsn) {
      disconnect();
    }
  });
  
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
    isReconnecting,
    
    // 方法
    connect,
    disconnect,
    send,
    on,
    off,
    reset
  };
}