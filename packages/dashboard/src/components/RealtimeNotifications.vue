<template>
  <div class="realtime-notifications">
    <!-- WebSocket 连接状态指示器 -->
    <div class="connection-status" :class="{ connected: wsConnected, error: connectionError }">
      <div class="status-indicator">
        <div class="status-dot" :class="{ active: wsConnected }"></div>
        <span class="status-text">
          {{ wsConnected ? '实时连接' : '离线模式' }}
        </span>
      </div>
      
      <div v-if="connectionError" class="error-message">
        {{ connectionError }}
      </div>
    </div>

    <!-- 实时通知列表 -->
    <div v-if="notifications.length > 0" class="notifications-container">
      <div class="notifications-header">
        <h4>实时通知</h4>
        <button @click="clearNotifications" class="clear-btn">清空</button>
      </div>
      
      <div class="notifications-list">
        <div
          v-for="notification in notifications"
          :key="notification.id"
          class="notification-item"
          :class="notification.type"
        >
          <div class="notification-icon">
            <span v-if="notification.type === 'error'">🚨</span>
            <span v-else-if="notification.type === 'performance'">📊</span>
            <span v-else-if="notification.type === 'alert'">⚠️</span>
            <span v-else>📨</span>
          </div>
          
          <div class="notification-content">
            <div class="notification-title">
              {{ notification.title }}
            </div>
            <div class="notification-message">
              {{ notification.message }}
            </div>
            <div class="notification-time">
              {{ formatTime(notification.timestamp) }}
            </div>
          </div>
          
          <button @click="removeNotification(notification.id)" class="remove-btn">
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useWebSocket, type WebSocketMessage } from '../composables/useWebSocket';

interface Notification {
  id: string;
  type: 'error' | 'performance' | 'alert' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  data?: any;
}

const { connected: wsConnected, connectionError, connect, on } = useWebSocket();

const notifications = ref<Notification[]>([]);
const maxNotifications = 50;

// 格式化时间
const formatTime = (date: Date) => {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// 添加通知
const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
  const newNotification: Notification = {
    ...notification,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date()
  };
  
  notifications.value.unshift(newNotification);
  
  // 限制通知数量
  if (notifications.value.length > maxNotifications) {
    notifications.value = notifications.value.slice(0, maxNotifications);
  }
};

// 移除通知
const removeNotification = (id: string) => {
  const index = notifications.value.findIndex(n => n.id === id);
  if (index > -1) {
    notifications.value.splice(index, 1);
  }
};

// 清空通知
const clearNotifications = () => {
  notifications.value = [];
};

// 处理错误消息
const handleErrorMessage = (message: WebSocketMessage) => {
  if (message.data) {
    const errorData = message.data;
    addNotification({
      type: 'error',
      title: errorData.isNew ? '新错误' : '错误更新',
      message: `${errorData.type}: ${errorData.message}`,
      data: errorData
    });
  }
};

// 处理性能消息
const handlePerformanceMessage = (message: WebSocketMessage) => {
  if (message.data) {
    const perfData = message.data;
    const vitals = [];
    
    if (perfData.fcp) vitals.push(`FCP: ${perfData.fcp}ms`);
    if (perfData.lcp) vitals.push(`LCP: ${perfData.lcp}ms`);
    if (perfData.cls) vitals.push(`CLS: ${perfData.cls}`);
    
    addNotification({
      type: 'performance',
      title: '性能数据',
      message: vitals.join(', ') || '性能指标已更新',
      data: perfData
    });
  }
};

// 处理告警消息
const handleAlertMessage = (message: WebSocketMessage) => {
  if (message.data) {
    addNotification({
      type: 'alert',
      title: '告警触发',
      message: message.data.message || '系统告警',
      data: message.data
    });
  }
};

// 处理认证成功消息
const handleAuthSuccess = (message: WebSocketMessage) => {
  addNotification({
    type: 'info',
    title: '连接成功',
    message: '实时推送已启用'
  });
};

onMounted(() => {
  // 连接 WebSocket
  connect();
  
  // 注册消息监听器
  on('error', handleErrorMessage);
  on('performance', handlePerformanceMessage);
  on('alert', handleAlertMessage);
  on('auth_success', handleAuthSuccess);
});
</script>

<style scoped>
.realtime-notifications {
  position: fixed;
  top: 80px;
  right: 20px;
  width: 350px;
  max-height: 70vh;
  z-index: 1000;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.connection-status {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.connection-status.connected {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

.connection-status.error {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6b7280;
  transition: background-color 0.3s;
}

.status-dot.active {
  background: #10b981;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.error-message {
  margin-top: 8px;
  font-size: 12px;
  color: #ef4444;
}

.notifications-container {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.notifications-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.notifications-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.clear-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.clear-btn:hover {
  background: var(--bg-hover);
}

.notifications-list {
  max-height: 400px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.2s;
}

.notification-item:hover {
  background: var(--bg-hover);
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item.error {
  border-left: 3px solid #ef4444;
}

.notification-item.performance {
  border-left: 3px solid #3b82f6;
}

.notification-item.alert {
  border-left: 3px solid #f59e0b;
}

.notification-item.info {
  border-left: 3px solid #10b981;
}

.notification-icon {
  font-size: 16px;
  line-height: 1;
  margin-top: 2px;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.notification-message {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  word-break: break-word;
  margin-bottom: 4px;
}

.notification-time {
  font-size: 11px;
  color: var(--text-tertiary);
}

.remove-btn {
  background: none;
  border: none;
  color: var(--text-tertiary);
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.remove-btn:hover {
  background: var(--bg-hover);
  color: var(--text-secondary);
}

/* 深色主题适配 */
[data-theme="dark"] .notifications-container {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>