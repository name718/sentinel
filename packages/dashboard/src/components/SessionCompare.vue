<script setup lang="ts">
import { ref, computed } from 'vue';

interface SessionData {
  id: number;
  type: string;
  message: string;
  url: string;
  timestamp: number;
  breadcrumbs?: Array<{
    type: string;
    data: any;
    timestamp: number;
  }>;
  sessionReplay?: {
    sessionId: string;
    events: unknown[];
    startTime: number;
    endTime: number;
  };
  // 从 breadcrumbs 中提取的用户信息
  userInfo?: {
    userId?: string;
    userAgent?: string;
    platform?: string;
    language?: string;
    screenResolution?: string;
    viewport?: string;
  };
}

const props = defineProps<{
  sessions: SessionData[];
  fingerprint: string;
}>();

defineEmits<{
  close: [];
  viewSession: [id: number];
}>();

// 从 breadcrumbs 中提取环境信息
function extractEnvInfo(session: SessionData) {
  const breadcrumbs = session.breadcrumbs || [];
  const info: any = {
    userId: 'Unknown',
    userAgent: 'Unknown',
    platform: 'Unknown',
    language: 'Unknown',
    screenResolution: 'Unknown',
    viewport: 'Unknown',
    actions: []
  };

  for (const crumb of breadcrumbs) {
    if (crumb.type === 'navigation') {
      info.url = crumb.data.to || session.url;
    } else if (crumb.type === 'click') {
      info.actions.push({ type: 'click', target: crumb.data.target, time: crumb.timestamp });
    } else if (crumb.type === 'input') {
      info.actions.push({ type: 'input', target: crumb.data.target, time: crumb.timestamp });
    }
  }

  // 从 userAgent 解析
  if (typeof navigator !== 'undefined') {
    info.userAgent = navigator.userAgent;
    info.platform = navigator.platform;
    info.language = navigator.language;
    info.screenResolution = `${screen.width}x${screen.height}`;
    info.viewport = `${window.innerWidth}x${window.innerHeight}`;
  }

  return info;
}

// 计算每个 session 的环境信息
const sessionsWithEnv = computed(() => {
  return props.sessions.map(session => ({
    ...session,
    env: extractEnvInfo(session)
  }));
});

// 找出差异点
const differences = computed(() => {
  if (sessionsWithEnv.value.length < 2) return [];
  
  const diffs: Array<{ field: string; values: any[] }> = [];
  const fields = ['url', 'userAgent', 'platform', 'language', 'screenResolution', 'viewport'];
  
  for (const field of fields) {
    const values = sessionsWithEnv.value.map(s => s.env[field]);
    const uniqueValues = [...new Set(values)];
    
    if (uniqueValues.length > 1) {
      diffs.push({ field, values });
    }
  }
  
  return diffs;
});

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN');
}

function getTimeAgo(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    url: '页面 URL',
    userAgent: '浏览器',
    platform: '操作系统',
    language: '语言',
    screenResolution: '屏幕分辨率',
    viewport: '视口大小'
  };
  return labels[field] || field;
}
</script>

<template>
  <div class="session-compare">
    <div class="compare-header">
      <div class="header-left">
        <h2>🔍 Session 对比分析</h2>
        <p class="header-desc">对比同一错误在不同用户的表现，快速定位问题原因</p>
      </div>
      <button class="btn-close" @click="$emit('close')">✕</button>
    </div>

    <div class="compare-body">
      <!-- 错误信息 -->
      <div class="error-info-card">
        <h3>📋 错误信息</h3>
        <div class="error-details">
          <div class="detail-item">
            <span class="label">错误类型</span>
            <span class="value">{{ sessions[0]?.type }}</span>
          </div>
          <div class="detail-item">
            <span class="label">错误消息</span>
            <span class="value">{{ sessions[0]?.message }}</span>
          </div>
          <div class="detail-item">
            <span class="label">指纹</span>
            <span class="value mono">{{ fingerprint }}</span>
          </div>
          <div class="detail-item">
            <span class="label">实例数量</span>
            <span class="value">{{ sessions.length }} 个</span>
          </div>
        </div>
      </div>

      <!-- 差异高亮 -->
      <div v-if="differences.length > 0" class="differences-card">
        <h3>⚠️ 发现差异点</h3>
        <div class="diff-list">
          <div v-for="diff in differences" :key="diff.field" class="diff-item">
            <div class="diff-field">{{ getFieldLabel(diff.field) }}</div>
            <div class="diff-values">
              <div v-for="(value, idx) in diff.values" :key="idx" class="diff-value">
                <span class="value-badge">{{ value }}</span>
                <span class="value-count">{{ diff.values.filter(v => v === value).length }} 个实例</span>
              </div>
            </div>
          </div>
        </div>
        <div class="diff-hint">
          💡 这些差异可能是导致部分用户出错的原因
        </div>
      </div>

      <!-- Session 列表对比 -->
      <div class="sessions-grid">
        <div 
          v-for="(session, index) in sessionsWithEnv" 
          :key="session.id"
          class="session-card"
        >
          <div class="session-header">
            <div class="session-title">
              <span class="session-icon">👤</span>
              <span class="session-label">Session {{ index + 1 }}</span>
            </div>
            <div class="session-time">{{ getTimeAgo(session.timestamp) }}</div>
          </div>

          <div class="session-info">
            <!-- 基本信息 -->
            <div class="info-section">
              <div class="section-title">基本信息</div>
              <div class="info-row">
                <span class="info-label">ID</span>
                <span class="info-value">#{{ session.id }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">时间</span>
                <span class="info-value">{{ formatTime(session.timestamp) }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">页面</span>
                <span class="info-value url">{{ session.url }}</span>
              </div>
            </div>

            <!-- 环境信息 -->
            <div class="info-section">
              <div class="section-title">环境信息</div>
              <div class="info-row">
                <span class="info-label">浏览器</span>
                <span class="info-value">{{ session.env.userAgent }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">平台</span>
                <span class="info-value">{{ session.env.platform }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">语言</span>
                <span class="info-value">{{ session.env.language }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">分辨率</span>
                <span class="info-value">{{ session.env.screenResolution }}</span>
              </div>
            </div>

            <!-- 用户行为 -->
            <div class="info-section">
              <div class="section-title">用户行为</div>
              <div v-if="session.breadcrumbs && session.breadcrumbs.length > 0" class="actions-list">
                <div 
                  v-for="(crumb, idx) in session.breadcrumbs.slice(-5)" 
                  :key="idx"
                  class="action-item"
                >
                  <span class="action-type">{{ crumb.type }}</span>
                  <span class="action-data">{{ JSON.stringify(crumb.data).substring(0, 30) }}</span>
                </div>
              </div>
              <div v-else class="no-data">暂无行为数据</div>
            </div>

            <!-- 会话回放 -->
            <div class="info-section">
              <div class="section-title">会话回放</div>
              <div v-if="session.sessionReplay" class="replay-info">
                <div class="replay-badge">✅ 已录制</div>
                <div class="replay-meta">
                  {{ session.sessionReplay.events.length }} 个事件
                </div>
              </div>
              <div v-else class="no-data">未录制</div>
            </div>
          </div>

          <div class="session-actions">
            <button class="btn-view" @click="$emit('viewSession', session.id)">
              查看详情
            </button>
          </div>
        </div>
      </div>

      <!-- 分析建议 -->
      <div class="analysis-card">
        <h3>💡 分析建议</h3>
        <ul class="suggestions">
          <li v-if="differences.some(d => d.field === 'url')">
            <strong>URL 差异：</strong>不同页面路径可能导致不同的错误表现，检查路由参数和页面状态
          </li>
          <li v-if="differences.some(d => d.field === 'userAgent')">
            <strong>浏览器差异：</strong>可能存在浏览器兼容性问题，重点测试特定浏览器
          </li>
          <li v-if="differences.some(d => d.field === 'screenResolution')">
            <strong>分辨率差异：</strong>可能是响应式布局问题，检查不同屏幕尺寸下的表现
          </li>
          <li v-if="sessionsWithEnv.some(s => s.breadcrumbs && s.breadcrumbs.length > 0)">
            <strong>用户行为：</strong>对比用户操作路径，找出触发错误的特定操作序列
          </li>
          <li v-if="sessionsWithEnv.some(s => s.sessionReplay)">
            <strong>会话回放：</strong>观看录制视频，直观了解错误发生时的页面状态
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.session-compare {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.compare-header {
  padding: 24px 32px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-light);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left h2 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}

.header-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

.btn-close {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--bg-lighter);
  color: var(--text);
}

.compare-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 32px;
}

/* 错误信息卡片 */
.error-info-card {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.error-info-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 16px;
}

.error-details {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item .label {
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
  font-weight: 600;
}

.detail-item .value {
  font-size: 14px;
  color: var(--text);
}

.detail-item .value.mono {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 12px;
}

/* 差异卡片 */
.differences-card {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%);
  border: 2px solid var(--warning);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.differences-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 16px;
}

.diff-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.diff-item {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
}

.diff-field {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12px;
}

.diff-values {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.diff-value {
  display: flex;
  align-items: center;
  gap: 8px;
}

.value-badge {
  padding: 4px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  color: var(--text);
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
}

.value-count {
  font-size: 11px;
  color: var(--text-secondary);
}

.diff-hint {
  padding: 12px 16px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text);
}

/* Session 网格 */
.sessions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.session-card {
  background: var(--bg-light);
  border: 2px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.session-card:hover {
  border-color: var(--primary);
  box-shadow: 0 8px 24px rgba(99, 102, 241, 0.2);
}

.session-header {
  padding: 16px 20px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.session-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.session-icon {
  font-size: 20px;
}

.session-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.session-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.session-info {
  padding: 20px;
}

.info-section {
  margin-bottom: 20px;
}

.info-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  gap: 12px;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 80px;
}

.info-value {
  font-size: 12px;
  color: var(--text);
  text-align: right;
  word-break: break-all;
  flex: 1;
}

.info-value.url {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-size: 11px;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-item {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: var(--bg);
  border-radius: 6px;
  font-size: 11px;
}

.action-type {
  padding: 2px 8px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border-radius: 4px;
  font-weight: 600;
}

.action-data {
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.replay-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.replay-badge {
  padding: 4px 10px;
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.replay-meta {
  font-size: 11px;
  color: var(--text-secondary);
}

.no-data {
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
}

.session-actions {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  background: var(--bg);
}

.btn-view {
  width: 100%;
  padding: 10px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-view:hover {
  background: var(--primary-dark);
}

/* 分析建议 */
.analysis-card {
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
  border: 1px solid var(--primary);
  border-radius: 12px;
  padding: 20px;
}

.analysis-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 16px;
}

.suggestions {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestions li {
  padding: 12px 16px;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text);
  line-height: 1.6;
}

.suggestions strong {
  color: var(--primary);
}

@media (max-width: 1200px) {
  .sessions-grid {
    grid-template-columns: 1fr;
  }
  
  .error-details {
    grid-template-columns: 1fr;
  }
}
</style>
