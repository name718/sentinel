<template>
  <div v-if="hasError" class="error-boundary">
    <div class="error-content">
      <div class="error-icon">⚠️</div>
      <h2>出现了一些问题</h2>
      <p class="error-message">{{ errorMessage }}</p>
      
      <div class="error-details" v-if="showDetails">
        <h4>错误详情：</h4>
        <pre class="error-stack">{{ errorStack }}</pre>
      </div>
      
      <div class="error-actions">
        <button @click="retry" class="btn btn-primary">
          重试
        </button>
        <button @click="toggleDetails" class="btn btn-secondary">
          {{ showDetails ? '隐藏' : '显示' }}详情
        </button>
        <button @click="reportError" class="btn btn-secondary">
          报告问题
        </button>
      </div>
      
      <div class="error-info">
        <p>如果问题持续存在，请尝试：</p>
        <ul>
          <li>刷新页面</li>
          <li>清除浏览器缓存</li>
          <li>检查网络连接</li>
          <li>联系技术支持</li>
        </ul>
      </div>
    </div>
  </div>
  
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured, nextTick } from 'vue';

interface Props {
  fallback?: string;
  onError?: (error: Error, instance: any, info: string) => void;
}

const props = withDefaults(defineProps<Props>(), {
  fallback: '组件加载失败'
});

const hasError = ref(false);
const errorMessage = ref('');
const errorStack = ref('');
const showDetails = ref(false);
const retryCount = ref(0);
const maxRetries = 3;

// 捕获子组件错误
onErrorCaptured((error: Error, instance: any, info: string) => {
  console.error('[ErrorBoundary] Caught error:', error);
  
  hasError.value = true;
  errorMessage.value = error.message || props.fallback;
  errorStack.value = error.stack || 'No stack trace available';
  
  // 调用外部错误处理器
  if (props.onError) {
    try {
      props.onError(error, instance, info);
    } catch (handlerError) {
      console.error('[ErrorBoundary] Error in error handler:', handlerError);
    }
  }
  
  // 自动上报错误到监控系统
  reportErrorToMonitoring(error, info);
  
  // 阻止错误继续向上传播
  return false;
});

// 重试机制
const retry = async () => {
  if (retryCount.value >= maxRetries) {
    alert(`已达到最大重试次数 (${maxRetries})，请刷新页面或联系技术支持`);
    return;
  }
  
  retryCount.value++;
  hasError.value = false;
  errorMessage.value = '';
  errorStack.value = '';
  showDetails.value = false;
  
  // 等待下一个 tick 让组件重新渲染
  await nextTick();
  
  console.log(`[ErrorBoundary] Retry attempt ${retryCount.value}/${maxRetries}`);
};

// 切换详情显示
const toggleDetails = () => {
  showDetails.value = !showDetails.value;
};

// 报告错误
const reportError = () => {
  const errorReport = {
    message: errorMessage.value,
    stack: errorStack.value,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    retryCount: retryCount.value
  };
  
  // 复制到剪贴板
  navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2)).then(() => {
    alert('错误信息已复制到剪贴板，请发送给技术支持');
  }).catch(() => {
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = JSON.stringify(errorReport, null, 2);
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('错误信息已复制到剪贴板，请发送给技术支持');
  });
};

// 上报错误到监控系统
const reportErrorToMonitoring = (error: Error, info: string) => {
  try {
    // 这里可以集成到现有的错误监控系统
    const errorData = {
      type: 'vue_error_boundary',
      message: error.message,
      stack: error.stack,
      componentInfo: info,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      retryCount: retryCount.value
    };
    
    // 发送到监控系统（如果有的话）
    if (window.Monitor) {
      window.Monitor.captureError(error, {
        tags: { source: 'error_boundary' },
        extra: { componentInfo: info, retryCount: retryCount.value }
      });
    }
    
    console.log('[ErrorBoundary] Error reported to monitoring system');
  } catch (reportError) {
    console.error('[ErrorBoundary] Failed to report error:', reportError);
  }
};

// 重置错误状态（供外部调用）
const reset = () => {
  hasError.value = false;
  errorMessage.value = '';
  errorStack.value = '';
  showDetails.value = false;
  retryCount.value = 0;
};

// 暴露方法给父组件
defineExpose({
  reset,
  retry
});
</script>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.error-content {
  max-width: 600px;
  text-align: center;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-content h2 {
  color: var(--text-primary);
  margin-bottom: 12px;
  font-size: 24px;
  font-weight: 600;
}

.error-message {
  color: var(--text-secondary);
  margin-bottom: 24px;
  font-size: 16px;
  line-height: 1.5;
}

.error-details {
  margin: 24px 0;
  text-align: left;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 16px;
}

.error-details h4 {
  color: var(--text-primary);
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
}

.error-stack {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 12px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-secondary);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.error-info {
  text-align: left;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 16px;
}

.error-info p {
  color: var(--text-primary);
  margin-bottom: 12px;
  font-weight: 500;
}

.error-info ul {
  color: var(--text-secondary);
  margin: 0;
  padding-left: 20px;
}

.error-info li {
  margin-bottom: 4px;
}

/* 深色主题适配 */
[data-theme="dark"] .error-boundary {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.2);
}

[data-theme="dark"] .error-stack {
  background: rgba(0, 0, 0, 0.3);
}
</style>