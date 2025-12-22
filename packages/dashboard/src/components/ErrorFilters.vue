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
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg);
  color: var(--text);
  transition: all 0.2s;
}
.search-input::placeholder {
  color: var(--text-secondary);
}
.search-input:focus, .filter-select:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--bg-light);
}
.btn {
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  background: var(--bg);
  color: var(--text);
  transition: all 0.2s;
  white-space: nowrap;
}
.btn:hover { 
  background: var(--bg-lighter);
  border-color: var(--bg-lighter);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary { 
  background: var(--primary); 
  color: white; 
  border: none; 
}
.btn-primary:hover { 
  background: var(--primary-dark);
}
</style>
