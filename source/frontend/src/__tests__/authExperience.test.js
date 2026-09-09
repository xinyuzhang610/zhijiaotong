import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import IdentitySwitch from '../components/auth/IdentitySwitch.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'

const loginRequest = vi.fn()
const registerRequest = vi.fn()
vi.mock('../api/auth', () => ({ login: (...args) => loginRequest(...args), register: (...args) => registerRequest(...args) }))

// Mock TurnstileWidget to bypass captcha in tests
vi.mock('../components/auth/TurnstileWidget.vue', () => ({
  default: {
    template: '<div class="turnstile-widget-mock" />',
    setup(_, { emit }) {
      // Emit verify with a mock token immediately
      emit('verify', 'mock-captcha-token')
      return {}
    }
  }
}))

// Set environment variable for Turnstile
vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'test-site-key')

function makeRouter(start = '/login?role=teacher') {
  const router = createRouter({ history:createMemoryHistory(), routes:[
    { path:'/', component:{ template:'<div />' } }, { path:'/login', component:Login }, { path:'/register', component:Register },
    { path:'/teacher/home', component:{ template:'<div>teacher</div>' } }, { path:'/student/guidance', component:{ template:'<div>student</div>' } }
  ] })
  return router.push(start).then(() => router.isReady()).then(() => router)
}

describe('authentication experience', () => {
  beforeEach(() => { loginRequest.mockReset(); registerRequest.mockReset(); localStorage.clear(); setActivePinia(createPinia()) })
  beforeEach(() => { vi.stubEnv('VITE_DEMO_MODE', 'false') })

  it('uses accessible native identity controls and emits role changes', async () => {
    const wrapper = mount(IdentitySwitch, { props:{ modelValue:'teacher' } })
    const radios = wrapper.findAll('input[type="radio"]')
    expect(radios).toHaveLength(3)
    expect(radios[0].attributes('checked')).toBeDefined()
    await radios[1].setValue(true)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['student'])
  })

  it('preselects teacher from the query and submits to the real auth adapter', async () => {
    const router = await makeRouter('/login?role=teacher')
    loginRequest.mockResolvedValue({ data:{ access_token:'real-token', user:{ name:'林老师', role:'teacher' } } })
    const wrapper = mount(Login, { global:{ plugins:[router, createPinia()] } })
    await flushPromises()
    expect(wrapper.get('input[value="teacher"]').element.checked).toBe(true)
    expect(wrapper.get('label[for="login-username"]').text()).toBe('用户名')
    await wrapper.get('#login-username').setValue('teacher01')
    await wrapper.get('#login-password').setValue('secure12')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(loginRequest).toHaveBeenCalledWith({ username:'teacher01', password:'secure12', expected_role:'teacher', captcha_token: 'mock-captcha-token' })
    expect(router.currentRoute.value.path).toBe('/teacher/home')
    expect(localStorage.getItem('token')).toBe('real-token')
  })

  it('requires students to authenticate before entering guidance', async () => {
    const router = await makeRouter('/login?role=student')
    loginRequest.mockResolvedValue({ data:{ access_token:'student-token', user:{ name:'小林', role:'student' } } })
    const wrapper = mount(Login, { global:{ plugins:[router, createPinia()] } })
    await flushPromises()
    expect(wrapper.get('input[value="student"]').element.checked).toBe(true)
    await wrapper.get('#login-username').setValue('student01')
    await wrapper.get('#login-password').setValue('secure12')
    await flushPromises()
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/student/guidance')
    expect(localStorage.getItem('token')).toBe('student-token')
  })

  it('shows demo shortcuts only in demo mode and enters without credentials', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    const router = await makeRouter('/login?role=teacher')
    const wrapper = mount(Login, { global: { plugins: [router, createPinia()] } })
    await flushPromises()

    expect(wrapper.findAll('[data-testid^="demo-"]')).toHaveLength(2)
    await wrapper.get('[data-testid="demo-student"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/student/guidance')
    expect(localStorage.getItem('token')).toBe('demo-token')
    expect(localStorage.getItem('userRole')).toBe('student')
    expect(localStorage.getItem('userName')).toBe('演示学生')
  })

  it('keeps registration labels visible and reports mismatched passwords', async () => {
    const router = await makeRouter('/register?role=teacher')
    const wrapper = mount(Register, { global:{ plugins:[router] } })
    expect(wrapper.get('label[for="register-confirm"]').text()).toBe('确认密码')
    await wrapper.get('#register-password').setValue('secret1')
    await wrapper.get('#register-confirm').setValue('secret2')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[role="alert"]').text()).toContain('不一致')
    expect(registerRequest).not.toHaveBeenCalled()
  })
})
