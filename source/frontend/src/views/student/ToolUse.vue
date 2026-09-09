<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSharedTool, getTool } from '../../api/tools'
import { streamChat } from '../../api/chat'
import StatusState from '../../components/ui/StatusState.vue'
import MarkdownText from '../../components/ui/MarkdownText.vue'
import VintageRibbonTitle from '../../components/vintage/VintageRibbonTitle.vue'
import VintageOrnament from '../../components/vintage/VintageOrnament.vue'
import VintagePostmark from '../../components/vintage/VintagePostmark.vue'
import VintageDivider from '../../components/vintage/VintageDivider.vue'
import { useDemoMode } from '../../composables/useDemoMode'

const route = useRoute(), router = useRouter(), tool = ref(null), loadingTool = ref(true), toolError = ref('')
const { enabled: demoEnabled, getDemoTool } = useDemoMode()
const input = ref(''), pending = ref(false), error = ref(''), sessionId = ref(''), failedText = ref(''), feed = ref(null), messages = ref([]), currentController = ref(null)
const copied = ref(false), shareError = ref('')
const isShared = computed(() => Boolean(route.params.shareCode))
const toolId = computed(() => Number(tool.value?.id))
const questionInput = ref(null)
const userTurns = computed(() => messages.value.filter(message => message.role === 'user').length)
const sessionLabel = computed(() => sessionId.value ? `#${sessionId.value.slice(0, 8)}` : '待建立')
function growInput(event) {
  const el = event.target
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 150) + 'px'
}
async function loadTool() { loadingTool.value = true; toolError.value = ''; try { const data = demoEnabled.value ? getDemoTool(route.params.id) : isShared.value ? (await getSharedTool(route.params.shareCode)).data : (await getTool(route.params.id)).data; if (!data) throw new Error('工具不存在'); tool.value = data; messages.value = [{ id: 'welcome', role: 'assistant', content: `我是${data.name}。${data.description || '请告诉我你想解决的问题。'}` }] } catch (cause) { toolError.value = cause?.response?.data?.detail || cause.message || '工具详情读取失败。' } finally { loadingTool.value = false } }
function onEnter(event) {
  if (event.isComposing || event.shiftKey) return
  event.preventDefault()
  submit()
}
async function submit(text = input.value) {
  const question = text.trim(); if (!question || pending.value || !tool.value) return
  pending.value = true; error.value = ''; failedText.value = question
  const userMessage = reactive({ id: `u-${Date.now()}`, role: 'user', content: question })
  const assistantMessage = reactive({ id: `a-${Date.now()}`, role: 'assistant', content: '', reasoning: '' })
  messages.value.push(userMessage, assistantMessage); input.value = ''; if (questionInput.value) questionInput.value.style.height = 'auto' ; await nextTick(); if (feed.value) feed.value.scrollTop = feed.value.scrollHeight
  const controller = new AbortController()
  currentController.value = controller
  let streamFailure = ''
  try {
    await streamChat(
      {
        message: question,
        tool_id: toolId.value,
        share_code: isShared.value ? route.params.shareCode : undefined,
        session_id: sessionId.value || undefined,
        usage_mode: localStorage.getItem('userRole') === 'teacher' ? 'teacher_preview' : 'student_use',
      },
      {
        signal: controller.signal,
        onMeta: data => { sessionId.value = data.session_id || sessionId.value },
        onReasoning: data => { assistantMessage.reasoning += data.text || '' },
        onDelta: data => { assistantMessage.content += data.text || ''; if (feed.value) feed.value.scrollTop = feed.value.scrollHeight },
        onError: data => { streamFailure = data.message || '回答生成失败。' },
      },
    )
    if (streamFailure) throw new Error(streamFailure)
    if (!assistantMessage.content && !controller.signal.aborted) {
      messages.value = messages.value.filter(item => item !== assistantMessage)
      error.value = '回答内容为空（可能网络波动），请重试。'
      input.value = question
      return
    }
    failedText.value = ''
  } catch (cause) {
    if (!controller.signal.aborted) {
      error.value = cause?.message || '请求失败，输入内容已为你保留。'
      input.value = question
      if (!assistantMessage.content) messages.value = messages.value.filter(item => item !== assistantMessage)
    } else if (!assistantMessage.content) {
      messages.value = messages.value.filter(item => item !== assistantMessage)
    }
  } finally {
    pending.value = false
    if (currentController.value === controller) currentController.value = null
  }
}
function stop() { currentController.value?.abort() }
async function share() {
  copied.value = false; shareError.value = ''
  const code = tool.value?.share_code
  const url = (code && tool.value?.share_enabled) ? `${window.location.origin}/share/${code}` : window.location.href
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.setAttribute('readonly', '')
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (!ok) throw new Error('copy failed')
    }
    copied.value = true
    setTimeout(() => { copied.value = false }, 2500)
  } catch {
    shareError.value = '复制失败，请手动复制浏览器地址栏链接。'
  }
}
onMounted(loadTool)
</script>

<template>
  <main class="tool-page vintage-theme">
    <StatusState v-if="loadingTool" type="loading" title="正在唤醒工具" />
    <StatusState v-else-if="toolError" type="error" title="工具无法打开" :description="toolError" @retry="loadTool" />

    <template v-else-if="tool">
      <!-- 左侧：工具信息 -->
      <aside class="tool-context">
        <div class="context-corner context-corner--tl"><VintageOrnament name="flourish-tl" /></div>
        <div class="context-corner context-corner--br"><VintageOrnament name="flourish-br" /></div>

        <button class="back" type="button" @click="router.back()">← 返回</button>

        <div class="tool-sigil-wrap">
          <span class="tool-sigil" aria-hidden="true">
            <svg viewBox="0 0 48 48"><path d="m24 4 17 10v20L24 44 7 34V14L24 4Z"/><path d="m7 14 17 11 17-11M24 25v19"/></svg>
          </span>
          <VintagePostmark :text="tool.category || '通用'" />
        </div>

        <p class="tool-category">{{ tool.category || '通用工具' }}</p>
        <h1>{{ tool.name }}</h1>
        <strong>{{ isShared ? '来自教师公开分享' : `工具编号 ${tool.id}` }}</strong>

        <VintageDivider />

        <p class="description">{{ tool.description || '工具创建者尚未补充说明。' }}</p>

        <dl>
          <div><dt>使用次数</dt><dd>{{ tool.usage_count || 0 }}</dd></div>
          <div><dt>当前会话</dt><dd>{{ sessionLabel }}</dd></div>
          <div><dt>本轮提问</dt><dd>{{ userTurns }} 次</dd></div>
        </dl>

        <button class="share" type="button" @click="share">
          <span>{{ copied ? '链接已复制' : '复制分享链接' }}</span>
        </button>
        <p v-if="shareError" class="share-error" role="alert">{{ shareError }}</p>
      </aside>

      <!-- 右侧：对话工作区 -->
      <section class="workspace" aria-labelledby="workspace-title">
        <div class="workspace-corner workspace-corner--tl"><VintageOrnament name="flourish-tl" /></div>
        <div class="workspace-corner workspace-corner--tr"><VintageOrnament name="flourish-tr" /></div>

        <header>
          <div>
            <VintageRibbonTitle label="GUIDED TOOL SESSION" />
            <h2 id="workspace-title">开始一次专注探索</h2>
          </div>
          <span :class="{ busy: pending }">{{ pending ? '生成中' : '已就绪' }}</span>
        </header>

        <div ref="feed" class="feed" aria-live="polite">
          <article v-for="message in messages" :key="message.id" :class="message.role">
            <b>{{ message.role === 'user' ? '你' : tool.name }}</b>
            <div class="message-bubble">
              <details v-if="message.reasoning && message.role === 'assistant'" class="reasoning" :open="pending && message.role === 'assistant'">
                <summary>思考过程</summary>
                <div>{{ message.reasoning }}</div>
              </details>
              <MarkdownText v-if="message.content" :content="message.content" />
              <span v-else-if="pending && message.role === 'assistant'" class="typing">正在组织回答…</span>
            </div>
          </article>
        </div>

        <div v-if="error" class="error" role="alert">
          <p>{{ error }}</p>
          <button data-testid="retry-message" type="button" @click="submit(failedText)">重新发送</button>
        </div>

        <form @submit.prevent="submit()">
          <label for="tool-question">向{{ tool.name }}提问</label>
          <textarea id="tool-question" ref="questionInput" v-model="input" rows="1" placeholder="写下你希望这个工具协助解决的内容" @keydown.enter="onEnter" @input="growInput" />
          <div>
            <button v-if="pending" class="stop" type="button" @click="stop">停止</button>
            <button v-else type="submit" :disabled="!input.trim()">发送</button>
          </div>
        </form>
        <p class="composer-hint">回答将使用当前工具的专属能力 · Enter 发送 / Shift+Enter 换行</p>
      </section>
    </template>
  </main>
</template>

<style scoped>
.tool-page.vintage-theme {
  display: grid;
  height: 100vh;
  overflow: hidden;
  grid-template-columns: minmax(210px, 0.5fr) minmax(0, 1.5fr);
  background:
    radial-gradient(circle at 35% 15%, rgba(184, 161, 110, 0.06), transparent 30%),
    #f5f1e8;
  color: #4a4333;
}

.tool-page.vintage-theme::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: 0.025;
  background-image:
    radial-gradient(circle at 25% 25%, #6b5d3e 1px, transparent 1px),
    radial-gradient(circle at 75% 75%, #6b5d3e 1px, transparent 1px);
  background-size: 80px 80px;
  z-index: 0;
}

button { font: inherit; cursor: pointer; }

/* ========== 左侧：深羊皮纸底 ========== */
.tool-context {
  position: relative;
  z-index: 1;
  min-height: 0;
  overflow-y: auto;
  padding: clamp(20px, 3vw, 40px);
  border-right: 2px solid rgba(184, 161, 110, 0.3);
  background:
    radial-gradient(circle at 30% 12%, rgba(184, 161, 110, 0.08), transparent 35%),
    linear-gradient(175deg, #f0e9d8, #e6ddc7 50%, #ded4b8);
  box-shadow: 4px 0 24px rgba(107, 93, 62, 0.06);
}

.tool-context::before {
  content: '';
  position: absolute;
  inset: 10px;
  border: 1px dashed rgba(139, 111, 71, 0.18);
  pointer-events: none;
}

.context-corner {
  position: absolute;
  z-index: 2;
}

.context-corner--tl { top: 10px; left: 10px; }
.context-corner--br { bottom: 10px; right: 10px; }

.back, .share {
  min-height: 44px;
  border: 1px solid rgba(184, 161, 110, 0.45);
  border-radius: 2px;
  background: rgba(250, 248, 242, 0.7);
  color: #5c4f34;
  font-family: var(--font-display);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.back:hover, .share:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107, 93, 62, 0.08);
}

.back {
  padding: 0 14px;
  font-size: 0.88rem;
  position: relative;
  z-index: 1;
}

/* sigil + 邮戳组合 */
.tool-sigil-wrap {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin: clamp(12px, 2vw, 24px) 0 18px;
}

.tool-sigil {
  display: grid;
  width: 80px;
  height: 80px;
  place-items: center;
  border: 2px solid #b8a16e;
  border-radius: 6px;
  color: #8b6f47;
  background: rgba(184, 161, 110, 0.08);
  box-shadow: 0 0 0 4px rgba(184, 161, 110, 0.06);
}

.tool-sigil svg {
  width: 46px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.2;
}

.tool-sigil-wrap .vintage-postmark {
  margin-top: 8px;
}

.tool-category {
  color: #8a9a8c;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  font-family: var(--font-display);
  margin: 0;
  position: relative;
  z-index: 1;
}

.tool-context h1 {
  margin: 10px 0 6px;
  font: 500 clamp(1.9rem, 3.4vw, 2.8rem)/1.15 var(--font-display);
  color: #3d3526;
  position: relative;
  z-index: 1;
  overflow-wrap: anywhere;
}

.tool-context > strong {
  color: #8b6f47;
  font-size: 0.85rem;
  font-family: var(--font-display);
  position: relative;
  z-index: 1;
}

.tool-context .vintage-divider {
  margin: 1rem 0;
}

.description {
  color: #5c4f34;
  line-height: 1.8;
  font-size: 0.95rem;
  position: relative;
  z-index: 1;
}

.tool-context dl {
  margin: 28px 0;
  position: relative;
  z-index: 1;
}

.tool-context dl div {
  display: flex;
  justify-content: space-between;
  padding: 13px 0;
  border-top: 1px solid rgba(139, 111, 71, 0.2);
}

dt {
  color: #8b7e60;
  font-size: 0.82rem;
  font-family: var(--font-display);
  letter-spacing: 0.04em;
}

dd {
  margin: 0;
  color: #3d3526;
  font-weight: 500;
  font-size: 0.95rem;
}

.share {
  width: 100%;
  position: relative;
  z-index: 1;
}

.share-error {
  margin-top: 10px;
  color: #8b4e3e;
  font-size: 0.82rem;
  text-align: center;
  position: relative;
  z-index: 1;
}

/* ========== 右侧：浅纸白底 ========== */
.workspace {
  position: relative;
  z-index: 1;
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  padding: clamp(22px, 3.5vw, 44px) clamp(24px, 4vw, 54px) 12px;
  background:
    radial-gradient(circle at 80% 90%, rgba(138, 154, 140, 0.04), transparent 40%),
    rgba(250, 248, 242, 0.3);
}

.workspace::before {
  content: '';
  position: absolute;
  inset: 12px;
  border: 1px dashed rgba(139, 111, 71, 0.1);
  pointer-events: none;
}

.workspace-corner {
  position: absolute;
  z-index: 2;
}

.workspace-corner--tl { top: 14px; left: 14px; }
.workspace-corner--tr { top: 14px; right: 14px; }

.workspace > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 22px;
  border-bottom: 2px solid rgba(196, 180, 154, 0.35);
  position: relative;
  z-index: 1;
}

.workspace h2 {
  margin-top: 6px;
  font: 500 1.7rem var(--font-display);
  color: #3d3526;
}

.workspace header > span {
  padding: 6px 14px;
  border: 1px solid rgba(138, 154, 140, 0.4);
  border-radius: 2px;
  background: rgba(138, 154, 140, 0.08);
  color: #6e7d70;
  font-size: 0.78rem;
  font-family: var(--font-display);
  letter-spacing: 0.05em;
}

.workspace header > span.busy {
  border-color: rgba(184, 161, 110, 0.5);
  background: rgba(184, 161, 110, 0.1);
  color: #8b6f47;
}

/* 消息区 */
.feed {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 22px;
  overflow-y: auto;
  padding: 34px 0;
  position: relative;
  z-index: 1;
}

.feed article { max-width: 80%; }

.feed article b {
  display: block;
  margin-bottom: 7px;
  color: #8a9a8c;
  font-size: 0.78rem;
  font-family: var(--font-display);
  letter-spacing: 0.06em;
}

.feed article .message-bubble {
  padding: 15px 18px;
  border: 1px solid rgba(196, 180, 154, 0.35);
  border-radius: 2px 14px 14px 14px;
  background: rgba(250, 248, 242, 0.8);
  color: #4a4333;
  line-height: 1.75;
  margin: 0;
  box-shadow: 0 2px 8px rgba(107, 93, 62, 0.04);
  position: relative;
}

.feed article .message-bubble::before {
  content: '';
  position: absolute;
  inset: 3px;
  border: 1px dashed rgba(139, 111, 71, 0.12);
  border-radius: 3px 11px 11px 11px;
  pointer-events: none;
}

.message-bubble .typing {
  color: #8b7e60;
  font-size: 0.9rem;
}

.message-bubble .reasoning {
  margin: 0 0 10px;
  padding: 8px 12px;
  border: 1px dashed rgba(138, 154, 140, 0.45);
  border-radius: 4px;
  background: rgba(138, 154, 140, 0.06);
  color: #6e7d70;
  font-size: 0.85rem;
}

.message-bubble .reasoning summary {
  cursor: pointer;
  font-family: var(--font-display);
  letter-spacing: 0.04em;
  color: #8a9a8c;
}

.message-bubble .reasoning > div {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(138, 154, 140, 0.3);
  white-space: pre-wrap;
  line-height: 1.7;
}

.workspace form .stop {
  border-color: rgba(201, 107, 90, 0.55);
  color: #8b4e3e;
}

.feed .user {
  align-self: flex-end;
}

.feed .user b { text-align: right; }

.feed .user .message-bubble {
  border-radius: 14px 2px 14px 14px;
  background: rgba(184, 161, 110, 0.1);
  border-color: rgba(184, 161, 110, 0.35);
}

.feed .user .message-bubble::before {
  border-radius: 11px 3px 11px 11px;
}

/* 错误 */
.error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding: 12px;
  border: 1px solid rgba(201, 107, 90, 0.4);
  border-radius: 2px;
  background: rgba(201, 107, 90, 0.06);
  color: #8b4e3e;
  position: relative;
  z-index: 1;
}

.error p { margin: 0; font-size: 0.88rem; }

.error button {
  min-height: 40px;
  padding: 0 13px;
  border: 1px solid rgba(201, 107, 90, 0.4);
  border-radius: 2px;
  background: transparent;
  color: inherit;
  font-family: var(--font-display);
  cursor: pointer;
}

/* 输入区 */
.workspace form {
  padding: 18px;
  border: 1px solid rgba(196, 180, 154, 0.4);
  border-radius: 2px;
  background: rgba(250, 248, 242, 0.6);
  position: relative;
  z-index: 1;
}

.workspace form::before {
  content: '';
  position: absolute;
  inset: 3px;
  border: 1px dashed rgba(139, 111, 71, 0.15);
  pointer-events: none;
}

.workspace form label {
  display: block;
  color: #6b5d3e;
  font-size: 0.82rem;
  font-family: var(--font-display);
  position: relative;
  z-index: 1;
}

.workspace textarea {
  width: 100%;
  min-height: 44px;
  max-height: 150px;
  margin: 10px 0;
  resize: none;
  overflow-y: auto;
  border: 0;
  background: transparent;
  color: #4a4333;
  font: inherit;
  line-height: 1.6;
  outline: 0;
  position: relative;
  z-index: 1;
}

.workspace textarea::placeholder {
  color: #b0a590;
}

.workspace form > div {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  position: relative;
  z-index: 1;
}

.composer-hint {
  margin: 8px 0 0;
  padding-bottom: 2px;
  color: #9a8c6e;
  font-size: 0.78rem;
  text-align: center;
  position: relative;
  z-index: 1;
}

.workspace form button {
  min-height: 44px;
  padding: 0 24px;
  border: 1px solid #b8a16e;
  border-radius: 2px;
  background: linear-gradient(135deg, rgba(250, 248, 242, 0.95), rgba(242, 239, 230, 0.85));
  color: #5c4f34;
  font-weight: 700;
  font-family: var(--font-display);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.workspace form button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(107, 93, 62, 0.1);
}

.workspace form button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 820px) {
  .tool-page { grid-template-columns: 1fr; height: auto; overflow: visible; }
  .tool-context { border-right: 0; border-bottom: 2px solid rgba(184, 161, 110, 0.3); }
  .tool-sigil-wrap { margin: 30px 0 18px; }
  .feed { min-height: 380px; }
  .context-corner--br { display: none; }
  .workspace-corner--tr { display: none; }
}

@media (max-width: 520px) {
  .workspace, .tool-context { padding: 22px 16px; }
  .workspace form > div, .error { align-items: flex-start; flex-direction: column; gap: 10px; }
  .feed article { max-width: 95%; }
  .tool-sigil-wrap .vintage-postmark { display: none; }
}
</style>
