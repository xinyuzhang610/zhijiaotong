<script setup>
import { ref } from 'vue'
import BrandMark from '../brand/BrandMark.vue'
import InkLandscape from '../brand/InkLandscape.vue'
import KnowledgeCore from '../brand/KnowledgeCore.vue'
import EntryLink from './EntryLink.vue'
import HeroScratchReveal from './HeroScratchReveal.vue'
import { generatedAssets } from '../../assets/generated/asset-manifest'

const animationSkipped = ref(false)
const hasRevealed = ref(false)
const heroArtFailed = ref(false)
const revealUnavailable = ref(false)
</script>

<template>
  <section class="hero" :class="{ 'hero--still': animationSkipped }" data-narrative-section data-testid="hero-section">
    <div
      class="hero__art"
      data-reveal-target="generated-landscape"
      :class="{ 'hero__art--fallback': heroArtFailed }"
    >
      <img
        v-if="!heroArtFailed"
        data-testid="hero-background-image"
        :src="generatedAssets.heroInkLandscape.src"
        :width="generatedAssets.heroInkLandscape.width"
        :height="generatedAssets.heroInkLandscape.height"
        :alt="generatedAssets.heroInkLandscape.alt"
        fetchpriority="high"
        @error="heroArtFailed = true"
      >
      <InkLandscape :parallax="!animationSkipped" class="hero__ink" />
      <KnowledgeCore class="hero__core" />
    </div>
    <div class="hero__veil" />
    <HeroScratchReveal
      :skipped="animationSkipped"
      @first-reveal="hasRevealed = true"
      @static-mode="revealUnavailable = true"
    />
    <div class="hero__content page-container">
      <p class="hero__eyebrow">知识觉醒 · 智能教育同行者</p>
      <h1>让每一次提问，<br><em>照亮学习路径</em></h1>
      <p class="hero__lead">从发现需求，到每个学生清晰可见的成长轨迹。智教通让工具、资源与洞察围绕学习发生。</p>
      <div class="hero__actions" aria-label="选择进入方式">
        <EntryLink role="teacher" label="教师入口" to="/login?role=teacher" test-id="teacher-entry" />
        <EntryLink role="student" label="学生入口" to="/student/guidance" test-id="student-entry" />
      </div>
      <p v-if="!hasRevealed && !animationSkipped && !revealUnavailable" class="hero__reveal-hint" aria-hidden="true">
        移动光标，唤醒画卷
      </p>
      <button class="hero__skip" type="button" @click="animationSkipped = true">
        {{ animationSkipped ? '动态已跳过' : '跳过动态' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.hero { position: relative; min-height: 100svh; overflow: hidden; isolation: isolate; background: #0a1a18; color: var(--moon-50); }
.hero__art { position: absolute; z-index: 0; inset: 0; min-height: 46rem; }
.hero__art--fallback { background: radial-gradient(ellipse 55% 45% at 55% 50%, rgb(20 160 140 / 60%), rgb(20 160 140 / 15%) 65%, transparent), radial-gradient(circle at 76% 42%, rgb(80 200 180 / 10%), transparent 28%), linear-gradient(135deg, #051210, #0e2420); }
.hero__art > img { width: 100%; height: 100%; object-fit: cover; opacity: .96; filter: saturate(1.06) contrast(1.05) brightness(1.04); }
.hero__veil { position: absolute; z-index: 1; inset: 0; background: radial-gradient(ellipse 80% 70% at 50% 50%, rgb(40 200 180 / 55%), transparent 80%); mix-blend-mode: screen; pointer-events: none; }
.hero__ink { position: absolute; inset: auto 0 0; min-height: 36%; opacity: .2; mix-blend-mode: screen; }
.hero__core { position: absolute; z-index: 1; top: 50%; right: clamp(-8rem, 3vw, 4rem); width: min(49vw, 42rem); transform: translateY(-50%); opacity: .75; }
.hero__content { position: relative; z-index: 2; display: flex; min-height: 100svh; flex-direction: column; justify-content: flex-start; align-items: flex-start; padding: 13rem 0 3rem; pointer-events: none; }
.hero__actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: auto; }
.hero__reveal-hint { margin-top: .75rem; color: rgb(248 250 245 / 56%); font-size: .72rem; letter-spacing: .18em; }
.hero__skip { min-height: 2.75rem; margin-top: .5rem; padding: .25rem .75rem; background: transparent; color: rgb(248 250 245 / 68%); text-decoration: underline; text-underline-offset: .25rem; }
@media (hover: hover) { .hero__skip { transition: transform .3s var(--ease-out), color .3s; } .hero__skip:hover { transform: scale(1.08); color: var(--moon-50); } }
.hero__lead { max-width: 36rem; margin-top: 2rem; color: rgb(248 250 245 / 80%); font-family: 'Ma Shan Zheng', cursive; font-size: clamp(1.1rem, 1.6vw, 1.35rem); }
.hero__content :is(a, button, h1, p) { pointer-events: auto; }
.hero__eyebrow { margin-bottom: 1.5rem; font-family: 'Ma Shan Zheng', cursive; font-size: 1.55rem; letter-spacing: .1em; background: linear-gradient(135deg, var(--gold-200) 0%, var(--gold-400) 40%, var(--gold-600) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; text-shadow: 0 0 40px rgb(213 166 79 / 30%); }
h1 { max-width: 9.5em; font-family: var(--font-title); font-size: clamp(2.4rem, 5.5vw, 4.8rem); font-weight: 600; letter-spacing: -.04em; line-height: 1.08; text-wrap: balance; }
@media (hover: hover) { h1 { transition: transform .4s var(--ease-out), text-shadow .4s; cursor: default; } h1:hover { transform: scale(1.05); text-shadow: 0 0 40px rgb(255 255 255 / 15%); } }
h1 em { color: var(--jade-200); font-style: normal; }
.hero--still .hero__core { display: none; }
@media (max-width: 700px) { .hero__veil { background: radial-gradient(ellipse 120% 80% at 50% 50%, rgb(20 170 150 / 30%), rgb(20 170 150 / 30%) 70%, transparent 100%); } .hero__core { top: 28%; right: -6rem; width: 22rem; } .hero__content { justify-content: flex-end; } }
@media (prefers-reduced-motion: reduce) { .hero__core { display: none; } }
</style>
