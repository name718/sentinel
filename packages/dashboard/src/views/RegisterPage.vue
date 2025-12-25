<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { API_BASE } from '../config';

const router = useRouter();
const { register, loading, error } = useAuth();

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const code = ref('');
const localError = ref('');

// 验证码相关
const codeSending = ref(false);
const codeSent = ref(false);
const countdown = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const canSendCode = computed(() => {
  return email.value && !codeSending.value && countdown.value === 0;
});

async function sendCode() {
  if (!canSendCode.value) return;
  
  localError.value = '';
  codeSending.value = true;
  
  try {
    const res = await fetch(`${API_BASE}/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      codeSent.value = true;
      startCountdown();
    } else {
      localError.value = data.error || '发送失败';
    }
  } catch {
    localError.value = '网络错误，请稍后重试';
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

async function handleSubmit() {
  localError.value = '';
  
  if (!name.value || !email.value || !password.value || !confirmPassword.value || !code.value) {
    localError.value = '请填写所有字段';
    return;
  }

  if (password.value !== confirmPassword.value) {
    localError.value = '两次输入的密码不一致';
    return;
  }

  if (password.value.length < 8) {
    localError.value = '密码至少需要8位';
    return;
  }
  
  const success = await register(email.value, password.value, name.value, code.value);
  if (success) {
    router.push('/');
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-card">
      <div class="auth-header">
        <h1 class="auth-title">🛡️ Sentinel</h1>
        <p class="auth-subtitle">创建新账户</p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label for="name">姓名</label>
          <input
            id="name"
            v-model="name"
            type="text"
            placeholder="请输入姓名"
            required
            autocomplete="name"
          />
        </div>

        <div class="form-group">
          <label for="email">邮箱</label>
          <div class="input-with-btn">
            <input
              id="email"
              v-model="email"
              type="email"
              placeholder="请输入邮箱"
              required
              autocomplete="email"
            />
            <button 
              type="button" 
              class="send-code-btn"
              :disabled="!canSendCode"
              @click="sendCode"
            >
              {{ codeSending ? '发送中...' : countdown > 0 ? `${countdown}s` : '获取验证码' }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="code">验证码</label>
          <input
            id="code"
            v-model="code"
            type="text"
            placeholder="请输入6位验证码"
            required
            maxlength="6"
            autocomplete="one-time-code"
          />
        </div>

        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="请输入密码（至少8位）"
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
            placeholder="请再次输入密码"
            required
            autocomplete="new-password"
          />
        </div>

        <div v-if="localError || error" class="error-message">
          {{ localError || error }}
        </div>

        <button type="submit" class="submit-btn" :disabled="loading">
          {{ loading ? '注册中...' : '注册' }}
        </button>
      </form>

      <div class="auth-footer">
        <p>已有账户？<router-link to="/login">立即登录</router-link></p>
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

.send-code-btn {
  padding: 12px 16px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, opacity 0.2s;
}

.send-code-btn:hover:not(:disabled) {
  background: var(--primary-dark);
}

.send-code-btn:disabled {
  opacity: 0.6;
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
