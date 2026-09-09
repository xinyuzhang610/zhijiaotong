import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import Home from '../views/Home.vue'

const EmptyView = { template: '<div />' }

async function mountHome() {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })))

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Home },
      { path: '/login', component: EmptyView },
      { path: '/student/guidance', component: EmptyView },
      { path: '/feature/discover', component: EmptyView },
      { path: '/feature/agent', component: EmptyView },
      { path: '/feature/resource', component: EmptyView },
      { path: '/feature/analysis', component: EmptyView },
      { path: '/teacher/tools', component: EmptyView },
      { path: '/teacher/dashboard', component: EmptyView },
      { path: '/student/plaza', component: EmptyView },
      { path: '/student/chat', component: EmptyView },
      { path: '/student/records', component: EmptyView },
      { path: '/teacher/home', component: EmptyView }
    ]
  })

  await router.push('/')
  await router.isReady()
  return mount(Home, { global: { plugins: [router] } })
}

describe('Home.vue', () => {
  it('renders the canonical story as six narrative sections', async () => {
    const wrapper = await mountHome()

    expect(wrapper.get('h1').text()).toContain('让每一次提问，照亮学习路径')
    expect(wrapper.text()).toContain('发现需求')
    expect(wrapper.text()).toContain('工具广场')
    expect(wrapper.findAll('[data-narrative-section]')).toHaveLength(6)
  })

  it('offers valid teacher and student entry routes without router warnings', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const wrapper = await mountHome()

    expect(wrapper.get('[data-testid="teacher-entry"]').attributes('href')).toBe('/login?role=teacher')
    expect(wrapper.get('[data-testid="student-entry"]').attributes('href')).toBe('/student/guidance')
    expect(wrapper.findAll('.entry-link')).toHaveLength(4)
    expect(wrapper.findAll('.entry-link__glyph')).toHaveLength(0)
    expect(wrapper.text()).not.toContain('→')
    expect(warn.mock.calls.flat().join(' ')).not.toMatch(/router-link|No match found/i)
    warn.mockRestore()
  })

  it('keeps the problem heading in two intentional semantic lines', async () => {
    const wrapper = await mountHome()
    const lines = wrapper.findAll('[data-testid="pain-heading-line"]')

    expect(lines).toHaveLength(2)
    expect(lines.map((line) => line.text())).toEqual([
      '问题不在工具多少',
      '而在知识尚未成路'
    ])
  })

  it('renders both journey illustrations in crop-safe subject frames', async () => {
    const wrapper = await mountHome()

    expect(wrapper.findAll('.journey-subject')).toHaveLength(2)
    expect(wrapper.findAll('.journey-subject__atmosphere')).toHaveLength(2)
    expect(wrapper.findAll('.journey-subject__subject')).toHaveLength(2)
  })

  it('provides a progressive hero reveal with a static reduced-motion state', async () => {
    const wrapper = await mountHome()

    expect(wrapper.get('[data-testid="hero-reveal-canvas"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="hero-scratch-reveal"]').attributes('data-static')).toBe('true')
    expect(wrapper.find('.hero__reveal-hint').exists()).toBe(false)
  })

  it('keeps the generated landscape beneath the temporary reveal and content', async () => {
    const wrapper = await mountHome()
    const hero = wrapper.get('[data-testid="hero-section"]')
    const children = [...hero.element.children]
    const artIndex = children.findIndex((node) => node.classList.contains('hero__art'))
    const revealIndex = children.findIndex((node) => (
      node.matches('[data-testid="hero-scratch-reveal"]')
    ))
    const contentIndex = children.findIndex((node) => node.classList.contains('hero__content'))

    expect(artIndex).toBeLessThan(revealIndex)
    expect(revealIndex).toBeLessThan(contentIndex)
    expect(hero.get('.hero__art').attributes('data-reveal-target')).toBe('generated-landscape')
    expect(hero.get('[data-testid="hero-background-image"]').attributes('src')).toContain('hero-ink-landscape')
  })

  it('keeps a clean hero surface when the background image cannot load', async () => {
    const wrapper = await mountHome()
    await wrapper.get('[data-testid="hero-background-image"]').trigger('error')

    expect(wrapper.find('[data-testid="hero-background-image"]').exists()).toBe(false)
    expect(wrapper.get('.hero__art').classes()).toContain('hero__art--fallback')
    expect(wrapper.get('[data-testid="teacher-entry"]').exists()).toBe(true)
  })
})
