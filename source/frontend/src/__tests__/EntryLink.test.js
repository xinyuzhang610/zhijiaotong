import { describe, expect, it } from 'vitest'
import { mount, RouterLinkStub } from '@vue/test-utils'
import EntryLink from '../components/home/EntryLink.vue'
import entryLinkSource from '../components/home/EntryLink.vue?raw'

describe('EntryLink', () => {
  it('renders the teacher entry as a semantic router link without a text arrow', () => {
    const wrapper = mount(EntryLink, {
      props: {
        role: 'teacher',
        label: '教师入口',
        to: '/login?role=teacher'
      },
      global: { stubs: { RouterLink: RouterLinkStub } }
    })

    expect(wrapper.text()).toBe('教师入口')
    expect(wrapper.text()).not.toContain('→')
    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/login?role=teacher')
    expect(wrapper.find('.entry-link__glyph').exists()).toBe(false)
  })

  it('renders the student treatment with one inner frame', () => {
    const wrapper = mount(EntryLink, {
      props: {
        role: 'student',
        label: '学生入口',
        to: '/student/guidance'
      },
      global: { stubs: { RouterLink: RouterLinkStub } }
    })

    expect(wrapper.classes()).toContain('entry-link--student')
    expect(wrapper.findAll('.entry-link__frame')).toHaveLength(1)
  })

  it('uses medium, spaced body typography', () => {
    expect(entryLinkSource).toMatch(/font-weight:\s*500;/)
    expect(entryLinkSource).toMatch(/letter-spacing:\s*\.08em;/)
  })
})
