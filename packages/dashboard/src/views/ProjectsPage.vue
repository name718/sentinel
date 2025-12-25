<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { authFetch } from '../composables/useAuth';
import { useProject, type Project } from '../composables/useProject';
import { API_BASE } from '../config';

const { currentProject, switchProject, fetchProjects: refreshGlobalProjects } = useProject();

const projects = ref<Project[]>([]);
const loading = ref(false);
const showCreateModal = ref(false);
const showDetailModal = ref(false);
const selectedProject = ref<Project | null>(null);
const projectMembers = ref<any[]>([]);
const projectStats = ref<any>(null);

// 新项目表单
const newProject = ref({
  name: '',
  description: '',
  platform: 'web'
});

// 添加成员表单
const newMemberEmail = ref('');

async function fetchProjects() {
  loading.value = true;
  try {
    const res = await authFetch(`${API_BASE}/projects`);
    const data = await res.json();
    projects.value = data.projects || [];
  } catch (e) {
    console.error('获取项目列表失败:', e);
  }
  loading.value = false;
}

async function createProject() {
  if (!newProject.value.name) {
    alert('请输入项目名称');
    return;
  }

  try {
    const res = await authFetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject.value)
    });

    if (res.ok) {
      const data = await res.json();
      showCreateModal.value = false;
      newProject.value = { name: '', description: '', platform: 'web' };
      await fetchProjects();
      await refreshGlobalProjects();
      // 自动切换到新创建的项目
      if (data.project) {
        switchProject(data.project);
      }
    } else {
      const err = await res.json();
      alert(err.error || '创建失败');
    }
  } catch (e) {
    console.error('创建项目失败:', e);
  }
}

async function viewProject(project: Project) {
  selectedProject.value = project;
  showDetailModal.value = true;

  try {
    const res = await authFetch(`${API_BASE}/projects/${project.id}`);
    const data = await res.json();
    projectMembers.value = data.members || [];
    projectStats.value = data.stats;
  } catch (e) {
    console.error('获取项目详情失败:', e);
  }
}

// 切换到选中的项目
function selectProject(project: Project) {
  switchProject(project);
  showDetailModal.value = false;
}

async function deleteProject(project: Project) {
  if (!confirm(`确定删除项目 "${project.name}"？\n这将删除所有相关的错误和性能数据！`)) {
    return;
  }

  try {
    const res = await authFetch(`${API_BASE}/projects/${project.id}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      await fetchProjects();
      await refreshGlobalProjects();
      
      // 如果删除的是当前项目，切换到第一个项目
      if (currentProject.value?.id === project.id && projects.value.length > 0) {
        switchProject(projects.value[0]);
      }
      
      if (selectedProject.value?.id === project.id) {
        showDetailModal.value = false;
      }
    } else {
      const err = await res.json();
      alert(err.error || '删除失败');
    }
  } catch (e) {
    console.error('删除项目失败:', e);
  }
}

async function addMember() {
  if (!newMemberEmail.value || !selectedProject.value) return;

  try {
    const res = await authFetch(`${API_BASE}/projects/${selectedProject.value.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newMemberEmail.value })
    });

    if (res.ok) {
      newMemberEmail.value = '';
      viewProject(selectedProject.value);
    } else {
      const err = await res.json();
      alert(err.error || '添加失败');
    }
  } catch (e) {
    console.error('添加成员失败:', e);
  }
}

async function removeMember(memberId: number) {
  if (!selectedProject.value) return;
  if (!confirm('确定移除该成员？')) return;

  try {
    await authFetch(`${API_BASE}/projects/${selectedProject.value.id}/members/${memberId}`, {
      method: 'DELETE'
    });
    viewProject(selectedProject.value);
  } catch (e) {
    console.error('移除成员失败:', e);
  }
}

async function regenerateDSN() {
  if (!selectedProject.value) return;
  if (!confirm('重新生成 DSN 后，需要更新 SDK 配置。确定继续？')) return;

  try {
    const res = await authFetch(`${API_BASE}/projects/${selectedProject.value.id}/regenerate-dsn`, {
      method: 'POST'
    });

    if (res.ok) {
      const data = await res.json();
      selectedProject.value.dsn = data.dsn;
      fetchProjects();
    }
  } catch (e) {
    console.error('重新生成 DSN 失败:', e);
  }
}

function copyDSN(dsn: string) {
  navigator.clipboard.writeText(dsn);
  alert('DSN 已复制到剪贴板');
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

const platformLabels: Record<string, string> = {
  web: '🌐 Web',
  'react-native': '📱 React Native',
  electron: '🖥️ Electron',
  node: '⚙️ Node.js'
};

onMounted(fetchProjects);
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">📦 项目管理</h1>
        <p class="page-desc">管理你的监控项目</p>
      </div>
      <button class="btn btn-primary" @click="showCreateModal = true">
        + 创建项目
      </button>
    </div>

    <!-- 项目列表 -->
    <div v-if="loading" class="loading">加载中...</div>
    
    <div v-else-if="projects.length === 0" class="empty">
      <div class="empty-icon">📦</div>
      <p>暂无项目，点击上方按钮创建</p>
    </div>

    <div v-else class="projects-grid">
      <div 
        v-for="project in projects" 
        :key="project.id" 
        class="project-card"
        @click="viewProject(project)"
      >
        <div class="project-header">
          <h3 class="project-name">{{ project.name }}</h3>
          <span class="project-platform">{{ platformLabels[project.platform] || project.platform }}</span>
        </div>
        <p class="project-desc">{{ project.description || '暂无描述' }}</p>
        <div class="project-stats">
          <span class="stat">🐛 {{ project.error_count }} 错误</span>
          <span class="stat">⚡ {{ project.perf_count }} 性能</span>
        </div>
        <div class="project-footer">
          <span class="project-role">{{ project.user_role === 'owner' ? '👑 所有者' : '👤 成员' }}</span>
          <span class="project-date">{{ formatDate(project.created_at) }}</span>
        </div>
      </div>
    </div>

    <!-- 创建项目弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>创建项目</h3>
          <button class="modal-close" @click="showCreateModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>项目名称 *</label>
            <input v-model="newProject.name" placeholder="如：我的电商网站" class="input" />
          </div>
          <div class="form-group">
            <label>项目描述</label>
            <textarea v-model="newProject.description" placeholder="项目简介..." class="input textarea"></textarea>
          </div>
          <div class="form-group">
            <label>平台类型</label>
            <select v-model="newProject.platform" class="input">
              <option value="web">🌐 Web 应用</option>
              <option value="react-native">📱 React Native</option>
              <option value="electron">🖥️ Electron</option>
              <option value="node">⚙️ Node.js</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showCreateModal = false">取消</button>
          <button class="btn btn-primary" @click="createProject">创建</button>
        </div>
      </div>
    </div>

    <!-- 项目详情弹窗 -->
    <div v-if="showDetailModal && selectedProject" class="modal-overlay" @click.self="showDetailModal = false">
      <div class="modal modal-large">
        <div class="modal-header">
          <div class="modal-title-row">
            <h3>{{ selectedProject.name }}</h3>
            <span 
              v-if="currentProject?.id === selectedProject.id" 
              class="current-badge"
            >当前项目</span>
          </div>
          <button class="modal-close" @click="showDetailModal = false">✕</button>
        </div>
        <div class="modal-body">
          <!-- 切换项目按钮 -->
          <div 
            v-if="currentProject?.id !== selectedProject.id" 
            class="switch-project-banner"
          >
            <span>切换到此项目查看数据</span>
            <button class="btn btn-primary btn-sm" @click="selectProject(selectedProject)">
              🔄 切换到此项目
            </button>
          </div>

          <!-- DSN 配置 -->
          <div class="detail-section">
            <h4>🔑 SDK 配置</h4>
            <div class="dsn-box">
              <code>{{ selectedProject.dsn }}</code>
              <button class="btn btn-sm" @click="copyDSN(selectedProject.dsn)">复制</button>
              <button 
                v-if="selectedProject.user_role === 'owner'" 
                class="btn btn-sm btn-danger" 
                @click="regenerateDSN"
              >
                重新生成
              </button>
            </div>
            <pre class="code-block">import { Monitor } from '@monitor/sdk';

Monitor.getInstance().init({
  dsn: '{{ selectedProject.dsn }}',
  reportUrl: 'http://localhost:3000/api/report'
});</pre>
          </div>

          <!-- 统计信息 -->
          <div class="detail-section" v-if="projectStats">
            <h4>📊 统计信息</h4>
            <div class="stats-row">
              <div class="stat-item">
                <div class="stat-value">{{ projectStats.error_count }}</div>
                <div class="stat-label">错误总数</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ projectStats.error_groups }}</div>
                <div class="stat-label">错误分组</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ projectStats.perf_count }}</div>
                <div class="stat-label">性能记录</div>
              </div>
            </div>
          </div>

          <!-- 项目成员 -->
          <div class="detail-section" v-if="selectedProject.user_role === 'owner'">
            <h4>👥 项目成员</h4>
            <div class="members-list">
              <div v-for="member in projectMembers" :key="member.id" class="member-item">
                <div class="member-info">
                  <span class="member-name">{{ member.name }}</span>
                  <span class="member-email">{{ member.email }}</span>
                </div>
                <div class="member-actions">
                  <span class="member-role">{{ member.role }}</span>
                  <button class="btn btn-sm btn-danger" @click="removeMember(member.id)">移除</button>
                </div>
              </div>
              <div v-if="projectMembers.length === 0" class="empty-members">
                暂无其他成员
              </div>
            </div>
            <div class="add-member">
              <input v-model="newMemberEmail" placeholder="输入成员邮箱" class="input" />
              <button class="btn btn-primary" @click="addMember">添加成员</button>
            </div>
          </div>

          <!-- 危险操作 -->
          <div class="detail-section danger-zone" v-if="selectedProject.user_role === 'owner'">
            <h4>⚠️ 危险操作</h4>
            <button class="btn btn-danger" @click="deleteProject(selectedProject)">
              删除项目
            </button>
            <p class="danger-hint">删除后无法恢复，所有数据将被清除</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text);
}

.page-desc {
  color: var(--text-secondary);
  font-size: 14px;
}

.loading, .empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.project-card {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.project-card:hover {
  transform: translateY(-2px);
  border-color: var(--primary);
  box-shadow: 0 8px 24px rgba(0,0,0,0.2);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.project-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.project-platform {
  font-size: 12px;
  color: var(--text-secondary);
}

.project-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  line-height: 1.5;
}

.project-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.stat {
  font-size: 13px;
  color: var(--text-secondary);
}

.project-footer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-light);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-large {
  max-width: 700px;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-header h3 {
  font-size: 18px;
  color: var(--text);
  margin: 0;
}

.current-badge {
  padding: 4px 10px;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.switch-project-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid var(--primary);
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  color: var(--text);
}

.modal-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 表单 */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 6px;
}

.input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
}

.textarea {
  min-height: 80px;
  resize: vertical;
}

/* 按钮 */
.btn {
  padding: 10px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  background: var(--bg-lighter);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-primary {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
}

.btn-danger {
  color: var(--danger);
  border-color: var(--danger);
}

.btn-danger:hover {
  background: var(--danger);
  color: white;
}

/* 详情页样式 */
.detail-section {
  margin-bottom: 24px;
}

.detail-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12px;
}

.dsn-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--bg);
  border-radius: 6px;
  margin-bottom: 12px;
}

.dsn-box code {
  flex: 1;
  font-family: monospace;
  font-size: 13px;
  color: var(--primary);
}

.code-block {
  padding: 12px;
  background: var(--bg);
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary);
  overflow-x: auto;
  white-space: pre;
}

.stats-row {
  display: flex;
  gap: 20px;
}

.stat-item {
  flex: 1;
  text-align: center;
  padding: 16px;
  background: var(--bg);
  border-radius: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.members-list {
  margin-bottom: 12px;
}

.member-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: var(--bg);
  border-radius: 6px;
  margin-bottom: 8px;
}

.member-name {
  font-weight: 500;
  color: var(--text);
}

.member-email {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 8px;
}

.member-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-role {
  font-size: 12px;
  color: var(--text-secondary);
}

.empty-members {
  text-align: center;
  padding: 20px;
  color: var(--text-secondary);
  font-size: 14px;
}

.add-member {
  display: flex;
  gap: 8px;
}

.add-member .input {
  flex: 1;
}

.danger-zone {
  padding: 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid var(--danger);
  border-radius: 8px;
}

.danger-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
}
</style>
