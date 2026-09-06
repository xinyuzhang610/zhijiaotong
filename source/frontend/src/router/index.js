import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false, title: '登录' }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { requiresAuth: false, title: '注册' }
  },
  {
    path: '/feature/discover',
    name: 'FeatureDiscover',
    component: () => import('../views/feature/Discover.vue'),
    meta: { requiresAuth: false, title: '需求发现' }
  },
  {
    path: '/feature/agent',
    name: 'FeatureAgent',
    component: () => import('../views/feature/Agent.vue'),
    meta: { requiresAuth: false, title: '智能体工具' }
  },
  {
    path: '/feature/resource',
    name: 'FeatureResource',
    component: () => import('../views/feature/Resource.vue'),
    meta: { requiresAuth: false, title: '资源广场' }
  },
  {
    path: '/feature/path',
    name: 'FeaturePath',
    component: () => import('../views/feature/Path.vue'),
    meta: { requiresAuth: false, title: '学习路径' }
  },
  {
    path: '/feature/analysis',
    name: 'FeatureAnalysis',
    component: () => import('../views/feature/Analysis.vue'),
    meta: { requiresAuth: false, title: '数据分析' }
  },
  {
    path: '/tutorial/guide',
    name: 'TutorialGuide',
    component: () => import('../views/tutorial/Guide.vue'),
    meta: { requiresAuth: false, title: '使用指南' }
  },
  {
    path: '/tutorial/share',
    name: 'TutorialShare',
    component: () => import('../views/tutorial/Share.vue'),
    meta: { requiresAuth: false, title: '分享工具' }
  },
  {
    path: '/teacher',
    component: () => import('../layout/index.vue'),
    meta: { requiresAuth: true, role: 'teacher' },
    children: [
      { path: '', redirect: '/teacher/home' },
      { path: 'home', name: 'TeacherHome', component: () => import('../views/teacher/Home.vue'), meta: { title: '需求引导' } },
      { path: 'tools', name: 'TeacherTools', component: () => import('../views/teacher/Tools.vue'), meta: { title: '我的工具' } },
      { path: 'dashboard', name: 'TeacherDashboard', component: () => import('../views/teacher/Dashboard.vue'), meta: { title: '数据看板' } }
    ]
  },
  {
    path: '/student',
    component: () => import('../layout/index.vue'),
    meta: { requiresAuth: true, role: 'student' },
    children: [
      { path: '', redirect: '/student/guidance' },
      // The plaza is a public catalogue. AI use, favorites, and records still
      // pass through their own authenticated routes/APIs.
      { path: 'plaza', name: 'StudentPlaza', component: () => import('../views/student/Plaza.vue'), meta: { requiresAuth: false, title: '工具广场' } },
      { path: 'chat', name: 'StudentChat', component: () => import('../views/student/Chat.vue'), meta: { title: 'AI 问答' } },
      { path: 'records', name: 'StudentRecords', component: () => import('../views/student/Records.vue'), meta: { title: '学习记录' } },
      { path: 'guidance', name: 'StudentGuidance', component: () => import('../views/student/Guidance.vue'), meta: { title: '兴趣引导' } }
    ]
  },
  {
    path: '/admin',
    component: () => import('../layout/index.vue'),
    meta: { requiresAuth: true, role: 'admin' },
    children: [
      { path: '', name: 'AdminHome', component: () => import('../views/admin/Admin.vue'), meta: { title: '运营后台' } },
    ],
  },
  {
    path: '/tool/:id',
    name: 'ToolUse',
    component: () => import('../views/student/ToolUse.vue'),
    meta: { requiresAuth: true, title: '使用工具' }
  },
  {
    path: '/share/:shareCode',
    name: 'SharedTool',
    component: () => import('../views/student/ToolUse.vue'),
    meta: { requiresAuth: false, title: '分享工具' }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue'),
    meta: { requiresAuth: false, title: '智教通' }
  },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  const requiredRole = to.matched.map(record => record.meta.role).find(Boolean)
  if (to.meta.requiresAuth && !token) {
    const query = { redirect: to.fullPath }
    if (requiredRole === 'teacher' || requiredRole === 'student') query.role = requiredRole
    return { path: '/login', query }
  }
  const currentRole = localStorage.getItem('userRole')
  if (requiredRole && currentRole && currentRole !== requiredRole && currentRole !== 'admin') {
    return currentRole === 'student' ? '/student/guidance' : '/teacher/home'
  }
  if (to.path === '/login' && token) {
    const role = localStorage.getItem('userRole')
    return role === 'student' ? '/student/guidance' : role === 'admin' ? '/admin' : '/teacher/home'
  }
  return true
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · 智教通` : '智教通'
})

export default router
