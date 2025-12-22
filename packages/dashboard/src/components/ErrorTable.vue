<script setup lang="ts">
interface ErrorItem {
  id: number;
  type: string;
  message: string;
  count: number;
  timestamp: number;
}

defineProps<{
  errors: ErrorItem[];
  currentPage: number;
  totalPages: number;
}>();

defineEmits<{
  viewDetail: [id: number];
  changePage: [page: number];
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
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 24px;
}
.card-body { padding: 20px; }
.empty { text-align: center; color: #64748b; padding: 40px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
.table th { font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; }
.table tr:hover { background: #f8fafc; }
.msg-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.badge-error { background: #fef2f2; color: #dc2626; }
.badge-count { background: #f0f9ff; color: #0369a1; }
.btn {
  padding: 6px 12px;
  font-size: 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: #6366f1;
  color: white;
  transition: all 0.2s;
}
.btn:hover { opacity: 0.9; }
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e2e8f0;
}
.page-btn {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
}
.page-btn:hover:not(:disabled) {
  background: #6366f1;
  color: white;
  border-color: #6366f1;
}
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.page-info {
  color: #64748b;
  font-size: 14px;
}
</style>
