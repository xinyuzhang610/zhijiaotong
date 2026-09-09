<template>
  <main class="auth-page">
    <AuthScene :role="selectedRole" mode="login" />
    <section class="auth-panel" aria-labelledby="login-title">
      <div class="auth-panel__inner">
        <RouterLink class="home-link" to="/">← 返回首页</RouterLink>
        <div class="auth-heading"><span>WELCOME BACK</span><h1 id="login-title">进入智教通</h1><p>选择身份，继续你的智慧教学旅程。</p></div>
        <IdentitySwitch v-model="selectedRole" />

        <form class="auth-form" @submit.prevent="handleLogin">
          <div class="field"><label for="login-username">用户名</label><input id="login-username" v-model.trim="form.username" autocomplete="username" minlength="3" required placeholder="请输入用户名"></div>
          <div class="field"><label for="login-password">密码</label><input id="login-password" v-model="form.password" autocomplete="current-password" minlength="6" required type="password" placeholder="请输入密码"></div>
          <TurnstileWidget v-if="turnstileSiteKey" ref="turnstileRef" :site-key="turnstileSiteKey" action="login" @verify="onCaptchaVerify" @expire="onCaptchaExpire" @error="onCaptchaError" />
          <p v-else class="form-hint">开发环境：验证码已跳过</p>
          <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
          <AppButton class="submit-button" type="submit" :variant="selectedRole === 'teacher' ? 'gold' : 'jade'" :loading="loading">登录{{ selectedRole === 'teacher' ? '教师工作台' : selectedRole === 'admin' ? '运营后台' : '学生学习空间' }}</AppButton>
          <p v-if="selectedRole !== 'admin'" class="auth-footnote">还没有账号？<RouterLink :to="`/register?role=${selectedRole}`">创建{{ selectedRole === 'teacher' ? '教师' : '学生' }}账号</RouterLink></p>
        </form>

        <section v-if="isDemoMode" class="demo-entry" aria-labelledby="demo-entry-title">
          <div class="demo-entry__heading">
            <span>DEFENSE DEMO</span>
            <h2 id="demo-entry-title">答辩演示入口</h2>
            <p>无需输入账号密码，直接查看两类工作空间。</p>
          </div>
          <div class="demo-entry__options">
            <button
              v-for="entry in demoEntries"
              :key="entry.role"
              class="demo-entry__option"
              :class="`is-${entry.role}`"
              type="button"
              :data-testid="`demo-${entry.role}`"
              @click="enterDemo(entry.role)"
            >
              <span class="demo-entry__icon" aria-hidden="true">
                <svg v-if="entry.role === 'teacher'" viewBox="0 0 24 24"><path d="m4 7 8-4 8 4-8 4-8-4Zm3 2.4V15c0 1.7 2.2 3 5 3s5-1.3 5-3V9.4M20 10v6" /></svg>
                <svg v-else viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" /><path d="M5.5 20c.4-3.8 2.5-6 6.5-6s6.1 2.2 6.5 6M4 8h2m12 0h2" /></svg>
              </span>
              <span class="demo-entry__copy"><strong>{{ entry.title }}</strong><small>{{ entry.description }}</small></span>
              <span class="demo-entry__arrow" aria-hidden="true">↗</span>
            </button>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup>
import { reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { login as loginRequest } from '../api/auth'
import AuthScene from '../components/auth/AuthScene.vue'
import IdentitySwitch from '../components/auth/IdentitySwitch.vue'
import AppButton from '../components/ui/AppButton.vue'
import TurnstileWidget from '../components/auth/TurnstileWidget.vue'
import { useDemoMode } from '../composables/useDemoMode'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const selectedRole = ref(route.query.role === 'student' ? 'student' : route.query.role === 'admin' ? 'admin' : 'teacher')
const loading = ref(false)
const errorMessage = ref('')
const form = reactive({ username: '', password: '' })
const captchaToken = ref(null)
const turnstileRef = ref(null)

const turnstileSiteKey = import.meta.env?.VITE_TURNSTILE_SITE_KEY || ''
const { enabled: demoEnabled } = useDemoMode()
const isDemoMode = demoEnabled.value
const demoEntries = [
  { role: 'teacher', title: '体验教师端 Demo', description: '需求发现 · 工具管理 · 数据洞察' },
  { role: 'student', title: '体验学生端 Demo', description: '兴趣引导 · 工具广场 · AI 学习' }
]

// 未配置 Turnstile 或演示模式下自动跳过验证码
if (!turnstileSiteKey || isDemoMode) {
  captchaToken.value = 'dev-bypass'
}

watch(selectedRole, () => { errorMessage.value = '' })

function onCaptchaVerify(token) { captchaToken.value = token }
function onCaptchaExpire() { captchaToken.value = null }
function onCaptchaError() { captchaToken.value = null }

async function handleLogin() {
  if (!captchaToken.value) {
    errorMessage.value = '请完成验证码验证'
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    // 演示模式下模拟登录，无需后端
    if (isDemoMode) {
      userStore.login({
        access_token: 'demo-token',
        user: { name: form.username || '演示用户', role: selectedRole.value }
      })
      const fallback = selectedRole.value === 'student' ? '/student/guidance' : '/teacher/home'
      await router.push(route.query.redirect || fallback)
      return
    }
    const response = await loginRequest({ username: form.username, password: form.password, expected_role: selectedRole.value, captcha_token: captchaToken.value })
    const payload = response.data
    userStore.login(payload)
    const fallback = payload.user?.role === 'student' ? '/student/guidance' : payload.user?.role === 'admin' ? '/admin' : '/teacher/home'
    await router.push(route.query.redirect || fallback)
  } catch (error) {
    errorMessage.value = error.response?.data?.detail || '暂时无法登录，请检查网络或稍后重试。'
    if (turnstileRef.value) turnstileRef.value.reset()
    captchaToken.value = null
  } finally {
    loading.value = false
  }
}

async function enterDemo(role) {
  if (!isDemoMode) return
  selectedRole.value = role
  userStore.login({
    access_token: 'demo-token',
    user: { name: role === 'student' ? '演示学生' : '演示教师', role }
  })
  await router.push(role === 'student' ? '/student/guidance' : '/teacher/home')
}

</script>

<style scoped>
.auth-page{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(420px,.85fr);min-height:100vh;background:var(--ink-950);color:var(--moon-50)}.auth-panel{display:grid;place-items:center;padding:clamp(28px,5vw,72px);background:radial-gradient(circle at 90% 10%,var(--effect-jade-soft),transparent 35%),var(--ink-900)}.auth-panel__inner{width:min(100%,520px)}.home-link{display:inline-block;margin-bottom:clamp(28px,6vh,68px);color:var(--moon-300);text-decoration:none}.auth-heading>span{color:var(--gold-300);font-size:.7rem;letter-spacing:.24em}.auth-heading h1{margin:10px 0;font-family:var(--font-display);font-size:clamp(2.4rem,4vw,4.5rem);font-weight:500}.auth-heading p{margin-bottom:28px;color:var(--moon-300);line-height:1.7}.auth-form{display:grid;gap:18px;margin-top:24px}.field{display:grid;gap:8px}.field label{color:var(--moon-200);font-size:.86rem}.field input{width:100%;min-height:50px;padding:0 16px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:rgba(255,255,255,.045);color:var(--moon-50);font:inherit}.field input:focus-visible{outline:3px solid var(--focus-ring);outline-offset:2px}.form-error{padding:11px 13px;border-left:3px solid var(--cinnabar-500);background:rgba(168,58,46,.12);color:#ffd8d2;line-height:1.5}.form-hint{padding:8px 0;color:var(--ink-300);font-size:.85rem;text-align:center}.submit-button{width:100%}.auth-footnote{text-align:center;color:var(--moon-300);font-size:.9rem}.auth-footnote a{color:var(--gold-300)}

.demo-entry{position:relative;margin-top:28px;padding:20px;border:1px solid rgb(213 166 79 / 28%);border-radius:var(--radius-xl);background:linear-gradient(145deg,rgb(255 255 255 / 6%),rgb(66 185 154 / 5%));overflow:hidden}.demo-entry::before{position:absolute;inset:4px;pointer-events:none;content:'';border:1px dashed rgb(213 166 79 / 20%)}.demo-entry__heading,.demo-entry__options{position:relative;z-index:1}.demo-entry__heading>span{color:var(--gold-300);font-size:.64rem;letter-spacing:.2em}.demo-entry__heading h2{margin:5px 0 3px;color:var(--moon-50);font-family:var(--font-display);font-size:1.25rem;font-weight:500}.demo-entry__heading p{color:var(--moon-300);font-size:.78rem;line-height:1.6}.demo-entry__options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:15px}.demo-entry__option{display:grid;grid-template-columns:auto 1fr auto;min-height:70px;align-items:center;gap:10px;padding:10px;border:1px solid rgb(169 221 206 / 25%);border-radius:var(--radius-md);background:rgb(16 25 22 / 24%);color:var(--moon-50);text-align:left;cursor:pointer;transition:transform var(--duration-fast),border-color var(--duration-fast),background var(--duration-fast)}.demo-entry__option:hover{transform:translateY(-2px);border-color:var(--gold-400);background:rgb(23 107 90 / 18%)}.demo-entry__option:focus-visible{outline:3px solid var(--gold-300);outline-offset:3px}.demo-entry__icon{display:grid;width:30px;height:30px;place-items:center;border:1px solid rgb(213 166 79 / 46%);border-radius:50%;color:var(--gold-300)}.demo-entry__icon svg{width:17px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.4}.demo-entry__copy{display:grid;gap:3px;min-width:0}.demo-entry__copy strong{font-size:.82rem;font-weight:600}.demo-entry__copy small{overflow:hidden;color:var(--moon-300);font-size:.65rem;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}.demo-entry__arrow{align-self:start;color:var(--gold-300);font-size:1rem}@media(max-width:880px){.auth-page{grid-template-columns:1fr}.auth-panel{padding:36px 22px 60px}.home-link{margin-bottom:32px}}@media(max-width:560px){.demo-entry__options{grid-template-columns:1fr}}@media(prefers-reduced-motion:reduce){.demo-entry__option{transition:none}.demo-entry__option:hover{transform:none}}
</style>
