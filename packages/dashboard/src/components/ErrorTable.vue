<script setup lang="ts">
import ErrorStatusBadge from './ErrorStatusBadge.vue';

interface ErrorItem {
  id: number;
  type: string;
  message: string;
  count: number;
  timestamp: number;
  status?: 'open' | 'processing' | 'resolved' | 'ignored';
}

defineProps<{
  errors: ErrorItem[];
  currentPage: number;
  totalPages: number;
}>();

defineEmits<{
  viewDetail: [id: number];
  changePage: [page: number];
  updateStatus: [id: number, status: 'open' | 'processing' | 'resolved' | 'ignored'];
}>();

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN');
}
</script>

<template>
  <div class="card">
    <div class="card-body">
      <div v-if="errors.length === 0" class="empty">
        没有找到匹配的错误
      </div>
      <div v-else>
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>类型</th>
              <th>错误信息</th>
              <th>状态</th>
              <th>次数</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="err in errors" :key="err.id">
              <td>#{{ err.id }}</td>
              <td><span class="badge badge-error">{{ err.type }}</span></td>
              <td class="msg-cell">
                {{ err.message.substring(0, 50) }}{{ err.message.length > 50 ? '...' : '' }}
              </td>
              <td>
                <ErrorStatusBadge 
                  :status="err.status || 'open'" 
                  @change="$emit('updateStatus', err.id, $event)"
                />
              </td>
              <td><span class="badge badge-count">{{ err.count }}</span></td>
              <td>{{ formatTime(err.timestamp) }}</td>
              <td>
                <button class="btn btn-sm btn-primary" @click="$emit('viewDetail', err.id)">
                  详情
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="pagination">
          <button 
            class="page-btn" 
            :disabled="currentPage === 1"
            @click="$emit('changePage', currentPage - 1)"
          >
            上一页
          </button>
          <span class="page-info">
            第 {{ currentPage }} / {{ totalPages }} 页
          </span>
          <button 
            class="page-btn" 
            :disabled="currentPage === totalPages"
            @click="$emit('changePage', currentPage + 1)"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 24px;
}
.card-body { padding: 20px; }
.empty { 
  text-align: center; 
  color: var(--text-secondary); 
  padding: 40px; 
}
.table { 
  width: 100%; 
  border-collapse: collapse; 
  font-size: 14px; 
}
.table th, .table td { 
  padding: 12px; 
  text-align: left; 
  border-bottom: 1px solid var(--border);
  color: var(--text);
}
.table th { 
  font-weight: 600; 
  color: var(--text-secondary); 
  font-size: 12px; 
  text-transform: uppercase; 
}
.table tr:hover { 
  background: var(--bg);
}
.msg-cell { 
  max-width: 300px; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  white-space: nowrap; 
}
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.badge-error { 
  background: rgba(239, 68, 68, 0.1); 
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.2);
}
.badge-count { 
  background: rgba(99, 102, 241, 0.1); 
  color: var(--primary);
  border: 1px solid rgba(99, 102, 241, 0.2);
}
.btn {
  padding: 6px 12px;
  font-size: 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: var(--primary);
  color: white;
  transition: all 0.2s;
}
.btn:hover { 
  background: var(--primary-dark);
}
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
}
.page-btn {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
}
.page-btn:hover:not(:disabled) {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.page-info {
  color: var(--text-secondary);
  font-size: 14px;
}
</style>
