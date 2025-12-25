<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { API_BASE } from '../config';

const router = useRouter();

// 步骤：1-输入邮箱 2-输入验证码和新密码
const step = ref(1);

const email = ref('');
const code = ref('');
const newPassword = ref('');
const confirmPassword = ref('');

const loading = ref(false);
const error = ref('');
const success = ref('');

// 验证码相关
const codeSending = ref(false);
const countdown = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const canSendCode = computed(() => {
  return email.value && !codeSending.value && countdown.value === 0;
});

async function sendCode() {
  if (!canSendCode.value) return;
  
  error.value = '';
  codeSending.value = true;
  
  try {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      step.value = 2;
      startCountdown();
      success.value = data.message || '验证码已发送';
    } else {
      error.value = data.error || '发送失败';
    }
  } catch {
    error.value = '网络错误，请稍后重试';
  }
  
  codeSending.value = false;
}

function startCountdown() {
  countdown.value = 60;
  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(countdownTimer!);
      countdownTimer = null;
    }
  }, 1000);
}

async function handleReset() {
  error.value = '';
  success.value = '';
  
  if (!code.value || !newPassword.value || !confirmPassword.value) {
    error.value = '请填写所有字段';
    return;
  }
  
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致';
    return;
  }
  
  if (newPassword.value.length < 8) {
    error.value = '密码至少需要8位';
    return;
  }
  
  loading.value = true;
  
  try {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: email.value, 
        code: code.value, 
        newPassword: newPassword.value 
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      success.value = data.message || '密码重置成功';
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } else {
      error.value = data.error || '重置失败';
    }
  } catch {
    error.value = '网络错误，请稍后重试';
  }
  
  loading.value = false;
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h1 class="auth-title">🛡️ Sentinel</h1>
        <p class="auth-subtitle">重置密码</p>
      </div>

      <!-- 步骤 1: 输入邮箱 -->
      <form v-if="step === 1" @submit.prevent="sendCode" class="auth-form">
        <div class="form-group">
          <label for="email">邮箱</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="请输入注册邮箱"
            required
            autocomplete="email"
          />
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>

        <button type="submit" class="submit-btn" :disabled="codeSending || !email">
          {{ codeSending ? '发送中...' : '发送验证码' }}
        </button>
      </form>

      <!-- 步骤 2: 输入验证码和新密码 -->
      <form v-else @submit.prevent="handleReset" class="auth-form">
        <div class="step-info">
          验证码已发送至 <strong>{{ email }}</strong>
        </div>

        <div class="form-group">
          <label for="code">验证码</label>
          <div class="input-with-btn">
            <input
              id="code"
              v-model="code"
              type="text"
              placeholder="请输入6位验证码"
              required
              maxlength="6"
            />
            <button 
              type="button" 
              class="resend-btn"
              :disabled="countdown > 0"
              @click="sendCode"
            >
              {{ countdown > 0 ? `${countdown}s` : '重新发送' }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="newPassword">新密码</label>
          <input
            id="newPassword"
            v-model="newPassword"
            type="password"
            placeholder="请输入新密码（至少8位）"
            required
            autocomplete="new-password"
          />
        </div>

        <div class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            required
            autocomplete="new-password"
          />
        </div>

        <div v-if="error" class="error-message">{{ error }}</div>
        <div v-if="success" class="success-message">{{ success }}</div>

        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? '重置中...' : '重置密码' }}
        </button>
      </form>

      <div class="auth-footer">
        <p><router-link to="/login">返回登录</router-link></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: 20px;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--card-bg);
  border-radius: 16px;
  padding: 40px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.auth-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}

.auth-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.step-info {
  padding: 12px 16px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.step-info strong {
  color: var(--primary);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}

.form-group input {
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-group input::placeholder {
  color: var(--text-secondary);
}

.input-with-btn {
  display: flex;
  gap: 12px;
}

.input-with-btn input {
  flex: 1;
}

.resend-btn {
  padding: 12px 16px;
  background: transparent;
  color: var(--primary);
  border: 1px solid var(--primary);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.resend-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.1);
}

.resend-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-message {
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  color: #ef4444;
  font-size: 14px;
}

.success-message {
  padding: 12px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 8px;
  color: #10b981;
  font-size: 14px;
}

.submit-btn {
  padding: 14px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: var(--primary-dark);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.auth-footer {
  margin-top: 24px;
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
}

.auth-footer a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}

.auth-footer a:hover {
  text-decoration: underline;
}
</style>
