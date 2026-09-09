<script setup>
import { nextTick, onMounted, reactive, ref } from 'vue'
import { streamChat, listSessions, getSessionMessages, deleteSession } from '../../api/chat'
import VintageRibbonTitle from '../../components/vintage/VintageRibbonTitle.vue'
import VintageOrnament from '../../components/vintage/VintageOrnament.vue'
import MarkdownText from '../../components/ui/MarkdownText.vue'

const input = ref(''), pending = ref(false), error = ref(''), sessionId = ref(''), feed = ref(null)
const messages = ref([{ id: 'welcome', role: 'assistant', content: '把你正在卡住的问题写下来。我们会从已知条件出发，一步一步找到突破口。' }])
const sessions = ref([]), lastFailed = ref(''), currentController = ref(null), questionInput = ref(null)
function growInput(event) {
  const el = event.target
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 150) + 'px'
}
const scroll = () => nextTick(() => { if (feed.value) feed.value.scrollTop = feed.value.scrollHeight })
async function loadSessions() {
  try { const { data } = await listSessions(); sessions.value = data || [] } catch { sessions.value = [] }
}
async function openSession(id) {
  if (pending.value) return
  try {
    const { data } = await getSessionMessages(id)
    sessionId.value = id
    messages.value = (data.messages || []).map(item => ({ id: item.id, role: item.role, content: item.content }))
    if (!messages.value.length) messages.value = [{ id: `welcome-${id}`, role: 'assistant', content: '这是一段尚未开始的学习对话。' }]
    scroll()
  } catch (cause) { error.value = cause?.response?.data?.detail || '会话读取失败。' }
}
function newSession() {
  if (pending.value) return
  sessionId.value = ''
  messages.value = [{ id: `welcome-${Date.now()}`, role: 'assistant', content: '新会话已准备好。把你正在卡住的问题写下来。' }]
  error.value = ''
}
async function removeCurrentSession() {
  if (!sessionId.value || !window.confirm('确认删除当前会话及其中的学习记录吗？')) return
  try { await deleteSession(sessionId.value); newSession(); await loadSessions() }
  catch (cause) { error.value = cause?.response?.data?.detail || '会话删除失败。' }
}
function onEnter(event) {
  if (event.isComposing || event.shiftKey) return
  event.preventDefault()
  submit()
}
async function submit(text = input.value) {
  const question = text.trim(); if (!question || pending.value) return
  pending.value = true; error.value = ''; lastFailed.value = question
  const userMessage = reactive({ id: `u-${Date.now()}`, role: 'user', content: question })
  const assistantMessage = reactive({ id: `a-${Date.now()}`, role: 'assistant', content: '', reasoning: '' })
  messages.value.push(userMessage, assistantMessage); input.value = ''; if (questionInput.value) questionInput.value.style.height = 'auto'; scroll()
  const controller = new AbortController()
  currentController.value = controller
  let streamFailure = ''
  try {
    await streamChat(
      { message: question, session_id: sessionId.value || undefined },
      {
        signal: controller.signal,
        onMeta: data => { sessionId.value = data.session_id || sessionId.value; scroll() },
        onReasoning: data => { assistantMessage.reasoning += data.text || '' },
        onDelta: data => { assistantMessage.content += data.text || ''; scroll() },
        onError: data => { streamFailure = data.message || '流式回答失败。' },
        onDone: async () => { await loadSessions(); scroll() },
      },
    )
    if (streamFailure) throw new Error(streamFailure)
    if (!assistantMessage.content && !controller.signal.aborted) {
      messages.value = messages.value.filter(item => item !== assistantMessage)
      error.value = '回答内容为空（可能网络波动），请重试。'
      input.value = question
      return
    }
    lastFailed.value = ''
  } catch (cause) {
    if (!controller.signal.aborted) {
      error.value = cause?.message || '回答生成超时，问题仍保留在输入框中。'
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
onMounted(loadSessions)
</script>

<template>
  <main class="chat-page vintage-theme">
    <aside class="context-panel">
      <VintageOrnament name="flourish-tl" />
      <p class="eyebrow">AI LEARNING COMPANION</p>
      <h1>让问题显形</h1>
      <p>它不会替你跳过思考，而会帮助你看见条件、关系与下一步。</p>
      <div class="session-tools">
        <button type="button" @click="newSession">＋ 新建会话</button>
        <button type="button" :disabled="!sessionId" @click="removeCurrentSession">删除当前</button>
      </div>
      <dl>
        <div><dt>当前会话</dt><dd>{{ sessionId ? '#' + sessionId.slice(0, 8) : '尚未建立' }}</dd></div>
        <div><dt>对话原则</dt><dd>先理解，再推导</dd></div>
      </dl>
      <div class="session-list">
        <h2>最近会话</h2>
        <button v-for="session in sessions" :key="session.id" type="button" :class="{ active: session.id === sessionId }" @click="openSession(session.id)">
          <span class="session-title">{{ session.preview || '未开始对话' }}</span>
          <time>{{ new Date(session.last_activity_at || session.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</time>
        </button>
        <p v-if="!sessions.length">完成一次提问后，这里会保留会话入口。</p>
      </div>
    </aside>

    <section class="chat-panel" aria-labelledby="chat-title">
      <header>
        <span class="core" aria-hidden="true"><i /></span>
        <div>
          <h2 id="chat-title">智教通学习助手</h2>
          <p>{{ pending ? '正在梳理知识脉络…' : '在线 · 等待你的问题' }}</p>
        </div>
      </header>

      <div ref="feed" class="message-feed" aria-live="polite">
        <article v-for="message in messages" :key="message.id" :class="message.role">
          <span aria-hidden="true">{{ message.role === 'user' ? '你' : '智' }}</span>
          <div class="message-bubble">
            <details v-if="message.reasoning && message.role === 'assistant'" class="reasoning" :open="pending && message.role === 'assistant'">
              <summary>思考过程</summary>
              <div>{{ message.reasoning }}</div>
            </details>
            <MarkdownText v-if="message.content" :content="message.content" />
            <span v-else-if="pending && message.role === 'assistant'" class="typing">正在连接知识节点<span class="dots">···</span></span>
          </div>
        </article>
      </div>

      <div v-if="error" class="error-note" role="alert">
        <p>{{ error }}</p>
        <button data-testid="retry-message" type="button" @click="submit(lastFailed)">重试上一次提问</button>
      </div>

      <form class="composer" @submit.prevent="submit()">
        <label for="student-question">输入你的问题</label>
        <textarea id="student-question" ref="questionInput" v-model="input" rows="1" placeholder="例如：为什么勾股定理只适用于直角三角形？" @keydown.enter="onEnter" @input="growInput" />
        <div>
          <span>{{ input.length }}/1000 · Enter 发送 / Shift+Enter 换行</span>
          <button v-if="pending" class="stop" type="button" @click="stop">停止</button>
          <button v-else type="submit" :disabled="!input.trim()">发送问题</button>
        </div>
      </form>
    </section>
  </main>
</template>

<style scoped>
.chat-page.vintage-theme {
  display: grid;
  height: calc(100vh - 80px);
  overflow: hidden;
  grid-template-columns: minmax(260px, 0.7fr) minmax(0, 1.6fr);
  gap: 24px;
  padding: clamp(22px, 4vw, 52px) clamp(20px, 4vw, 48px);
  background:
    radial-gradient(circle at 20% 10%, rgba(184, 161, 110, 0.06), transparent 30%),
    radial-gradient(circle at 80% 90%, rgba(138, 154, 140, 0.05), transparent 28%),
    #f5f1e8;
  color: #4a4333;
}

.chat-page.vintage-theme::before {
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

/* 左侧上下文面板 */
.context-panel {
  position: relative;
  z-index: 1;
  min-height: 0;
  overflow-y: auto;
  padding: clamp(24px, 3vw, 42px);
  border: 1px solid rgba(196, 180, 154, 0.35);
  border-radius: 2px;
  background: rgba(250, 248, 242, 0.6);
  box-shadow: 0 4px 20px rgba(107, 93, 62, 0.05);
}

.context-panel::before {
  content: '';
  position: absolute;
  inset: 5px;
  border: 1px dashed rgba(139, 111, 71, 0.15);
  border-radius: 1px;
  pointer-events: none;
}

.context-panel .vintage-ornament {
  position: absolute;
  top: 8px;
  left: 8px;
  opacity: 0.5;
}

.eyebrow {
  color: #8b6f47;
  font-size: 0.68rem;
  letter-spacing: 0.2em;
  font-family: var(--font-display);
}

.context-panel h1 {
  margin: 18px 0;
  font: 500 clamp(2.3rem, 4vw, 4rem)/1.1 var(--font-display);
  color: #3d3526;
}

.context-panel > p:not(.eyebrow) {
  color: #6b5d3e;
  line-height: 1.8;
  font-size: 0.92rem;
}

.context-panel dl {
  margin-top: 48px;
}

.context-panel dl div {
  padding: 15px 0;
  border-top: 1px solid rgba(196, 180, 154, 0.25);
}

dt {
  color: #8b7e60;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  font-family: var(--font-display);
}

dd {
  margin: 5px 0 0;
  color: #4a4333;
}

/* 右侧聊天面板 */
.chat-panel {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(196, 180, 154, 0.35);
  border-radius: 2px;
  background: rgba(250, 248, 242, 0.65);
  box-shadow: 0 4px 20px rgba(107, 93, 62, 0.05);
}

.chat-panel::before {
  content: '';
  position: absolute;
  inset: 5px;
  border: 1px dashed rgba(139, 111, 71, 0.12);
  border-radius: 1px;
  pointer-events: none;
  z-index: 0;
}

.chat-panel > header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(196, 180, 154, 0.25);
}

.chat-panel h2 {
  font: 500 1.05rem var(--font-display);
  color: #3d3526;
  margin: 0;
}

.chat-panel header p {
  margin-top: 3px;
  color: #8a9a8c;
  font-size: 0.72rem;
}

.core {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1.5px solid #b8a16e;
  border-radius: 50%;
  background: rgba(184, 161, 110, 0.08);
}

.core i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #b8a16e;
}

/* 消息区 */
.message-feed {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 18px;
  overflow-y: auto;
  padding: 28px;
}

.message-feed article {
  display: flex;
  max-width: 82%;
  gap: 10px;
  align-items: flex-start;
}

.message-feed article > span {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  place-items: center;
  border: 1px solid rgba(138, 154, 140, 0.5);
  border-radius: 50%;
  background: rgba(138, 154, 140, 0.08);
  color: #6e7d70;
  font-size: 0.7rem;
  font-family: var(--font-display);
}

.message-feed article .message-bubble {
  padding: 13px 16px;
  border: 1px solid rgba(196, 180, 154, 0.3);
  border-radius: 2px 14px 14px 14px;
  background: rgba(250, 248, 242, 0.7);
  color: #4a4333;
  line-height: 1.7;
  margin: 0;
}

.message-feed .user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-feed .user .message-bubble {
  border-radius: 14px 2px 14px 14px;
  background: rgba(184, 161, 110, 0.12);
  border-color: rgba(184, 161, 110, 0.35);
}

.message-bubble .typing {
  opacity: 0.7;
  color: #6e7d70;
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

.composer .stop {
  border-color: rgba(201, 107, 90, 0.55);
  color: #8b4e3e;
}

.dots {
  animation: blink 1.4s infinite;
}

@keyframes blink {
  50% { opacity: 0.3; }
}

/* 错误提示 */
.error-note {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 24px;
  padding: 12px 14px;
  border: 1px solid rgba(201, 107, 90, 0.4);
  border-radius: 2px;
  background: rgba(201, 107, 90, 0.06);
  color: #8b4e3e;
}

.error-note p {
  margin: 0;
  font-size: 0.88rem;
}

.error-note button {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid rgba(201, 107, 90, 0.4);
  border-radius: 2px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-family: var(--font-display);
}

/* 输入区 */
.composer {
  position: relative;
  z-index: 1;
  margin: 18px 24px 24px;
  padding: 15px;
  border: 1px solid rgba(196, 180, 154, 0.35);
  border-radius: 2px;
  background: rgba(250, 248, 242, 0.5);
}

.composer label {
  display: block;
  margin-bottom: 7px;
  color: #6b5d3e;
  font-size: 0.72rem;
  font-family: var(--font-display);
}

.composer textarea {
  width: 100%;
  min-height: 44px;
  max-height: 150px;
  resize: none;
  overflow-y: auto;
  border: 0;
  background: transparent;
  color: #4a4333;
  font: inherit;
  line-height: 1.6;
  outline: 0;
}

.composer textarea::placeholder {
  color: #b0a590;
}

.composer > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.composer span {
  color: #8b7e60;
  font-size: 0.68rem;
}

.composer button {
  min-height: 44px;
  padding: 0 20px;
  border: 1px solid #b8a16e;
  border-radius: 2px;
  background: linear-gradient(135deg, rgba(250, 248, 242, 0.95), rgba(242, 239, 230, 0.85));
  color: #5c4f34;
  font-weight: 700;
  font: inherit;
  font-family: var(--font-display);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.composer button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(107, 93, 62, 0.1);
}

.composer button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 820px) {
  .chat-page { grid-template-columns: 1fr; height: auto; overflow: visible; }
  .context-panel { min-height: auto; }
  .chat-panel { min-height: 70vh; }
}

@media (max-width: 520px) {
  .chat-page { padding: 14px; }
  .message-feed { padding: 18px; }
  .message-feed article { max-width: 95%; }
  .error-note { align-items: flex-start; flex-direction: column; }
}

@media (prefers-reduced-motion: reduce) {
  .dots { animation: none; }
}

.session-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 26px;
}

.session-tools button,
.session-list button {
  display: grid;
  gap: 3px;
  min-height: 46px;
  padding: 7px 10px;
  border: 1px solid rgba(139, 111, 71, 0.28);
  border-radius: 2px;
  background: transparent;
  color: #6b5d3e;
  font: inherit;
  font-size: 0.72rem;
  text-align: left;
  cursor: pointer;
}

.session-list .session-title {
  overflow: hidden;
  color: #4a4333;
  font-size: 0.82rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-list time {
  color: #9a8c6e;
  font-size: 0.7rem;
}

.session-tools button:first-child {
  border-color: rgba(184, 161, 110, 0.7);
  color: #8b6f47;
}

.session-tools button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.session-list {
  position: relative;
  z-index: 1;
  margin-top: 34px;
}

.session-list h2 {
  margin-bottom: 10px;
  color: #6b5d3e;
  font: 500 1rem var(--font-display);
}

.session-list button {
  display: block;
  width: 100%;
  margin-top: 7px;
  text-align: left;
}

.session-list button.active {
  border-color: #8a9a8c;
  background: rgba(138, 154, 140, 0.12);
}

.session-list p {
  color: #8b7e60;
  font-size: 0.75rem;
  line-height: 1.6;
}
</style>
