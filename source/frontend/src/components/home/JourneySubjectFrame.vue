<script setup>
import { ref } from 'vue'

defineProps({
  asset: { type: Object, required: true },
  tone: { type: String, required: true, validator: (value) => ['teacher', 'student'].includes(value) }
})

const imageFailed = ref(false)
</script>

<template>
  <div
    class="journey-subject"
    :class="[`journey-subject--${tone}`, { 'journey-subject--fallback': imageFailed }]"
  >
    <img
      v-if="!imageFailed"
      class="journey-subject__atmosphere"
      :src="asset.src"
      alt=""
      aria-hidden="true"
      @error="imageFailed = true"
    >
    <img
      v-if="!imageFailed"
      class="journey-subject__subject"
      :src="asset.src"
      :width="asset.width"
      :height="asset.height"
      :alt="asset.alt"
      loading="lazy"
      @error="imageFailed = true"
    >
  </div>
</template>

<style scoped>
.journey-subject { position: absolute; inset: 0; overflow: hidden; background: #17231f; }
.journey-subject::after { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, rgb(9 21 17 / 24%), transparent 54%); pointer-events: none; }
.journey-subject__atmosphere { position: absolute; inset: -5%; width: 110%; height: 110%; object-fit: cover; filter: blur(1.3rem) saturate(.72) brightness(.64); opacity: .76; transform: scale(1.06); }
.journey-subject__subject { position: absolute; inset: 1% 0 13%; width: 100%; height: 86%; object-fit: cover; object-position: center; --journey-shift: 0px; filter: drop-shadow(0 1.2rem 1.8rem rgb(4 12 9 / 28%)); -webkit-mask-image: linear-gradient(to bottom, transparent 20%, #000 42%, #000 92%, transparent 100%); mask-image: linear-gradient(to bottom, transparent 20%, #000 42%, #000 92%, transparent 100%); transition: transform var(--duration-slow) var(--ease-out); }
.journey-subject--student { background: #16352f; }
/* 教师图向左移、学生图向右移，让两个人物在分隔线两侧背靠背 */
.journey-subject--teacher .journey-subject__subject { object-position: right center; --journey-shift: 100px; transform: translateY(var(--journey-shift)); }
.journey-subject--student .journey-subject__subject { object-position: left center; }
.journey-subject--fallback::before { content: ''; position: absolute; inset: 11% 18%; border: 1px solid rgb(213 166 79 / 18%); border-radius: 50%; box-shadow: 0 0 5rem rgb(66 185 154 / 14%); }
@media (prefers-reduced-motion: reduce) { .journey-subject__subject { transition: none; } }
</style>
