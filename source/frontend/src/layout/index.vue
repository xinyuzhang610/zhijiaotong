<template>
  <div class="workspace">
    <button v-if="mobileOpen" class="drawer-backdrop" aria-label="关闭导航" @click="mobileOpen=false"></button>
    <aside class="sidebar" :class="{ 'is-open': mobileOpen }">
      <RouterLink class="brand-link" to="/"><BrandMark /></RouterLink>
      <nav :aria-label="role === 'teacher' ? '教师工作台导航' : role === 'admin' ? '管理员后台导航' : '学生学习导航'">
        <RouterLink v-for="item in navItems" :key="item.to" :to="item.to" :aria-current="route.path===item.to?'page':undefined" @click="mobileOpen=false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="item.icon"/></svg><span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="sidebar-footer"><RouterLink to="/">返回首页</RouterLink><button @click="logout">退出登录</button></div>
    </aside>
    <div class="workspace-body">
      <header class="workspace-header">
        <div><button class="mobile-menu" aria-label="打开导航菜单" @click="mobileOpen=true"><span></span><span></span></button></div>
        <div class="page-context"><span>{{ role==='teacher'?'TEACHER ORBIT':role==='admin'?'ADMIN CONTROL':'STUDENT ORBIT' }}</span><strong>{{ route.meta.title || '智教通' }}</strong><em v-if="demoEnabled">{{ demoLabel }}</em></div>
        <div class="profile"><span>{{ initials }}</span><div><small>{{ role==='teacher'?'教师':role==='admin'?'管理员':'学生' }}</small><strong>{{ userName }}</strong></div></div>
      </header>
      <main class="workspace-main"><RouterView /></main>
    </div>
  </div>
</template>
<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import BrandMark from '../components/brand/BrandMark.vue'
import { useDemoMode } from '../composables/useDemoMode'
const route=useRoute(),router=useRouter(),store=useUserStore()
const mobileOpen=ref(false)
const { enabled: demoEnabled, label: demoLabel }=useDemoMode()
const role=computed(()=>route.path.startsWith('/student')?'student':route.path.startsWith('/admin')?'admin':'teacher')
const userName=computed(()=>store.userName||localStorage.getItem('userName')||(role.value==='teacher'?'教师用户':role.value==='admin'?'管理员':'探索者'))
const initials=computed(()=>userName.value.slice(0,1))
const teacherNav=[
 {to:'/teacher/home',label:'需求引导',icon:'M4 19V5h16v14H4Zm4-9h8M8 14h5'},
 {to:'/teacher/tools',label:'我的工具',icon:'M14 6 18 2l4 4-4 4M3 21l8-8m2-7 5 5M5 3l4 4'},
 {to:'/teacher/dashboard',label:'数据洞察',icon:'M4 20V10m6 10V4m6 16v-7m4 7H2'}]
const studentNav=[
 {to:'/student/guidance',label:'兴趣引导',icon:'M12 3a7 7 0 0 0-4 12v3h8v-3a7 7 0 0 0-4-12Z'},
 {to:'/student/plaza',label:'工具广场',icon:'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z'},
 {to:'/student/chat',label:'AI 问答',icon:'M4 5h16v11H8l-4 4V5Z'},
 {to:'/student/records',label:'学习轨迹',icon:'M5 19V5m0 14h15M8 15l3-4 3 2 5-7'}]
const adminNav=[
 {to:'/admin',label:'运营后台',icon:'M4 5h16v14H4zM8 9h8M8 13h5'},
 {to:'/teacher/tools',label:'工具总览',icon:'M14 6 18 2l4 4-4 4M3 21l8-8m2-7 5 5M5 3l4 4'},
]
const navItems=computed(()=>role.value==='teacher'?teacherNav:role.value==='admin'?adminNav:studentNav)
function logout(){store.logout();router.push('/login')}
function onKey(e){if(e.key==='Escape')mobileOpen.value=false}
onMounted(()=>document.addEventListener('keydown',onKey));onBeforeUnmount(()=>document.removeEventListener('keydown',onKey))
</script>
<style scoped>
.workspace {
  display: grid;
  grid-template-columns: 260px 1fr;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f1e8 0%, #ece5d7 100%);
  color: #4a4333;
}

.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 24px 16px;
  border-right: 2px solid #c4b49a;
  background:
    linear-gradient(180deg, #faf7f0 0%, #f2ede2 50%, #ede6d8 100%);
  box-shadow: 2px 0 20px rgba(107, 93, 62, 0.08), inset -4px 0 8px rgba(107, 93, 62, 0.03);
  z-index: 20;
  transition: width var(--duration-normal);
  font-family: var(--font-display);
}

.sidebar::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg,
    transparent 0%,
    rgba(184, 161, 110, 0.3) 20%,
    rgba(184, 161, 110, 0.3) 80%,
    transparent 100%);
  pointer-events: none;
}

.brand-link {
  display: block;
  padding: 4px 8px 28px;
  text-decoration: none;
  color: #4a4333;
  position: relative;
}

.brand-link::after {
  content: '';
  display: block;
  margin-top: 20px;
  height: 1px;
  background: linear-gradient(90deg, transparent, #c4b49a 20%, #c4b49a 80%, transparent);
  opacity: 0.6;
}

.sidebar nav {
  display: grid;
  gap: 6px;
}

.sidebar nav a,
.sidebar-footer a,
.sidebar-footer button {
  display: flex;
  align-items: center;
  gap: 13px;
  min-height: 48px;
  padding: 0 13px;
  border: 1px solid transparent;
  border-radius: 2px;
  background: transparent;
  color: #6b5d3e;
  text-decoration: none;
  font: inherit;
  font-size: 0.92rem;
  letter-spacing: 0.03em;
  transition: background var(--duration-fast), color var(--duration-fast), border-color var(--duration-fast), transform var(--duration-fast);
  position: relative;
}

.sidebar nav a::before {
  content: '';
  position: absolute;
  inset: 2px;
  border: 1px dashed transparent;
  border-radius: 2px;
  transition: border-color var(--duration-fast);
  pointer-events: none;
}

.sidebar nav a svg {
  width: 21px;
  flex-shrink: 0;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sidebar nav a:hover {
  color: #4a4333;
  background: rgba(184, 161, 110, 0.1);
  border-color: rgba(184, 161, 110, 0.3);
  transform: translateX(2px);
}

.sidebar nav a:hover::before {
  border-color: rgba(139, 111, 71, 0.18);
}

.sidebar nav a[aria-current="page"] {
  color: #5c4f34;
  background: rgba(184, 161, 110, 0.18);
  border-color: rgba(184, 161, 110, 0.5);
  box-shadow: 0 2px 12px rgba(107, 93, 62, 0.1);
  font-weight: 600;
}

.sidebar nav a[aria-current="page"]::before {
  border-color: rgba(139, 111, 71, 0.3);
}

.sidebar nav a[aria-current="page"] svg {
  color: #8b6f47;
}

.sidebar-footer {
  display: grid;
  gap: 4px;
  margin-top: auto;
  padding-top: 16px;
  border-top: 1px solid rgba(196, 180, 154, 0.4);
}

.sidebar-footer a:hover,
.sidebar-footer button:hover {
  color: #4a4333;
  background: rgba(184, 161, 110, 0.1);
  border-color: rgba(184, 161, 110, 0.25);
}

.sidebar-footer button {
  width: 100%;
  cursor: pointer;
}

.workspace-body {
  min-width: 0;
}

.workspace-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  min-height: 76px;
  padding: 0 28px;
  border-bottom: 2px solid rgba(196, 180, 154, 0.35);
  background: rgba(250, 248, 242, 0.88);
  backdrop-filter: blur(18px) saturate(130%);
  box-shadow: 0 2px 16px rgba(107, 93, 62, 0.04);
}

.workspace-header > div:first-child {
  display: flex;
  gap: 8px;
}

.mobile-menu {
  display: grid;
  place-items: center;
  min-width: 44px;
  min-height: 44px;
  border: 1px solid rgba(196, 180, 154, 0.4);
  border-radius: 2px;
  background: rgba(250, 248, 242, 0.6);
  color: #8b6f47;
  cursor: pointer;
  font-family: var(--font-display);
  font-size: 1rem;
  transition: background var(--duration-fast), color var(--duration-fast), border-color var(--duration-fast);
}

.mobile-menu:hover {
  background: rgba(250, 248, 242, 0.95);
  color: #4a4333;
  border-color: rgba(184, 161, 110, 0.5);
}

.mobile-menu {
  display: none;
}

.mobile-menu span {
  display: block;
  width: 18px;
  height: 1px;
  background: currentColor;
  margin: 2px;
}

.page-context {
  text-align: center;
}

.page-context span,
.profile small {
  display: block;
  color: #8b6f47;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  font-family: var(--font-display);
}

.page-context strong {
  display: block;
  margin-top: 4px;
  color: #3d3526;
  font-size: 1.15rem;
  font-weight: 600;
  font-family: var(--font-display);
}

.page-context em {
  display: inline-block;
  margin-top: 5px;
  padding: 2px 8px;
  border: 1px solid rgba(184, 161, 110, 0.5);
  border-radius: 2px;
  color: #8b6f47;
  font-size: 0.65rem;
  font-style: normal;
  letter-spacing: 0.08em;
  background: rgba(196, 180, 154, 0.12);
}

.profile {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-self: end;
}

.profile > span {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c5d1d4, #8a9a8c);
  color: #faf8f2;
  font-weight: 700;
  font-family: var(--font-display);
  font-size: 1.1rem;
  border: 2px solid rgba(184, 161, 110, 0.3);
}

.profile strong {
  display: block;
  color: #3d3526;
  font-weight: 600;
  font-size: 0.95rem;
}

.profile small {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
}

.drawer-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 15;
  background: rgba(61, 53, 38, 0.25);
  border: 0;
  cursor: pointer;
}

@media (max-width: 900px) {
  .workspace {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: fixed;
    left: 0;
    transform: translateX(-100%);
    width: 260px;
    transition: transform var(--duration-normal);
  }
  .sidebar.is-open {
    transform: translateX(0);
  }
  .mobile-menu {
    display: grid;
  }
  .drawer-backdrop {
    display: block;
  }
  .workspace-header {
    grid-template-columns: auto 1fr auto;
    padding: 0 16px;
  }
  .page-context {
    text-align: left;
    padding-left: 12px;
  }
}
</style>
