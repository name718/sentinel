<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import rrwebPlayer from 'rrweb-player';
import 'rrweb-player/dist/style.css';

interface SessionReplayData {
  sessionId: string;
  events: unknown[];
  startTime: number;
  endTime: number;
}

const props = defineProps<{
  replay: SessionReplayData | null;
}>();

const playerContainer = ref<HTMLElement | null>(null);
let player: any = null;

async function initPlayer() {
  if (!props.replay || !playerContainer.value) {
    console.log('[SessionReplay] Cannot init player:', { 
      hasReplay: !!props.replay, 
      hasContainer: !!playerContainer.value 
    });
    return;
  }
  
  console.log('[SessionReplay] Initializing player with events:', props.replay.events.length);
  
  // 清理旧的播放器
  if (player) {
    try {
      player.pause();
    } catch (e) {
      console.warn('[SessionReplay] Error pausing old player:', e);
    }
    player = null;
  }
  
  // 清空容器
  playerContainer.value.innerHTML = '';
  
  // 等待 DOM 更新
  await nextTick();
  
  try {
    // 创建新播放器
    player = new rrwebPlayer({
      target: playerContainer.value,
      props: {
        events: props.replay.events as any[],
        width: 1024,
        height: 768,
        autoPlay: false,
        showController: true,
        speedOption: [1, 2, 4, 8],
      },
    });
    console.log('[SessionReplay] Player initialized successfully');
  } catch (e) {
    console.error('[SessionReplay] Failed to initialize replay player:', e);
  }
}

watch(() => props.replay, (newReplay) => {
  console.log('[SessionReplay] Replay data changed:', { 
    hasReplay: !!newReplay,
    events: newReplay?.events?.length 
  });
  if (newReplay) {
    // 延迟初始化，确保 DOM 已渲染
    setTimeout(initPlayer, 200);
  }
}, { immediate: true });

onMounted(() => {
  console.log('[SessionReplay] Component mounted');
  if (props.replay) {
    initPlayer();
  }
});

onUnmounted(() => {
  console.log('[SessionReplay] Component unmounting');
  if (player) {
    try {
      player.pause();
    } catch (e) {
      console.warn('[SessionReplay] Error pausing player on unmount:', e);
    }
    player = null;
  }
});

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN');
}
</script>

<template>
  <div class="replay-player">
    <div v-if="!replay" class="empty-state">
      <div class="empty-icon">🎬</div>
      <div class="empty-title">暂无会话录制</div>
      <p class="empty-desc">该错误没有关联的会话录制数据</p>
      <p class="empty-hint">启用会话录制功能后，可以回放错误发生前的用户操作</p>
    </div>
    
    <div v-else class="replay-content">
      <!-- 会话信息卡片 -->
      <div class="session-info-card">
        <div class="card-header">
          <h3 class="card-title">
            <span class="title-icon">🎬</span>
            会话录制信息
          </h3>
        </div>
        <div class="card-body">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">会话 ID</div>
              <div class="info-value">{{ replay.sessionId }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">录制时长</div>
              <div class="info-value">{{ formatDuration(replay.endTime - replay.startTime) }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">事件数量</div>
              <div class="info-value">{{ replay.events.length }} 个</div>
            </div>
            <div class="info-item">
              <div class="info-label">录制时间</div>
              <div class="info-value">{{ formatTime(replay.startTime) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 播放器容器 -->
      <div class="player-card">
        <div class="card-header">
          <h3 class="card-title">
            <span class="title-icon">▶️</span>
            回放播放器
          </h3>
        </div>
        <div class="card-body">
          <div ref="playerContainer" class="player-wrapper">
            <div class="player-loading">
              <div class="loading-spinner"></div>
              <div class="loading-text">正在加载播放器...</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 提示信息 -->
      <div class="tips-card">
        <div class="tip-item info">
          <span class="tip-icon">💡</span>
          <span class="tip-text">这是错误发生前 10 秒的用户操作录制</span>
        </div>
        <div class="tip-item security">
          <span class="tip-icon">🔒</span>
          <span class="tip-text">所有输入内容已自动脱敏，密码字段已屏蔽</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.replay-player {
  width: 100%;
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 12px;
  border: 1px solid #334155;
}

.empty-icon {
  font-size: 72px;
  margin-bottom: 20px;
  opacity: 0.8;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 12px;
}

.empty-desc {
  font-size: 14px;
  color: #94a3b8;
  margin: 8px 0;
}

.empty-hint {
  font-size: 13px;
  color: #64748b;
  margin-top: 16px;
  padding: 12px 20px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  display: inline-block;
}

/* 内容区域 */
.replay-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 卡片通用样式 */
.session-info-card,
.player-card,
.tips-card {
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  border-radius: 12px;
  border: 1px solid #334155;
  overflow: hidden;
}

.card-header {
  padding: 16px 20px;
  border-bottom: 1px solid #334155;
  background: rgba(99, 102, 241, 0.05);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #f1f5f9;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon {
  font-size: 20px;
}

.card-body {
  padding: 20px;
}

/* 信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-label {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 14px;
  color: #f1f5f9;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-weight: 500;
}

/* 播放器容器 */
.player-wrapper {
  width: 100%;
  min-height: 600px;
  border-radius: 8px;
  overflow: hidden;
  background: #000;
  position: relative;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.player-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 1;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #334155;
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  font-size: 14px;
  color: #94a3b8;
}

/* 提示卡片 */
.tips-card {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.5;
}

.tip-item.info {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  color: #93c5fd;
}

.tip-item.security {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  color: #86efac;
}

.tip-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.tip-text {
  flex: 1;
}

/* rrweb-player 样式覆盖 */
:deep(.rr-player) {
  width: 100% !important;
  background: #000 !important;
}

:deep(.rr-player__frame) {
  border-radius: 8px;
}

:deep(.rr-controller) {
  background: rgba(15, 23, 42, 0.95) !important;
  border-top: 1px solid #334155;
}

:deep(.rr-timeline__time) {
  color: #94a3b8 !important;
}

:deep(.rr-controller__btns button) {
  color: #f1f5f9 !important;
}

:deep(.rr-controller__btns button:hover) {
  color: #6366f1 !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .player-wrapper {
    min-height: 400px;
  }
  
  .empty-state {
    padding: 60px 20px;
  }
  
  .empty-icon {
    font-size: 56px;
  }
}
</style>
