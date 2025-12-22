<script setup lang="ts">
import { computed } from 'vue';

interface LongTask {
  startTime: number;
  duration: number;
  attribution?: string;
}

const props = defineProps<{
  tasks: LongTask[];
}>();

// 按持续时间排序
const sortedTasks = computed(() => {
  return [...props.tasks].sort((a, b) => b.duration - a.duration);
});

// 统计信息
const stats = computed(() => {
  const total = props.tasks.length;
  const totalDuration = props.tasks.reduce((sum, t) => sum + t.duration, 0);
  const avgDuration = total > 0 ? totalDuration / total : 0;
  const maxDuration = Math.max(...props.tasks.map(t => t.duration), 0);
  
  return {
    total,
    totalDuration: Math.round(totalDuration),
    avgDuration: Math.round(avgDuration),
    maxDuration: Math.round(maxDuration)
  };
});

// 严重程度
function getSeverity(duration: number): 'critical' | 'warning' | 'normal' {
  if (duration > 200) return 'critical';
  if (duration > 100) return 'warning';
  return 'normal';
}

function getSeverityColor(severity: string): string {
  const colors = {
    critical: '#ef4444',
    warning: '#f59e0b',
    normal: '#10b981'
  };
  return colors[severity as keyof typeof colors] || colors.normal;
}
</script>

<template>
  <div class="long-task-analysis">
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-item">
        <div class="stat-label">长任务数量</div>
        <div class="stat-value">{{ stats.total }}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">总阻塞时间</div>
        <div class="stat-value">{{ stats.totalDuration }}ms</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">平均时长</div>
        <div class="stat-value">{{ stats.avgDuration }}ms</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">最长任务</div>
        <div class="stat-value">{{ stats.maxDuration }}ms</div>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="task-list">
      <div class="task-header">
        <div class="col-time">开始时间</div>
        <div class="col-duration">持续时间</div>
        <div class="col-attribution">归属</div>
        <div class="col-severity">严重程度</div>
      </div>
      <div class="task-body">
        <div 
          v-for="(task, index) in sortedTasks.slice(0, 20)" 
          :key="index"
          class="task-row"
        >
          <div class="col-time">{{ Math.round(task.startTime) }}ms</div>
          <div class="col-duration">
            <div class="duration-bar-container">
              <div 
                class="duration-bar"
                :style="{
                  width: `${Math.min((task.duration / stats.maxDuration) * 100, 100)}%`,
                  background: getSeverityColor(getSeverity(task.duration))
                }"
              ></div>
              <span class="duration-text">{{ Math.round(task.duration) }}ms</span>
            </div>
          </div>
          <div class="col-attribution">{{ task.attribution || 'unknown' }}</div>
          <div class="col-severity">
            <span 
              class="severity-badge"
              :style="{ background: getSeverityColor(getSeverity(task.duration)) }"
            >
              {{ getSeverity(task.duration) === 'critical' ? '严重' : 
                 getSeverity(task.duration) === 'warning' ? '警告' : '正常' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 优化建议 -->
    <div v-if="stats.total > 0" class="recommendations">
      <h4>💡 优化建议</h4>
      <ul>
        <li v-if="stats.maxDuration > 200">
          发现超过 200ms 的长任务，建议拆分为多个小任务或使用 Web Worker
        </li>
        <li v-if="stats.total > 10">
          长任务数量较多（{{ stats.total }}个），考虑优化 JavaScript 执行效率
        </li>
        <li v-if="stats.avgDuration > 100">
          平均任务时长较长（{{ stats.avgDuration }}ms），建议使用代码分割和懒加载
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.long-task-analysis {
  background: #ffffff;
  border-radius: 8px;
  padding: 20px;
}
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.stat-item {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  text-align: center;
}
.stat-label {
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}
.task-list {
  margin-bottom: 24px;
}
.task-header {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr 1fr;
  gap: 12px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px 6px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}
.task-body {
  max-height: 300px;
  overflow-y: auto;
}
.task-row {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr 1fr;
  gap: 12px;
  padding: 12px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
  align-items: center;
}
.task-row:hover {
  background: #f8fafc;
}
.duration-bar-container {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}
.duration-bar {
  height: 20px;
  border-radius: 4px;
  min-width: 20px;
}
.duration-text {
  font-weight: 600;
  color: #1e293b;
}
.severity-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  color: white;
  font-size: 11px;
  font-weight: 600;
}
.recommendations {
  padding: 16px;
  background: #fffbeb;
  border-left: 4px solid #f59e0b;
  border-radius: 6px;
}
.recommendations h4 {
  margin-bottom: 12px;
  color: #92400e;
}
.recommendations ul {
  margin-left: 20px;
  color: #78350f;
}
.recommendations li {
  margin-bottom: 8px;
  line-height: 1.6;
}
</style>
