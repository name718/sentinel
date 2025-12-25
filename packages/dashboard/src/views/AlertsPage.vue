<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { authFetch } from '../composables/useAuth';
import { useProject } from '../composables/useProject';
import { API_BASE } from '../config';

type AlertType = 'new_error' | 'error_threshold' | 'error_spike';

interface AlertRule {
  id?: number;
  dsn: string;
  name: string;
  type: AlertType;
  enabled: boolean;
  threshold?: number;
  timeWindow?: number;
  recipients: string[];
  cooldown: number;
}

interface AlertHistory {
  id: number;
  ruleId: number;
  dsn: string;
  fingerprint?: string;
  errorMessage: string;
  recipients?: string[];
  triggeredAt: string;
  emailSent: boolean;
}

const { currentDsn } = useProject();

const rules = ref<AlertRule[]>([]);
const history = ref<AlertHistory[]>([]);
const emailStatus = ref({ configured: false, connected: false });
const loading = ref(false);
const showCreateModal = ref(false);
const testEmail = ref('');
const testEmailSending = ref(false);

// 新规则表单
const newRule = ref<AlertRule>({
  dsn: currentDsn.value,
  name: '',
  type: 'new_error',
  enabled: true,
  threshold: 10,
  timeWindow: 60,
  recipients: [],
  cooldown: 30
});
const recipientInput = ref('');

const alertTypeLabels: Record<AlertType, { label: string; desc: string }> = {
  new_error: { label: '新错误', desc: '首次出现的错误立即告警' },
  error_threshold: { label: '错误阈值', desc: '错误累计次数超过阈值时告警' },
  error_spike: { label: '错误激增', desc: '时间窗口内错误数超过阈值时告警' }
};

async function fetchEmailStatus() {
  try {
    const res = await authFetch(`${API_BASE}/alerts/email-status`);
    if (res.ok) {
      emailStatus.value = await res.json();
    } else {
      console.error('获取邮件状态失败:', res.status);
      emailStatus.value = { configured: false, connected: false };
    }
  } catch (e) {
    console.error('获取邮件状态失败:', e);
    emailStatus.value = { configured: false, connected: false };
  }
}

async function fetchRules() {
  loading.value = true;
  try {
    const res = await authFetch(`${API_BASE}/alerts/rules?dsn=${currentDsn.value}`);
    const data = await res.json();
    rules.value = data.rules || [];
  } catch (e) {
    console.error('获取告警规则失败:', e);
  }
  loading.value = false;
}

async function fetchHistory() {
  try {
    const res = await authFetch(`${API_BASE}/alerts/history?dsn=${currentDsn.value}&limit=20`);
    const data = await res.json();
    history.value = data.history || [];
  } catch (e) {
    console.error('获取告警历史失败:', e);
  }
}

async function createRule() {
  if (!newRule.value.name || newRule.value.recipients.length === 0) {
    alert('请填写规则名称和收件人');
    return;
  }

  // 确保使用当前项目的 DSN
  newRule.value.dsn = currentDsn.value;

  try {
    const res = await authFetch(`${API_BASE}/alerts/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRule.value)
    });
    if (res.ok) {
      showCreateModal.value = false;
      resetNewRule();
      fetchRules();
    } else {
      const err = await res.json();
      alert(err.error || '创建失败');
    }
  } catch (e) {
    console.error('创建规则失败:', e);
  }
}

async function toggleRule(rule: AlertRule) {
  try {
    await authFetch(`${API_BASE}/alerts/rules/${rule.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !rule.enabled })
    });
    rule.enabled = !rule.enabled;
  } catch (e) {
    console.error('更新规则失败:', e);
  }
}

async function deleteRule(id: number) {
  if (!confirm('确定删除此规则？')) return;
  try {
    await authFetch(`${API_BASE}/alerts/rules/${id}`, { method: 'DELETE' });
    fetchRules();
  } catch (e) {
    console.error('删除规则失败:', e);
  }
}

async function sendTestEmail() {
  if (!testEmail.value) {
    alert('请输入测试邮箱');
    return;
  }
  testEmailSending.value = true;
  try {
    const res = await authFetch(`${API_BASE}/alerts/test-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail.value })
    });
    const data = await res.json();
    if (res.ok) {
      alert('测试邮件已发送，请检查收件箱');
    } else {
      alert(data.error || '发送失败');
    }
  } catch (e) {
    console.error('发送测试邮件失败:', e);
  }
  testEmailSending.value = false;
}

function addRecipient() {
  const email = recipientInput.value.trim();
  if (email && !newRule.value.recipients.includes(email)) {
    newRule.value.recipients.push(email);
    recipientInput.value = '';
  }
}

function removeRecipient(email: string) {
  newRule.value.recipients = newRule.value.recipients.filter(r => r !== email);
}

function resetNewRule() {
  newRule.value = {
    dsn: currentDsn.value,
    name: '',
    type: 'new_error',
    enabled: true,
    threshold: 10,
    timeWindow: 60,
    recipients: [],
    cooldown: 30
  };
  recipientInput.value = '';
}

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleString('zh-CN');
}

// 邮箱脱敏：t***@example.com
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const masked = local.length > 1 
    ? local[0] + '***' 
    : local + '***';
  return `${masked}@${domain}`;
}

// 格式化收件人列表（脱敏）
function formatRecipients(recipients?: string[]): string {
  if (!recipients || recipients.length === 0) return '-';
  return recipients.map(maskEmail).join(', ');
}

// 监听项目切换，刷新数据
watch(currentDsn, () => {
  fetchRules();
  fetchHistory();
});

onMounted(() => {
  fetchEmailStatus();
  fetchRules();
  fetchHistory();
});
</script>

<template>
  <div class="page">
    <h1 class="page-title">🔔 告警配置</h1>

    <!-- 邮件服务状态 -->
    <div class="status-card" :class="{ connected: emailStatus.connected }">
      <div class="status-icon">{{ emailStatus.connected ? '✅' : '⚠️' }}</div>
      <div class="status-content">
        <div class="status-title">
          邮件服务状态: {{ emailStatus.configured ? (emailStatus.connected ? '已连接' : '连接失败') : '未配置' }}
        </div>
        <div class="status-desc" v-if="!emailStatus.configured">
          请在服务端 .env.local 中配置 SMTP_HOST, SMTP_USER, SMTP_PASS
        </div>
      </div>
      <div class="status-actions" v-if="emailStatus.configured">
        <input v-model="testEmail" placeholder="测试邮箱" class="input-sm" />
        <button class="btn btn-sm" @click="sendTestEmail" :disabled="testEmailSending">
          {{ testEmailSending ? '发送中...' : '发送测试' }}
        </button>
      </div>
    </div>

    <!-- 告警规则 -->
    <div class="section">
      <div class="section-header">
        <h2>告警规则</h2>
        <button class="btn btn-primary" @click="showCreateModal = true" :disabled="!emailStatus.configured">
          + 新建规则
        </button>
      </div>

      <div v-if="rules.length === 0" class="empty">
        暂无告警规则，点击上方按钮创建
      </div>

      <div v-else class="rules-list">
        <div v-for="rule in rules" :key="rule.id" class="rule-card" :class="{ disabled: !rule.enabled }">
          <div class="rule-header">
            <div class="rule-name">{{ rule.name }}</div>
            <div class="rule-type">{{ alertTypeLabels[rule.type].label }}</div>
          </div>
          <div class="rule-desc">{{ alertTypeLabels[rule.type].desc }}</div>
          <div class="rule-config">
            <span v-if="rule.threshold">阈值: {{ rule.threshold }}</span>
            <span v-if="rule.timeWindow">时间窗口: {{ rule.timeWindow }}分钟</span>
            <span>冷却: {{ rule.cooldown }}分钟</span>
          </div>
          <div class="rule-recipients">
            收件人: {{ rule.recipients.join(', ') }}
          </div>
          <div class="rule-actions">
            <button class="btn btn-sm" @click="toggleRule(rule)">
              {{ rule.enabled ? '禁用' : '启用' }}
            </button>
            <button class="btn btn-sm btn-danger" @click="deleteRule(rule.id!)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 告警历史 -->
    <div class="section">
      <div class="section-header">
        <h2>告警历史</h2>
        <button class="btn btn-sm" @click="fetchHistory">刷新</button>
      </div>

      <div v-if="history.length === 0" class="empty">
        暂无告警记录
      </div>

      <div v-else class="history-list">
        <div v-for="item in history" :key="item.id" class="history-item">
          <div class="history-icon">{{ item.emailSent ? '📧' : '❌' }}</div>
          <div class="history-content">
            <div class="history-message">{{ item.errorMessage }}</div>
            <div class="history-meta">
              <span>{{ formatTime(item.triggeredAt) }}</span>
              <span>{{ item.emailSent ? '邮件已发送' : '发送失败' }}</span>
            </div>
            <div class="history-recipients" v-if="item.recipients?.length">
              📬 {{ formatRecipients(item.recipients) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建规则弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>新建告警规则</h3>
          <button class="modal-close" @click="showCreateModal = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>规则名称</label>
            <input v-model="newRule.name" placeholder="如：生产环境错误告警" class="input" />
          </div>

          <div class="form-group">
            <label>告警类型</label>
            <select v-model="newRule.type" class="input">
              <option value="new_error">新错误 - 首次出现的错误立即告警</option>
              <option value="error_threshold">错误阈值 - 累计次数超过阈值时告警</option>
              <option value="error_spike">错误激增 - 时间窗口内错误数超过阈值</option>
            </select>
          </div>

          <div class="form-row" v-if="newRule.type !== 'new_error'">
            <div class="form-group">
              <label>阈值</label>
              <input v-model.number="newRule.threshold" type="number" class="input" />
            </div>
            <div class="form-group" v-if="newRule.type === 'error_spike'">
              <label>时间窗口（分钟）</label>
              <input v-model.number="newRule.timeWindow" type="number" class="input" />
            </div>
          </div>

          <div class="form-group">
            <label>冷却时间（分钟）</label>
            <input v-model.number="newRule.cooldown" type="number" class="input" />
            <div class="form-hint">同一错误在冷却时间内不会重复告警</div>
          </div>

          <div class="form-group">
            <label>收件人</label>
            <div class="recipient-input">
              <input 
                v-model="recipientInput" 
                placeholder="输入邮箱后按回车添加" 
                class="input"
                @keyup.enter="addRecipient"
              />
              <button class="btn btn-sm" @click="addRecipient">添加</button>
            </div>
            <div class="recipients-list">
              <span v-for="email in newRule.recipients" :key="email" class="recipient-tag">
                {{ email }}
                <button @click="removeRecipient(email)">×</button>
              </span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showCreateModal = false">取消</button>
          <button class="btn btn-primary" @click="createRule">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-title {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 24px;
  color: var(--text);
}

.status-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 24px;
}

.status-card.connected {
  border-color: #10b981;
  background: rgba(16, 185, 129, 0.05);
}

.status-icon {
  font-size: 32px;
}

.status-content {
  flex: 1;
}

.status-title {
  font-weight: 600;
  color: var(--text);
}

.status-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.status-actions {
  display: flex;
  gap: 8px;
}

.section {
  background: var(--bg-light);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: var(--text);
}

.empty {
  text-align: center;
  color: var(--text-secondary);
  padding: 40px;
}

.rules-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rule-card {
  padding: 16px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.rule-card.disabled {
  opacity: 0.5;
}

.rule-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.rule-name {
  font-weight: 600;
  color: var(--text);
}

.rule-type {
  padding: 2px 8px;
  background: var(--primary);
  color: white;
  border-radius: 4px;
  font-size: 11px;
}

.rule-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.rule-config {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.rule-recipients {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.rule-actions {
  display: flex;
  gap: 8px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--bg);
  border-radius: 6px;
}

.history-icon {
  font-size: 20px;
}

.history-content {
  flex: 1;
}

.history-message {
  font-size: 13px;
  color: var(--text);
  margin-bottom: 4px;
}

.history-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.history-recipients {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* 表单样式 */
.input, .input-sm {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
}

.input-sm {
  padding: 6px 10px;
  font-size: 13px;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
}

.btn {
  padding: 8px 16px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.btn:hover:not(:disabled) {
  background: var(--bg-lighter);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-danger {
  color: var(--danger);
  border-color: var(--danger);
}

.btn-danger:hover:not(:disabled) {
  background: var(--danger);
  color: white;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
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

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text);
}

.modal-close {
  background: none;
  border: none;
  font-size: 18px;
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

.form-group .input,
.form-group select {
  width: 100%;
}

.form-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

.recipient-input {
  display: flex;
  gap: 8px;
}

.recipient-input .input {
  flex: 1;
}

.recipients-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.recipient-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text);
}

.recipient-tag button {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  padding: 0;
  margin-left: 2px;
}

.recipient-tag button:hover {
  color: var(--danger);
}
</style>
