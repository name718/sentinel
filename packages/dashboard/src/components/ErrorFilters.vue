<script setup lang="ts">
defineProps<{
  searchKeyword: string;
  errorTypeFilter: string;
  errorTypes: string[];
  loading?: boolean;
}>();

defineEmits<{
  'update:searchKeyword': [value: string];
  'update:errorTypeFilter': [value: string];
  reset: [];
  refresh: [];
}>();
</script>

<template>
  <div class="filters">
    <div class="filter-group">
      <input 
        :value="searchKeyword"
        @input="$emit('update:searchKeyword', ($event.target as HTMLInputElement).value)"
        type="text" 
        placeholder="搜索错误消息或 URL..." 
        class="search-input"
      />
    </div>
    <div class="filter-group">
      <select 
        :value="errorTypeFilter"
        @change="$emit('update:errorTypeFilter', ($event.target as HTMLSelectElement).value)"
        class="filter-select"
      >
        <option value="all">所有类型</option>
        <option v-for="type in errorTypes.filter(t => t !== 'all')" :key="type" :value="type">
          {{ type }}
        </option>
      </select>
    </div>
    <button class="btn" @click="$emit('reset')">重置</button>
    <button class="btn btn-primary" @click="$emit('refresh')" :disabled="loading">
      {{ loading ? '加载中...' : '🔄 刷新' }}
    </button>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}
.filter-group { flex: 1; }
.search-input, .filter-select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: #ffffff;
}
.search-input:focus, .filter-select:focus {
  outline: none;
  border-color: #6366f1;
}
.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn:hover { background: #f1f5f9; }
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary { background: #6366f1; color: white; border: none; }
.btn-primary:hover { opacity: 0.9; background: #6366f1; }
</style>
