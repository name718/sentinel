import { ref, computed, watch, type Ref } from 'vue';

export function useErrorFilters(errors: Ref<any[]>) {
  const searchKeyword = ref('');
  const errorTypeFilter = ref<string>('all');
  const currentPage = ref(1);
  const pageSize = ref(20);

  // 过滤后的错误列表
  const filteredErrors = computed(() => {
    let result = errors.value;
    
    // 按类型过滤
    if (errorTypeFilter.value !== 'all') {
      result = result.filter(e => e.type === errorTypeFilter.value);
    }
    
    // 按关键词搜索
    if (searchKeyword.value) {
      const keyword = searchKeyword.value.toLowerCase();
      result = result.filter(e => 
        e.message.toLowerCase().includes(keyword) ||
        e.url?.toLowerCase().includes(keyword)
      );
    }
    
    return result;
  });

  // 分页后的错误列表
  const paginatedErrors = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return filteredErrors.value.slice(start, end);
  });

  // 错误类型列表
  const errorTypes = computed(() => {
    const types = new Set(errors.value.map(e => e.type));
    return ['all', ...Array.from(types)];
  });

  // 总页数
  const totalPages = computed(() => {
    return Math.ceil(filteredErrors.value.length / pageSize.value);
  });

  // 重置筛选
  function resetFilters() {
    searchKeyword.value = '';
    errorTypeFilter.value = 'all';
    currentPage.value = 1;
  }

  // 切换页面
  function changePage(page: number) {
    currentPage.value = page;
  }

  // 监听筛选条件变化，重置页码
  watch([searchKeyword, errorTypeFilter], () => {
    currentPage.value = 1;
  });

  return {
    searchKeyword,
    errorTypeFilter,
    currentPage,
    pageSize,
    filteredErrors,
    paginatedErrors,
    errorTypes,
    totalPages,
    resetFilters,
    changePage
  };
}
