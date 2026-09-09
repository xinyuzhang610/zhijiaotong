<script setup>
import RevealSection from '../motion/RevealSection.vue'
import JourneySubjectFrame from './JourneySubjectFrame.vue'
import { generatedAssets } from '../../assets/generated/asset-manifest'

const teacherSteps = [
  { label: '登录', to: '/login?role=teacher' },
  { label: '需求引导', to: '/teacher/home' },
  { label: '工具管理', to: '/teacher/tools' },
  { label: '数据洞察', to: '/teacher/dashboard' }
]
const studentSteps = [
  { label: '兴趣引导', to: '/student/guidance' },
  { label: '工具广场', to: '/student/plaza' },
  { label: 'AI问答', to: '/student/chat' },
  { label: '学习轨迹', to: '/student/records' }
]
</script>

<template>
  <RevealSection class="journey" data-narrative-section data-testid="journey-section">
    <div class="journey__split">
      <article class="journey__path journey__path--teacher">
        <JourneySubjectFrame :asset="generatedAssets.teacherOrbit" tone="teacher" />
        <div class="journey__content"><span class="journey__role">教师端</span><h3>把教学意图，编排成可执行的课堂</h3><ol><li v-for="step in teacherSteps" :key="step.label"><RouterLink :to="step.to">{{ step.label }}</RouterLink></li></ol></div>
      </article>
      <article class="journey__path journey__path--student">
        <JourneySubjectFrame :asset="generatedAssets.studentOrbit" tone="student" />
        <div class="journey__content"><span class="journey__role">学生端</span><h3>从兴趣出发，让每一次探索留下轨迹</h3><ol><li v-for="step in studentSteps" :key="step.label"><RouterLink :to="step.to">{{ step.label }}</RouterLink></li></ol></div>
      </article>
    </div>
    <header class="journey__title"><p>03 / 双向同行</p><h2>同一片知识星图，<br>两条彼此照应的路</h2></header>
  </RevealSection>
</template>

<style scoped>
.journey { position: relative; min-height: 100svh; background: var(--ink-950); }
.journey__title { position: absolute; z-index: 3; top: 1.5rem; left: max(1rem, calc((100% - 1200px) / 2 + 1rem)); text-align: left; color: var(--moon-50); max-width: 50rem; }
.journey__title p { font-family: 'Ma Shan Zheng', cursive; font-size: 2.2rem; letter-spacing: .05em; background: linear-gradient(135deg, var(--gold-200) 0%, var(--gold-400) 40%, var(--gold-600) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
h2 { margin-top: .8rem; font-family: var(--font-title); font-size: clamp(2.35rem, 4vw, 4.35rem); font-weight: 500; line-height: 1.12; letter-spacing: -.035em; }
@media (hover: hover) { h2 { transition: transform .3s var(--ease-out); cursor: default; } h2:hover { transform: scale(1.04); } }
.journey__split { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); min-height: 100svh; }
.journey__path { position: relative; min-height: 100svh; overflow: hidden; color: var(--moon-50); }
.journey__path::after { content: ''; position: absolute; z-index: 1; inset: 0; background: linear-gradient(0deg, rgb(10 20 17 / 92%) 0%, rgb(10 20 17 / 35%) 50%, rgb(10 20 17 / 30%) 100%); }
.journey__content { position: absolute; z-index: 2; right: 0; bottom: 0; left: 0; padding: clamp(2rem, 4vw, 4rem); padding-left: max(1rem, calc((100vw - 1200px) / 2 + 1rem)); }
.journey__role { color: var(--gold-200); font-size: 1rem; letter-spacing: .18em; }
h3 { max-width: 13em; margin: 1rem 0 2rem; font-family: 'KaiTi', 'STKaiti', 'AR PL UKai CN', serif; font-size: clamp(1.5rem, 2.2vw, 2.4rem); font-weight: 400; line-height: 1.3; }
@media (hover: hover) { h3 { transition: transform .3s var(--ease-out); cursor: default; } h3:hover { transform: scale(1.06); } }
ol { display: flex; flex-wrap: wrap; gap: .5rem; list-style: none; counter-reset: path; }
li { counter-increment: path; }
li a { display: inline-flex; min-height: 2.75rem; align-items: center; padding: .45rem .8rem; border: 1px solid rgb(248 250 245 / 32%); border-radius: 999px; color: var(--moon-50); text-decoration: none; }
@media (hover: hover) { li a { transition: transform .3s var(--ease-out), border-color .3s, background .3s; } li a:hover { transform: scale(1.1); border-color: var(--gold-400); background: rgb(213 166 79 / 12%); } }
li a::before { content: '0' counter(path); margin-right: .45rem; color: var(--gold-200); font-size: .65rem; }
.journey__path:hover :deep(.journey-subject__subject) { transform: translateY(calc(var(--journey-shift, 0px) - .4rem)) scale(1.012); }
@media (max-width: 900px) { .journey__split { grid-template-columns: 1fr; } .journey__path { min-height: 50vh; } .journey__title { position: absolute; top: 3rem; } }
@media (prefers-reduced-motion: reduce) { .journey__path:hover :deep(.journey-subject__subject) { transform: translateY(var(--journey-shift, 0px)); } }
</style>
