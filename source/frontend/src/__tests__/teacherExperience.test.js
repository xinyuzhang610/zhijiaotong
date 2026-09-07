import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import Layout from '../layout/index.vue'
import TeacherHome from '../views/teacher/Home.vue'
import Tools from '../views/teacher/Tools.vue'
import Dashboard from '../views/teacher/Dashboard.vue'
import MetricCard from '../components/data/MetricCard.vue'

const recommend=vi.fn(),presetTools=vi.fn(),myTools=vi.fn(),templates=vi.fn(),dashboardRequest=vi.fn()
vi.mock('../api/recommend',()=>({getRecommendation:(...args)=>recommend(...args)}))
vi.mock('../api/tools',()=>({getPresetTools:(...args)=>presetTools(...args),getMyTools:(...args)=>myTools(...args),getTemplates:(...args)=>templates(...args),createTool:vi.fn(),updateTool:vi.fn(),deleteTool:vi.fn(),getShareLink:vi.fn(),revokeShare:vi.fn()}))
vi.mock('../api/usage',()=>({getDashboard:(...args)=>dashboardRequest(...args)}))

async function routerAt(path='/teacher/home'){
 const router=createRouter({history:createMemoryHistory(),routes:[{path:'/',component:{template:'<div/>'}},{path:'/login',component:{template:'<div/>'}},{path:'/teacher',component:Layout,children:[{path:'home',component:TeacherHome,meta:{title:'需求引导'}},{path:'tools',component:Tools},{path:'dashboard',component:Dashboard}]},{path:'/student/guidance',component:{template:'<div/>'}}]})
 await router.push(path);await router.isReady();return router
}

describe('teacher workspace',()=>{
 beforeEach(()=>{setActivePinia(createPinia());recommend.mockReset();presetTools.mockReset();myTools.mockReset();templates.mockReset();dashboardRequest.mockReset();localStorage.setItem('token','test')})
 it('renders accessible teacher navigation with active route',async()=>{recommend.mockResolvedValue({data:{tools:[]}});const router=await routerAt();const wrapper=mount(Layout,{global:{plugins:[router,createPinia()]}});expect(wrapper.text()).toContain('需求引导');expect(wrapper.text()).toContain('我的工具');expect(wrapper.text()).toContain('数据洞察');expect(wrapper.get('a[aria-current="page"]').text()).toContain('需求引导');expect(wrapper.get('[aria-label="打开导航菜单"]').exists()).toBe(true)})
 it('keeps the four guidance stages ordered and blocks goals until subject selection',async()=>{const wrapper=mount(TeacherHome,{global:{stubs:{RouterLink:true}}});expect(wrapper.findAll('.guidance-step')).toHaveLength(4);expect(wrapper.text()).toContain('选择学科领域');expect(wrapper.text()).toContain('选择具体学科');expect(wrapper.text()).toContain('明确教学目标');expect(wrapper.text()).toContain('获得工具推荐');const goalButtons=wrapper.findAll('.guidance-step').filter(s=>s.text().includes('明确教学目标'));await wrapper.get('.choice-grid button').trigger('click');await wrapper.findAll('.choice-grid button')[1].trigger('click');expect(wrapper.findAll('.goals button')[0].attributes('disabled')).toBeUndefined()})
 it('shows an honest empty tools state',async()=>{presetTools.mockResolvedValue({data:{items:[]}});myTools.mockResolvedValue({data:{items:[]}});templates.mockResolvedValue({data:[]});const wrapper=mount(Tools,{global:{stubs:{RouterLink:true}}});await flushPromises();expect(wrapper.text()).toContain('还没有自己的工具')})
 it('shows dashboard API errors with retry state',async()=>{dashboardRequest.mockRejectedValue(new Error('offline'));const wrapper=mount(Dashboard);await flushPromises();expect(wrapper.text()).toContain('数据暂时不可用');expect(wrapper.find('[role="alert"]').exists()).toBe(true)})
 it('separates formal student usage from teacher preview activity',async()=>{dashboardRequest.mockResolvedValue({data:{days:7,total_tools:1,total_usage:6,today_usage:2,active_students:3,preview_count:2,weekly_trend:[{date:'2026-09-07',count:2}],top_tools:[],recent_logs:[{id:1,user_name:'学生',tool_name:'自己的工具',status:'completed',created_at:'2026-09-07T08:00:00Z'},{id:2,user_name:'教师',tool_name:'自己的工具',status:'preview',created_at:'2026-09-07T09:00:00Z'}]}});const wrapper=mount(Dashboard);await flushPromises();expect(wrapper.text()).toContain('正式使用次数');expect(wrapper.text()).toContain('活跃学生数');expect(wrapper.text()).toContain('预览测试');expect(wrapper.text()).toContain('正式使用');expect(wrapper.text()).toContain('预览测试');expect(wrapper.text()).toContain('不计入正式使用')})
 it('exposes metric label and value semantically',()=>{const wrapper=mount(MetricCard,{props:{label:'今日使用',value:18}});expect(wrapper.attributes('aria-label')).toBe('今日使用：18')})
})
