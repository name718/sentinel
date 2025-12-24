<script setup lang="ts">
import ErrorFilters from '../components/ErrorFilters.vue';
import ErrorTable from '../components/ErrorTable.vue';

type ErrorStatus = 'open' | 'processing' | 'resolved' | 'ignored';

defineProps<{
  searchKeyword: string;
  errorTypeFilter: string;
  errorTypes: string[];
  errors: any[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  loading: boolean;
}>();

defineEmits<{
  'update:searchKeyword': [value: string];
  'update:errorTypeFilter': [value: string];
  reset: [];
  refresh: [];
  viewDetail: [id: number];
  changePage: [page: number];
  updateStatus: [id: number, status: ErrorStatus];
}>();
</script>

<template>
  <div class="page">
    <h1 class="page-title">🐛 错误列表</h1>
    
    <ErrorFilters
      :searchKeyword="searchKeyword"
      :errorTypeFilter="errorTypeFilter"
      :errorTypes="errorTypes"
      :loading="loading"
      @update:searchKeyword="$emit('update:searchKeyword', $event)"
      @update:errorTypeFilter="$emit('update:errorTypeFilter', $event)"
      @reset="$emit('reset')"
      @refresh="$emit('refresh')"
    />

    <div class="result-info">
      找到 <strong>{{ totalCount }}</strong> 条错误记录
    </div>

    <ErrorTable
      :errors="errors"
      :currentPage="currentPage"
      :totalPages="totalPages"
      @viewDetail="$emit('viewDetail', $event)"
      @changePage="$emit('changePage', $event)"
      @updateStatus="$emit('updateStatus', $event[0], $event[1])"
    />
  </div>
</template>

<style scoped>
.page-title { 
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px; 
  color: var(--text);
}
.result-info {
  margin-bottom: 16px;
  color: var(--text-secondary);
  font-size: 14px;
}
.result-info strong {
  color: var(--primary);
  font-weight: 600;
}
</style>
