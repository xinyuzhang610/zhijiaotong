<script setup>
import RevealSection from '../motion/RevealSection.vue'
import BrandMark from '../brand/BrandMark.vue'
import EntryLink from './EntryLink.vue'
import callBg from '../../assets/generated/4.png'
</script>

<template>
  <RevealSection class="call" data-narrative-section data-testid="final-section">
    <img class="call__bg" :src="callBg" alt="" />
    <div class="call__veil" />
    <div class="call__inner">
      <div class="call__core">
        <BrandMark />
      </div>
      <p class="call__kicker">知识不应停在答案里</p>
      <h2>从今天的问题出发<br>长成明天的学习路径</h2>
      <p class="call__promise">教师更从容地组织教学，学生更主动地理解世界。每一次真实提问，都值得被看见、被连接、被继续。</p>
      <div class="call__actions">
        <EntryLink role="teacher" label="以教师身份开始" to="/login?role=teacher" />
        <EntryLink role="student" label="以学生身份探索" to="/student/guidance" />
      </div>
    </div>
  </RevealSection>
</template>

<style scoped>
.call { position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: clamp(4rem, 10vw, 8rem) 0; background: #0a1410; color: var(--moon-50); text-align: center; }
.call__bg { position: absolute; inset: 0; z-index: 0; width: 100%; height: 100%; object-fit: cover; filter: hue-rotate(-20deg) saturate(.7) brightness(.85); }
.call__veil { position: absolute; inset: 0; z-index: 0; background: rgb(35 130 100 / 12%); pointer-events: none; }
.call__inner { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; }
.call__core { position: relative; z-index: 2; margin-bottom: 1.5rem; background: radial-gradient(circle, rgb(213 166 79 / 8%) 0%, transparent 70%); padding: 2rem 3rem; border-radius: 50%; transform: scale(1.15); }
.call :deep(.brand-mark) { color: var(--moon-50); gap: .5rem !important; }
.call__kicker { margin-top: -1.5rem; font-family: 'Ma Shan Zheng', cursive; font-size: 1.35rem; letter-spacing: .1em; background: linear-gradient(135deg, #e8d8a0 0%, #f0e0b0 30%, #c8a860 70%, #e0d090 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; filter: drop-shadow(0 0 6px rgb(0 0 0 / 50%)); }
h2 { margin-top: 1.2rem; font-family: var(--font-title); font-size: clamp(2.2rem, 4vw, 4.2rem); font-weight: 500; line-height: 1.15; }
@media (hover: hover) { h2 { transition: transform .3s var(--ease-out); cursor: default; } h2:hover { transform: scale(1.04); } }
.call__promise { max-width: 42rem; margin-top: 2rem; font-family: 'Ma Shan Zheng', cursive; font-size: 1.35rem; letter-spacing: .1em; background: linear-gradient(135deg, var(--gold-200) 0%, var(--gold-400) 40%, var(--gold-600) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.call__actions { display: flex; flex-wrap: wrap; justify-content: center; gap: .75rem; margin-top: 2.5rem; }
</style>
