<script setup>
import { computed, onMounted, ref } from 'vue'
import { getMyUsage, getStudentStats } from '../../api/usage'
import StatusState from '../../components/ui/StatusState.vue'
import MarkdownText from '../../components/ui/MarkdownText.vue'
import VintageRibbonTitle from '../../components/vintage/VintageRibbonTitle.vue'
import VintageDivider from '../../components/vintage/VintageDivider.vue'
import VintageOrnament from '../../components/vintage/VintageOrnament.vue'
import { useDemoMode } from '../../composables/useDemoMode'

const logs = ref([]), stats = ref(null), loading = ref(true), error = ref(''), selected = ref(null)
const { enabled: demoEnabled, getDemoData } = useDemoMode()
const uniqueTools = computed(() => new Set(logs.value.map(item => item.tool_id)).size)
const activeDays = computed(() => new Set(logs.value.map(item => item.created_at?.slice(0, 10)).filter(Boolean)).size)
const formatTime = value => value ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '时间未知'
// 列表预览只取纯文本前段，细节在弹窗中以 Markdown 渲染。
const excerpt = value => String(value || '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*#_>`~]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80)
async function load() {
  loading.value = true; error.value = ''
  try {
    if (demoEnabled.value) {
      logs.value = getDemoData('studentHistory')
      stats.value = { total_interactions: logs.value.length, distinct_tools: new Set(logs.value.map(item => item.tool_id)).size, consecutive_days: new Set(logs.value.map(item => item.created_at?.slice(0, 10))).size }
      return
    }
    const [{ data: usage }, { data: studentStats }] = await Promise.all([getMyUsage(1, 100), getStudentStats()])
    logs.value = usage?.items || []
    stats.value = studentStats
  } catch (cause) { error.value = cause?.response?.data?.detail || '学习记录暂时无法读取。' }
  finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <main class="records-page vintage-theme">
    <header class="page-hero">
      <VintageOrnament name="swallow" />
      <VintageRibbonTitle label="LEARNING CONSTELLATION" />
      <h1>学习轨迹</h1>
      <p>这里仅呈现真实记录，不会补造尚未发生的学习数据。</p>
      <VintageDivider />
    </header>

    <StatusState v-if="loading" type="loading" title="正在汇集学习轨迹" />
    <StatusState v-else-if="error" type="error" title="轨迹读取失败" :description="error" @retry="load" />

    <template v-else>
      <section class="metrics" aria-label="学习记录指标">
        <article aria-label="使用次数">
          <span>使用次数</span>
          <strong>{{ stats?.total_interactions ?? logs.length }}</strong>
        </article>
        <article aria-label="使用工具数">
          <span>使用工具数</span>
          <strong>{{ stats?.distinct_tools ?? uniqueTools }}</strong>
        </article>
        <article aria-label="活跃学习日">
          <span>连续学习日</span>
          <strong>{{ stats?.consecutive_days ?? activeDays }}</strong>
        </article>
      </section>

      <StatusState v-if="!logs.length" title="还没有学习记录" description="第一次使用工具后，真实轨迹会出现在这里。" />

      <section v-else class="timeline" aria-labelledby="timeline-title">
        <h2 id="timeline-title">最近学习片段</h2>
        <ol>
          <li v-for="log in logs" :key="log.id">
            <time :datetime="log.created_at">{{ formatTime(log.created_at) }}</time>
              <button type="button" class="record-button" @click="selected = log">
                <span>工具 #{{ log.tool_id }}</span>
                <h3>{{ log.input_text || '未记录输入内容' }}</h3>
                <p v-if="log.output_text">{{ excerpt(log.output_text) }}</p>
                <strong>查看完整问答 →</strong>
              </button>
          </li>
        </ol>
      </section>
    </template>
    <div v-if="selected" class="record-modal" role="dialog" aria-modal="true" @click.self="selected = null">
      <section>
        <button class="modal-close" type="button" aria-label="关闭" @click="selected = null">×</button>
        <span>学习记录详情</span>
        <h2>{{ selected.input_text || '未记录输入内容' }}</h2>
        <p class="modal-meta">{{ formatTime(selected.created_at) }} · 工具 #{{ selected.tool_id }}</p>
        <div class="modal-copy"><h3>AI 输出</h3><MarkdownText v-if="selected.output_text" :content="selected.output_text" /><p v-else>没有保存输出内容。</p></div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.records-page.vintage-theme {
  min-height: 100%;
  padding: clamp(28px, 5vw, 58px) clamp(20px, 4vw, 48px) 80px;
  background:
    radial-gradient(circle at 70% 15%, rgba(184, 161, 110, 0.07), transparent 30%),
    radial-gradient(circle at 20% 90%, rgba(138, 154, 140, 0.05), transparent 28%),
    #f5f1e8;
  color: #4a4333;
}

.records-page.vintage-theme::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.03;
  background-image:
    radial-gradient(circle at 25% 25%, #6b5d3e 1px, transparent 1px),
    radial-gradient(circle at 75% 75%, #6b5d3e 1px, transparent 1px);
  background-size: 80px 80px;
  z-index: 0;
}

/* Hero */
.page-hero {
  position: relative;
  z-index: 1;
  max-width: 800px;
  margin: 0 auto 1.5rem;
  text-align: center;
}

.page-hero .vintage-ornament {
  margin-bottom: 0.5rem;
}

.page-hero h1 {
  margin: 0.75rem 0;
  font: 500 clamp(2.4rem, 5vw, 4.2rem)/1.1 var(--font-display);
  color: #3d3526;
}

.page-hero > p {
  max-width: 580px;
  margin: 0 auto;
  color: #6b5d3e;
  line-height: 1.75;
}

.page-hero .vintage-divider {
  margin-top: 1.25rem;
}

/* 指标卡片 */
.metrics {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 0 0 32px;
}

.metrics article {
  padding: 28px 24px;
  border: 1px solid rgba(196, 180, 154, 0.35);
  border-radius: 2px;
  background: rgba(250, 248, 242, 0.6);
  box-shadow: 0 4px 18px rgba(107, 93, 62, 0.05);
  position: relative;
}

.metrics article::before {
  content: '';
  position: absolute;
  inset: 4px;
  border: 1px dashed rgba(139, 111, 71, 0.15);
  pointer-events: none;
  border-radius: 1px;
}

.metrics span, .metrics strong {
  display: block;
}

.metrics span {
  color: #6b5d3e;
  font-size: 0.78rem;
  font-family: var(--font-display);
  letter-spacing: 0.04em;
}

.metrics strong {
  margin-top: 8px;
  color: #8b6f47;
  font: 500 2.7rem var(--font-display);
}

/* 时间线 */
.timeline {
  position: relative;
  z-index: 1;
  max-width: 920px;
  padding: clamp(22px, 4vw, 42px);
  border: 1px solid rgba(196, 180, 154, 0.35);
  border-radius: 2px;
  background: rgba(250, 248, 242, 0.55);
  box-shadow: 0 4px 18px rgba(107, 93, 62, 0.05);
}

.timeline::before {
  content: '';
  position: absolute;
  inset: 5px;
  border: 1px dashed rgba(139, 111, 71, 0.12);
  pointer-events: none;
  border-radius: 1px;
}

.timeline h2 {
  margin: 0 0 28px;
  font: 500 1.6rem var(--font-display);
  color: #3d3526;
}

.timeline ol {
  list-style: none;
  padding: 0;
  margin: 0;
}

.timeline li {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 24px;
  padding: 22px 0;
  border-top: 1px solid rgba(196, 180, 154, 0.25);
}

.timeline time {
  color: #8b7e60;
  font-size: 0.76rem;
  font-family: var(--font-display);
}

.timeline li span {
  color: #8a9a8c;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  font-family: var(--font-display);
}

.timeline h3 {
  margin: 5px 0;
  font: 500 1rem var(--font-display);
  color: #4a4333;
}

.timeline li p {
  display: -webkit-box;
  overflow: hidden;
  color: #6b5d3e;
  line-height: 1.6;
  font-size: 0.88rem;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

@media (max-width: 640px) {
  .records-page { padding: 24px 16px 60px; }
  .metrics { grid-template-columns: 1fr; }
  .timeline li { grid-template-columns: 1fr; gap: 8px; }
}

.record-button {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.record-button strong {
  display: block;
  margin-top: 9px;
  color: #8b6f47;
  font-size: 0.75rem;
}

.record-modal {
  position: fixed;
  z-index: 30;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(4, 10, 8, 0.76);
  backdrop-filter: blur(12px);
}

.record-modal section {
  position: relative;
  width: min(100%, 720px);
  max-height: 80vh;
  overflow: auto;
  padding: 32px;
  border: 1px solid #b8a16e;
  border-radius: 2px;
  background: #faf8f2;
  color: #4a4333;
}

.record-modal section > span { color: #8b6f47; font-size: 0.72rem; letter-spacing: 0.14em; }
.record-modal h2 { margin: 12px 0; font: 500 1.6rem var(--font-display); }
.modal-meta { color: #8b7e60; font-size: 0.8rem; }
.modal-copy { margin-top: 24px; padding-top: 18px; border-top: 1px solid rgba(196, 180, 154, 0.4); }
.modal-copy h3 { color: #6e7d70; }
.modal-copy p { white-space: pre-wrap; color: #6b5d3e; line-height: 1.8; }
.modal-close { position: absolute; right: 14px; top: 8px; border: 0; background: transparent; color: #6b5d3e; font-size: 2rem; cursor: pointer; }
</style>
