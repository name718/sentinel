<script setup lang="ts">
interface Stat {
  label: string;
  value: number;
  icon: string;
  color: string;
}

defineProps<{
  stats: Stat[];
}>();
</script>

<template>
  <div class="stats-grid">
    <div class="stat-card" v-for="stat in stats" :key="stat.label">
      <div class="stat-icon" :style="{ background: stat.color + '20', color: stat.color }">
        {{ stat.icon }}
      </div>
      <div class="stat-info">
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.stat-card {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.2s;
}
.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}
.stat-value { 
  font-size: 28px; 
  font-weight: 700; 
  color: var(--text);
}
.stat-label { 
  font-size: 13px; 
  color: var(--text-secondary);
}
</style>
