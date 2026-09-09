<script setup>
import BrandMark from '../components/brand/BrandMark.vue'
import HeroSection from '../components/home/HeroSection.vue'
import PainSection from '../components/home/PainSection.vue'
import CapabilityOrbit from '../components/home/CapabilityOrbit.vue'
import DualJourney from '../components/home/DualJourney.vue'
import ProductShowcase from '../components/home/ProductShowcase.vue'
import FinalCall from '../components/home/FinalCall.vue'
</script>

<template>
  <div class="home-page visual-theme">
    <a class="skip-link" href="#home-main">跳至主要内容</a>
    <header class="site-header">
      <RouterLink to="/" aria-label="智教通首页"><BrandMark /></RouterLink>
      <nav aria-label="首页导航">
        <a href="#capabilities">核心能力</a>
        <RouterLink to="/student/plaza">工具广场</RouterLink>
        <RouterLink to="/login?role=teacher">教师登录</RouterLink>
      </nav>
    </header>
    <main id="home-main">
      <HeroSection />
      <PainSection />
      <div id="capabilities"><CapabilityOrbit /></div>
      <DualJourney />
      <ProductShowcase />
      <FinalCall />
    </main>
    <footer class="site-footer"><BrandMark /><p>让技术回到教育现场，让每条学习路径清晰可见。</p><small>© 2026 智教通</small></footer>
  </div>
</template>

<style scoped>
.home-page { min-width: 0; overflow-x: clip; background: var(--moon-50); }
.skip-link { position: fixed; z-index: 100; top: .5rem; left: .5rem; padding: .75rem 1rem; background: var(--moon-50); color: var(--ink-950); transform: translateY(-150%); }.skip-link:focus { transform: none; }
.site-header { position: absolute; z-index: 10; top: 0; right: 0; left: 0; display: flex; width: min(100% - 2rem, 1200px); min-height: 5rem; align-items: center; justify-content: space-between; margin-inline: auto; padding-top: 3.5rem; border-bottom: 1px solid rgb(248 250 245 / 18%); }
.site-header > a { color: var(--moon-50); text-decoration: none; }.site-header :deep(.brand-mark) { color: inherit; }.site-header :deep(.brand-mark__descriptor) { color: var(--moon-300); }.site-header nav { display: flex; align-items: center; gap: clamp(.5rem, 2vw, 2rem); }.site-header nav a { display: inline-flex; min-height: 2.75rem; align-items: center; color: rgb(248 250 245 / 82%); font-size: 1.25rem; font-weight: 500; letter-spacing: .04em; text-decoration: none; }
@media (hover: hover) { .site-header nav a { transition: transform .3s var(--ease-out), color .3s; } .site-header nav a:hover { transform: scale(1.08); color: var(--moon-50); } }
.site-footer { display: grid; grid-template-columns: 1fr auto auto; gap: 2rem; align-items: center; padding: 2rem max(1rem, calc((100% - 1200px) / 2)); background: #09110e; color: rgb(248 250 245 / 60%); }.site-footer :deep(.brand-mark) { color: var(--moon-50); }.site-footer p { font-size: .85rem; }
@media (max-width: 640px) { .site-header nav a:not(:last-child) { display: none; } .site-footer { grid-template-columns: 1fr; gap: 1rem; } }
</style>
