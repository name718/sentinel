<script setup lang="ts">
import { computed } from 'vue';

interface Resource {
  name: string;
  type: string;
  startTime: number;
  duration: number;
  size: number;
  cached?: boolean;
}

const props = defineProps<{
  resources: Resource[];
}>();

// 按开始时间排序
const sortedResources = computed(() => {
  return [...props.resources].sort((a, b) => a.startTime - b.startTime);
});

// 计算最大时间用于缩放
const maxTime = computed(() => {
  return Math.max(...props.resources.map(r => r.startTime + r.duration));
});

// 资源类型颜色
const typeColors: Record<string, string> = {
  'js': '#f59e0b',
  'css': '#8b5cf6',
  'image': '#10b981',
  'xhr': '#3b82f6',
  'fetch': '#06b6d4',
  'other': '#6b7280'
};

function getColor(type: string) {
  return typeColors[type] || typeColors.other;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function getFileName(url: string) {
  const parts = url.split('/');
  return parts[parts.length - 1] || url;
}
</script>

<template>
  <div class="waterfall">
    <div class="waterfall-header">
      <div class="col-name">资源名称</div>
      <div class="col-type">类型</div>
      <div class="col-size">大小</div>
      <div class="col-timeline">时间线</div>
    </div>
    <div class="waterfall-body">
      <div 
        v-for="(resource, index) in sortedResources" 
        :key="index"
        class="waterfall-row"
      >
        <div class="col-name" :title="resource.name">
          {{ getFileName(resource.name) }}
          <span v-if="resource.cached" class="cached-badge">缓存</span>
        </div>
        <div class="col-type">
          <span class="type-badge" :style="{ background: getColor(resource.type) }">
            {{ resource.type }}
          </span>
        </div>
        <div class="col-size">{{ formatSize(resource.size) }}</div>
        <div class="col-timeline">
          <div class="timeline-track">
            <div 
              class="timeline-bar"
              :style="{
                left: `${(resource.startTime / maxTime) * 100}%`,
                width: `${(resource.duration / maxTime) * 100}%`,
                background: getColor(resource.type)
              }"
              :title="`${resource.startTime}ms - ${resource.duration}ms`"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.waterfall {
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
}
.waterfall-header {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 3fr;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}
.waterfall-body {
  max-height: 400px;
  overflow-y: auto;
}
.waterfall-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 3fr;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
  align-items: center;
}
.waterfall-row:hover {
  background: #f8fafc;
}
.col-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1e293b;
}
.cached-badge {
  display: inline-block;
  padding: 2px 6px;
  margin-left: 6px;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
}
.type-badge {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  color: white;
  font-size: 11px;
  font-weight: 600;
}
.col-size {
  color: #64748b;
  font-size: 12px;
}
.timeline-track {
  position: relative;
  height: 20px;
  background: #f1f5f9;
  border-radius: 4px;
}
.timeline-bar {
  position: absolute;
  height: 100%;
  border-radius: 4px;
  opacity: 0.8;
  transition: opacity 0.2s;
}
.timeline-bar:hover {
  opacity: 1;
}
</style>
