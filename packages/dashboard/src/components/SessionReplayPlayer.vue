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
</script>

<template>
  <div class="replay-player">
    <div v-if="!replay" class="empty-state">
      <div class="empty-icon">🎬</div>
      <p>该错误没有会话录制数据</p>
      <p class="hint">启用会话录制功能后，可以回放错误发生前的用户操作</p>
    </div>
    
    <div v-else class="replay-content">
      <div class="replay-info">
        <div class="info-item">
          <span class="label">会话 ID:</span>
          <span class="value">{{ replay.sessionId }}</span>
        </div>
        <div class="info-item">
          <span class="label">录制时长:</span>
          <span class="value">{{ formatDuration(replay.endTime - replay.startTime) }}</span>
        </div>
        <div class="info-item">
          <span class="label">事件数量:</span>
          <span class="value">{{ replay.events.length }}</span>
        </div>
      </div>
      
      <div ref="playerContainer" class="player-container">
        <!-- 播放器将在这里渲染 -->
      </div>
      
      <div class="replay-tips">
        <div class="tip">💡 提示：这是错误发生前 10 秒的用户操作录制</div>
        <div class="tip">🔒 隐私保护：所有输入内容已自动脱敏</div>
        <div class="tip debug">🐛 调试：打开浏览器控制台查看详细日志</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.replay-player {
  width: 100%;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-state p {
  margin: 8px 0;
}

.hint {
  font-size: 12px;
  color: #94a3b8;
}

.replay-content {
  width: 100%;
}

.replay-info {
  display: flex;
  gap: 24px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}

.value {
  font-size: 13px;
  color: #1e293b;
  font-family: monospace;
}

.player-container {
  width: 100%;
  min-height: 600px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  background: #000;
  position: relative;
}

.player-container:empty::after {
  content: '正在加载播放器...';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #64748b;
  font-size: 14px;
}

.replay-tips {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tip {
  font-size: 12px;
  color: #64748b;
  padding: 8px 12px;
  background: #f1f5f9;
  border-radius: 6px;
  border-left: 3px solid #6366f1;
}

.tip.debug {
  background: #fef3c7;
  border-left-color: #f59e0b;
  color: #92400e;
}

/* rrweb-player 样式覆盖 */
:deep(.rr-player) {
  width: 100% !important;
}

:deep(.rr-player__frame) {
  border-radius: 8px;
}
</style>
