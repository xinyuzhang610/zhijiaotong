import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MarkdownText from '../components/ui/MarkdownText.vue'

describe('MarkdownText', () => {
  it('renders headings, bold, code and lists', () => {
    const wrapper = mount(MarkdownText, {
      props: { content: '# 标题\n\n**加粗** 与 `代码`\n\n1. 第一项\n2. 第二项' }
    })
    expect(wrapper.find('h1').text()).toBe('标题')
    expect(wrapper.find('strong').text()).toBe('加粗')
    expect(wrapper.findAll('li')).toHaveLength(2)
  })

  it('escapes raw html instead of injecting it', () => {
    const wrapper = mount(MarkdownText, {
      props: { content: '<script>alert(1)</script>\n\n**safe**' }
    })
    expect(wrapper.html()).not.toContain('<script>')
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.text()).toContain('safe')
  })

  it('tolerates incomplete markdown while streaming', () => {
    const wrapper = mount(MarkdownText, {
      props: { content: '## 标题\n\n- 半截' }
    })
    expect(wrapper.find('h2').text()).toBe('标题')
    expect(wrapper.find('li').text()).toBe('半截')
  })

  it('renders bracket and dollar latex formulas with katex', () => {
    const wrapper = mount(MarkdownText, {
      props: {
        content: '二次函数一般式：\n\n\\[ y = ax^2 + bx + c \\]\n\n或顶点式：\\( y = a(x-h)^2 + k \\)\n\n\\[ \\boxed{a>0 \\Rightarrow \\text{开口向上}} \\]'
      }
    })
    expect(wrapper.find('.katex').exists()).toBe(true)
    expect(wrapper.html()).not.toContain('\\[')
  })

  it('renders dollar blocks even when the model nests stray $ inside them', () => {
    const content = '设：\n\n$$\nx_1 = $\\frac{-b + \\sqrt{\\Delta}}{2a}, \\quad\nx_2 = \\frac{-b - \\sqrt{\\Delta}}{2a}\n$$\n\n注意到分子中，$\\sqrt{\\Delta}$ 相互抵消：'
    const wrapper = mount(MarkdownText, { props: { content } })
    expect(wrapper.find('.katex').exists()).toBe(true)
    expect(wrapper.html()).not.toContain('$$')
  })

  it('keeps incomplete latex delimiters from leaking while streaming', () => {
    const wrapper = mount(MarkdownText, {
      props: { content: '开口方向看 \\(a\\)：……未完 \\[ y = ' }
    })
    expect(wrapper.html()).not.toContain('$$')
  })
})
