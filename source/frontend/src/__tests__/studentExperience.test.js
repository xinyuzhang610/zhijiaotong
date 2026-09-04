import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import Guidance from '../views/student/Guidance.vue'
import Plaza from '../views/student/Plaza.vue'
import Chat from '../views/student/Chat.vue'
import Records from '../views/student/Records.vue'
import ToolUse from '../views/student/ToolUse.vue'

const plazaRequest = vi.fn()
const listFavoritesRequest = vi.fn()
const streamRequest = vi.fn()
const toolRequest = vi.fn()
const usageRequest = vi.fn()
const statsRequest = vi.fn()
const sessionListRequest = vi.fn()
const sessionMessageRequest = vi.fn()

vi.mock('../api/plaza', () => ({ getPlaza: (...args) => plazaRequest(...args) }))
vi.mock('../api/recommend', () => ({ getRecommendation: vi.fn() }))
vi.mock('../api/favorites', () => ({ listFavorites: (...args) => listFavoritesRequest(...args), addFavorite: vi.fn(), removeFavorite: vi.fn() }))
vi.mock('../api/chat', () => ({
  streamChat: (...args) => streamRequest(...args),
  listSessions: (...args) => sessionListRequest(...args),
  getSessionMessages: (...args) => sessionMessageRequest(...args),
  deleteSession: vi.fn(),
}))
vi.mock('../api/tools', () => ({ getTool: (...args) => toolRequest(...args), getSharedTool: vi.fn() }))
vi.mock('../api/usage', () => ({ getMyUsage: (...args) => usageRequest(...args), getStudentStats: (...args) => statsRequest(...args) }))

async function mountAt(component, path) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/student/:page', component: { template: '<div />' } },
      { path: '/tool/:id', component }
    ]
  })
  await router.push(path)
  await router.isReady()
  return mount(component, { global: { plugins: [router], stubs: { RouterLink: false } } })
}

describe('student knowledge journey', () => {
  beforeEach(() => {
    plazaRequest.mockReset()
    listFavoritesRequest.mockReset()
    streamRequest.mockReset()
    toolRequest.mockReset()
    usageRequest.mockReset()
    statsRequest.mockReset()
    sessionListRequest.mockReset()
    sessionMessageRequest.mockReset()
    sessionListRequest.mockResolvedValue({ data: [] })
    sessionMessageRequest.mockResolvedValue({ data: { messages: [] } })
    statsRequest.mockResolvedValue({ data: { total_interactions: 0, distinct_tools: 0, consecutive_days: 0 } })
    localStorage.clear()
    vi.stubEnv('VITE_DEMO_MODE', 'false')
  })

  it('offers exactly three accessible interest layers with live progress', async () => {
    const wrapper = await mountAt(Guidance, '/student/guidance')
    expect(wrapper.findAll('[data-interest-layer]')).toHaveLength(3)
    expect(wrapper.get('[role="status"]').text()).toContain('第 1 层，共 3 层')
    const first = wrapper.get('button[aria-pressed]')
    await first.trigger('click')
    expect(first.attributes('aria-pressed')).toBe('true')
  })

  it('loads plaza data and sends category and search controls to the API', async () => {
    plazaRequest.mockResolvedValue({ data: { categories: [{ value: '理科', label: '理科专区' }], tools: [], hot_tools: [] } })
    const wrapper = await mountAt(Plaza, '/student/plaza')
    await flushPromises()
    await wrapper.get('[aria-label="搜索工具"] input').setValue('公式')
    await wrapper.get('[aria-label="理科专区"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    expect(plazaRequest).toHaveBeenLastCalledWith({ category: '理科', search: '公式', sort: 'hot' })
  })

  it('keeps complete hot tool cards local in demo mode without calling favorites API', async () => {
    vi.stubEnv('VITE_DEMO_MODE', 'true')
    localStorage.setItem('token', 'demo-token')
    localStorage.setItem('userRole', 'student')
    const wrapper = await mountAt(Plaza, '/student/plaza')
    await flushPromises()

    expect(wrapper.get('.hot-section').text()).toContain('古诗词趣味赏析')
    expect(wrapper.get('.hot-section').text()).toContain('公式推导助手')
    expect(wrapper.text()).not.toContain('undefined')
    expect(listFavoritesRequest).not.toHaveBeenCalled()
  })

  it('keeps chat input after a failed request and exposes retry', async () => {
    streamRequest.mockRejectedValue(new Error('timeout'))
    const wrapper = await mountAt(Chat, '/student/chat')
    await wrapper.get('textarea').setValue('请解释勾股定理')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('textarea').element.value).toBe('请解释勾股定理')
    expect(wrapper.get('[data-testid="retry-message"]').exists()).toBe(true)
  })

  it('derives labeled record metrics from the real usage response', async () => {
    usageRequest.mockResolvedValue({ data: { items: [{ id: 1, tool_id: 7, input_text: '勾股定理', output_text: '回答', created_at: '2026-07-14T08:00:00Z' }] } })
    const wrapper = await mountAt(Records, '/student/records')
    await flushPromises()
    expect(wrapper.text()).toContain('使用次数')
    expect(wrapper.text()).toContain('使用工具数')
    expect(wrapper.text()).toContain('1')
    expect(usageRequest).toHaveBeenCalledWith(1, 100)
    expect(statsRequest).toHaveBeenCalledWith()
  })

  it('loads the route tool and sends its numeric ID with chat', async () => {
    localStorage.setItem('token', 'student-session')
    toolRequest.mockResolvedValue({ data: { id: 42, name: '概念辨析器', description: '厘清易混概念', category: '理科', usage_count: 3 } })
    streamRequest.mockResolvedValue(undefined)
    const wrapper = await mountAt(ToolUse, '/tool/42')
    await flushPromises()
    expect(toolRequest).toHaveBeenCalledWith('42')
    expect(wrapper.text()).toContain('工具编号 42')
    await wrapper.get('textarea').setValue('质量和重量')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(streamRequest).toHaveBeenCalledWith(expect.objectContaining({ message: '质量和重量', tool_id: 42, usage_mode: 'student_use' }), expect.any(Object))
  })
})
