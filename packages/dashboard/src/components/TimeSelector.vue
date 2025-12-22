<script setup lang="ts">
type TimeRange = '1h' | '24h' | '7d' | '30d';

defineProps<{
  modelValue: TimeRange;
}>();

defineEmits<{
  'update:modelValue': [value: TimeRange];
}>();

const ranges: { value: TimeRange; label: string }[] = [
  { value: '1h', label: '1小时' },
  { value: '24h', label: '24小时' },
  { value: '7d', label: '7天' },
  { value: '30d', label: '30天' }
];
</script>

<template>
  <div class="time-selector">
    <button 
      v-for="range in ranges" 
      :key="range.value"
      class="time-btn"
      :class="{ active: modelValue === range.value }"
      @click="$emit('update:modelValue', range.value)"
    >
      {{ range.label }}
    </button>
  </div>
</template>

<style scoped>
.time-selector {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: #ffffff;
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.time-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
}
.time-btn:hover { background: #f1f5f9; }
.time-btn.active {
  background: #6366f1;
  color: white;
}
</style>
