<script setup>
import { onMounted, reactive, ref } from 'vue'
import { getAdminUsers, updateAdminUser, setAdminToolPlazaStatus, getRecommendRules, createRecommendRule, updateRecommendRule, deleteRecommendRule, getAuditLogs, exportAuditLogs } from '../../api/admin'
import { getMyTools, restoreTool } from '../../api/tools'
import StatusState from '../../components/ui/StatusState.vue'

const tab = ref('users')
const loading = ref(true)
const error = ref('')
const notice = ref('')
const users = ref([])
const tools = ref([])
const rules = ref([])
const logs = ref([])
const ruleEditingId = ref(null)
const ruleForm = reactive({ subject: '', category: '', need_type: '', tool_ids: '', priority: 0, is_active: true })

function flash(message) { notice.value = message; window.setTimeout(() => { notice.value = '' }, 3200) }
function showError(cause, fallback) { error.value = cause?.response?.data?.detail || fallback }
async function loadUsers() { const { data } = await getAdminUsers({ page: 1, page_size: 100 }); users.value = data.items || [] }
async function loadTools() { const { data } = await getMyTools({ include_deleted: true, page: 1, page_size: 100 }); tools.value = data.items || [] }
async function loadRules() { const { data } = await getRecommendRules(); rules.value = data || [] }
async function loadLogs() { const { data } = await getAuditLogs({ page: 1, page_size: 100 }); logs.value = data.items || [] }
async function load() {
  loading.value = true; error.value = ''
  try {
    if (tab.value === 'users') await loadUsers()
    if (tab.value === 'tools') await loadTools()
    if (tab.value === 'rules') await loadRules()
    if (tab.value === 'audit') await loadLogs()
  } catch (cause) { showError(cause, '后台数据暂时无法读取。') }
  finally { loading.value = false }
}
async function switchTab(value) { tab.value = value; await load() }
async function toggleUser(user) {
  try { await updateAdminUser(user.id, { is_active: !user.is_active }); flash(user.is_active ? '账号已禁用。' : '账号已启用。'); await loadUsers() }
  catch (cause) { showError(cause, '账号状态更新失败。') }
}
async function changeRole(user, event) {
  try { await updateAdminUser(user.id, { role: event.target.value }); flash('用户角色已更新。'); await loadUsers() }
  catch (cause) { showError(cause, '角色更新失败。'); await loadUsers() }
}
async function updatePlaza(tool, status) {
  try { await setAdminToolPlazaStatus(tool.id, status); flash('工具广场状态已更新。'); await loadTools() }
  catch (cause) { showError(cause, '广场状态更新失败。') }
}
async function restore(tool) {
  try { await restoreTool(tool.id); flash('工具已恢复。'); await loadTools() }
  catch (cause) { showError(cause, '工具恢复失败。') }
}
function resetRule() { Object.assign(ruleForm, { subject: '', category: '', need_type: '', tool_ids: '', priority: 0, is_active: true }); ruleEditingId.value = null }
function editRule(rule) { Object.assign(ruleForm, { ...rule, tool_ids: (rule.tool_ids || []).join(',') }); ruleEditingId.value = rule.id }
async function saveRule() {
  const payload = { subject: ruleForm.subject || null, category: ruleForm.category || null, need_type: ruleForm.need_type || null, tool_ids: ruleForm.tool_ids.split(',').map(item => Number(item.trim())).filter(Number.isInteger), priority: Number(ruleForm.priority) || 0, is_active: ruleForm.is_active }
  try { if (ruleEditingId.value) await updateRecommendRule(ruleEditingId.value, payload); else await createRecommendRule(payload); flash(ruleEditingId.value ? '推荐规则已更新。' : '推荐规则已创建。'); resetRule(); await loadRules() }
  catch (cause) { showError(cause, '推荐规则保存失败。') }
}
async function removeRule(rule) {
  if (!window.confirm(`确认删除规则 #${rule.id} 吗？`)) return
  try { await deleteRecommendRule(rule.id); flash('推荐规则已删除。'); await loadRules() }
  catch (cause) { showError(cause, '推荐规则删除失败。') }
}
async function download(responsePromise, filename) {
  const response = await responsePromise
  const url = window.URL.createObjectURL(response.data)
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); window.URL.revokeObjectURL(url)
}
async function downloadAudit() { try { await download(exportAuditLogs(), 'audit-logs.csv') } catch (cause) { showError(cause, '审计日志导出失败。') } }
onMounted(load)
</script>

<template>
  <main class="admin-page vintage-theme">
    <header class="admin-head">
      <div class="admin-heading">
        <span class="admin-eyebrow">OPERATIONS CONTROL</span>
        <h1>运营后台</h1>
        <p>把账号、公共工具、推荐规则与审计记录留在一处管理。</p>
      </div>
      <button class="refresh-button" type="button" @click="load">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4" /></svg>
        <span>刷新数据</span>
      </button>
    </header>

    <nav class="admin-tabs" role="tablist" aria-label="后台模块">
      <button
        v-for="(item, index) in [{id:'users',label:'用户管理',eyebrow:'ACCOUNT DIRECTORY'},{id:'tools',label:'工具管理',eyebrow:'TOOL LIBRARY'},{id:'rules',label:'推荐规则',eyebrow:'MATCHING LOGIC'},{id:'audit',label:'审计日志',eyebrow:'AUDIT TRAIL'}]"
        :id="`admin-tab-${item.id}`"
        :key="item.id"
        class="admin-tab"
        :class="{ 'is-active': tab === item.id }"
        type="button"
        role="tab"
        :aria-selected="tab === item.id"
        :aria-controls="`admin-panel-${item.id}`"
        @click="switchTab(item.id)"
      >
        <span class="admin-tab__number">0{{ index + 1 }}</span>
        <span class="admin-tab__copy"><small>{{ item.eyebrow }}</small><strong>{{ item.label }}</strong></span>
        <span class="admin-tab__arrow" aria-hidden="true">↗</span>
      </button>
    </nav>

    <StatusState v-if="loading" type="loading" title="正在读取运营数据" />
    <StatusState v-else-if="error" type="error" title="后台读取失败" :description="error" @retry="load" />
    <section v-else :id="`admin-panel-${tab}`" class="admin-panel" role="tabpanel" :aria-labelledby="`admin-tab-${tab}`">
      <template v-if="tab === 'users'">
        <div class="panel-title">
          <div><span class="panel-eyebrow">ACCOUNT DIRECTORY</span><h2>用户管理</h2></div>
          <span class="panel-count">{{ users.length }} 个账号</span>
        </div>
        <div class="table-wrap">
          <table>
            <caption class="sr-only">用户账号、角色和启用状态</caption>
            <thead><tr><th>账号</th><th>姓名</th><th>角色</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td><strong class="table-primary">{{ user.username }}</strong></td>
                <td>{{ user.name || '未填写' }}</td>
                <td><label class="sr-only" :for="`user-role-${user.id}`">{{ user.username }} 的角色</label><select :id="`user-role-${user.id}`" :value="user.role" @change="changeRole(user, $event)"><option value="teacher">教师</option><option value="student">学生</option><option value="admin">管理员</option></select></td>
                <td><span class="status-pill" :class="user.is_active ? 'is-active' : 'is-muted'">{{ user.is_active ? '启用' : '禁用' }}</span></td>
                <td><button class="table-action" type="button" @click="toggleUser(user)">{{ user.is_active ? '禁用' : '启用' }}</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="tab === 'tools'">
        <div class="panel-title">
          <div><span class="panel-eyebrow">TOOL LIBRARY</span><h2>工具管理</h2></div>
          <span class="panel-count">含软删除记录</span>
        </div>
        <div class="table-wrap">
          <table>
            <caption class="sr-only">工具分类、广场状态和生命周期</caption>
            <thead><tr><th>工具</th><th>分类</th><th>创建者</th><th>广场状态</th><th>生命周期</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="tool in tools" :key="tool.id">
                <td><strong class="table-primary">{{ tool.name }}</strong></td>
                <td>{{ tool.category }}</td>
                <td>{{ tool.creator_id || '预设' }}</td>
                <td><label class="sr-only" :for="`tool-status-${tool.id}`">{{ tool.name }} 的广场状态</label><select :id="`tool-status-${tool.id}`" :value="tool.plaza_status" :disabled="Boolean(tool.deleted_at)" @change="updatePlaza(tool, $event.target.value)"><option value="published">已发布</option><option value="unlisted">未公开</option></select></td>
                <td><span class="status-pill" :class="tool.deleted_at ? 'is-muted' : 'is-active'">{{ tool.deleted_at ? '已删除' : '正常' }}</span></td>
                <td><button v-if="tool.deleted_at" class="table-action" type="button" @click="restore(tool)">恢复</button><span v-else class="table-placeholder">—</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else-if="tab === 'rules'">
        <div class="panel-title">
          <div><span class="panel-eyebrow">MATCHING LOGIC</span><h2>推荐规则</h2></div>
          <span class="panel-count">规则匹配，不调用 AI</span>
        </div>
        <form class="rule-form" @submit.prevent="saveRule">
          <label class="form-field"><span>适用学科</span><input v-model.trim="ruleForm.subject" placeholder="如语文" /></label>
          <label class="form-field"><span>学科分类</span><input v-model.trim="ruleForm.category" placeholder="如文科" /></label>
          <label class="form-field"><span>需求类型</span><input v-model.trim="ruleForm.need_type" placeholder="如课堂互动" /></label>
          <label class="form-field"><span>工具 ID</span><input v-model.trim="ruleForm.tool_ids" placeholder="逗号分隔，如 1, 6" /></label>
          <label class="form-field form-field--number"><span>优先级</span><input v-model.number="ruleForm.priority" type="number" placeholder="0" /></label>
          <label class="checkbox-field"><input v-model="ruleForm.is_active" type="checkbox" /><span><strong>启用规则</strong><small>保存后立即参与匹配</small></span></label>
          <div class="rule-actions"><button class="primary-action" type="submit">{{ ruleEditingId ? '保存修改' : '创建规则' }}</button><button v-if="ruleEditingId" class="secondary-action" type="button" @click="resetRule">取消编辑</button></div>
        </form>
        <div class="table-wrap">
          <table>
            <caption class="sr-only">推荐规则条件、工具 ID 和启用状态</caption>
            <thead><tr><th>ID</th><th>条件</th><th>工具 ID</th><th>优先级</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="rule in rules" :key="rule.id">
                <td>{{ rule.id }}</td><td>{{ rule.subject || '全部' }} / {{ rule.category || '全部' }} / {{ rule.need_type || '全部' }}</td><td>{{ (rule.tool_ids || []).join(', ') }}</td><td>{{ rule.priority }}</td>
                <td><span class="status-pill" :class="rule.is_active ? 'is-active' : 'is-muted'">{{ rule.is_active ? '启用' : '停用' }}</span></td>
                <td><button class="table-action" type="button" @click="editRule(rule)">编辑</button><button class="table-action is-danger" type="button" @click="removeRule(rule)">删除</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <template v-else>
        <div class="panel-title">
          <div><span class="panel-eyebrow">AUDIT TRAIL</span><h2>审计日志</h2></div>
          <button class="secondary-action" type="button" @click="downloadAudit">导出 CSV</button>
        </div>
        <div class="table-wrap">
          <table>
            <caption class="sr-only">后台操作审计日志</caption>
            <thead><tr><th>时间</th><th>操作者</th><th>动作</th><th>资源</th><th>结果</th></tr></thead>
            <tbody>
              <tr v-for="log in logs" :key="log.id"><td>{{ log.created_at ? new Date(log.created_at).toLocaleString('zh-CN') : '-' }}</td><td>{{ log.actor_id || '系统/访客' }}</td><td>{{ log.action }}</td><td>{{ log.resource_type }} #{{ log.resource_id || '-' }}</td><td><span class="status-pill" :class="log.result === 'success' ? 'is-active' : 'is-muted'">{{ log.result }}</span></td></tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>
    <p v-if="notice" class="notice" role="status">{{ notice }}</p>
  </main>
</template>

<style scoped>
.admin-page {
  position: relative;
  isolation: isolate;
  min-height: 100%;
  padding: clamp(28px, 4vw, 58px) clamp(20px, 4vw, 48px) 80px;
  overflow: hidden;
  background:
    radial-gradient(circle at 90% 4%, rgb(213 166 79 / 13%), transparent 28rem),
    radial-gradient(circle at 12% 92%, rgb(138 154 140 / 10%), transparent 24rem),
    #f5f1e8;
  color: #4a4333;
}

.admin-page::before {
  position: fixed;
  z-index: -1;
  inset: 0;
  pointer-events: none;
  content: '';
  opacity: 0.035;
  background-image:
    radial-gradient(circle at 25% 25%, #6b5d3e 1px, transparent 1px),
    radial-gradient(circle at 75% 75%, #6b5d3e 1px, transparent 1px);
  background-size: 80px 80px;
}

.admin-head,
.admin-tabs,
.admin-panel {
  width: min(100%, 1240px);
  margin-inline: auto;
}

.admin-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 28px;
  border-bottom: 1px solid rgb(196 180 154 / 55%);
}

.admin-heading { min-width: 0; }

.admin-eyebrow,
.panel-eyebrow {
  display: block;
  color: #8b6f47;
  font-family: var(--font-display);
  font-size: 0.68rem;
  letter-spacing: 0.2em;
}

.admin-heading h1 {
  margin: 10px 0 8px;
  color: #3d3526;
  font: 500 clamp(2.4rem, 5vw, 4.5rem)/1.05 var(--font-display);
  letter-spacing: -0.03em;
}

.admin-heading p {
  max-width: 42rem;
  color: #6b5d3e;
  line-height: 1.7;
}

.refresh-button,
.secondary-action,
.primary-action,
.table-action {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 15px;
  border: 1px solid rgb(184 161 110 / 60%);
  border-radius: 2px;
  background: rgb(250 248 242 / 72%);
  color: #5c4f34;
  font: inherit;
  cursor: pointer;
  transition: background var(--duration-fast), border-color var(--duration-fast), box-shadow var(--duration-fast), transform var(--duration-fast);
}

.refresh-button svg { width: 17px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.6; }
.refresh-button:hover,
.secondary-action:hover,
.table-action:hover { transform: translateY(-1px); border-color: #b8a16e; background: #faf8f2; box-shadow: 0 5px 15px rgb(107 93 62 / 10%); }

.admin-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-top: 24px;
  margin-bottom: 18px;
}

.admin-tab {
  display: grid;
  grid-template-columns: auto 1fr auto;
  min-height: 76px;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid rgb(196 180 154 / 50%);
  border-radius: 2px;
  background: rgb(250 248 242 / 52%);
  color: #6b5d3e;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--duration-fast), border-color var(--duration-fast), transform var(--duration-fast), box-shadow var(--duration-fast);
}

.admin-tab:hover { transform: translateY(-1px); border-color: rgb(184 161 110 / 72%); background: rgb(250 248 242 / 82%); box-shadow: 0 6px 18px rgb(107 93 62 / 8%); }
.admin-tab.is-active { border-color: rgb(138 154 140 / 72%); background: rgb(138 154 140 / 17%); color: #3d4d40; box-shadow: inset 0 0 0 1px rgb(138 154 140 / 12%); }
.admin-tab__number { align-self: start; color: #b18a46; font-family: var(--font-display); font-size: 0.78rem; letter-spacing: 0.08em; }
.admin-tab__copy { display: grid; gap: 4px; min-width: 0; }
.admin-tab__copy small { overflow: hidden; color: #8b7e60; font-size: 0.6rem; letter-spacing: 0.1em; text-overflow: ellipsis; white-space: nowrap; }
.admin-tab__copy strong { color: #4a4333; font-family: var(--font-display); font-size: 1rem; font-weight: 600; }
.admin-tab.is-active .admin-tab__copy strong { color: #3d4d40; }
.admin-tab__arrow { align-self: start; color: #8b6f47; font-size: 1rem; }

.admin-panel {
  position: relative;
  padding: clamp(20px, 3vw, 34px);
  border: 1px solid rgb(196 180 154 / 62%);
  border-radius: 2px;
  background: rgb(250 248 242 / 70%);
  box-shadow: 0 12px 32px rgb(107 93 62 / 8%), inset 0 0 0 1px rgb(255 255 255 / 55%);
}

.admin-panel::before {
  position: absolute;
  inset: 5px;
  pointer-events: none;
  content: '';
  border: 1px dashed rgb(139 111 71 / 14%);
}

.admin-panel > * { position: relative; z-index: 1; }

.panel-title { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 24px; }
.panel-title h2 { margin: 7px 0 0; color: #3d3526; font: 500 1.75rem/1.2 var(--font-heading); }
.panel-count { color: #8b7e60; font-family: var(--font-display); font-size: 0.8rem; }

.table-wrap { overflow-x: auto; border: 1px solid rgb(196 180 154 / 42%); background: rgb(255 255 255 / 30%); }
table { width: 100%; min-width: 720px; border-collapse: collapse; }
th, td { padding: 14px 13px; border-top: 1px solid rgb(196 180 154 / 36%); text-align: left; white-space: nowrap; }
thead tr:first-child th { border-top: 0; }
th { color: #7a5c2d; font-family: var(--font-display); font-size: 0.76rem; font-weight: 600; letter-spacing: 0.04em; }
td { color: #5c4f34; font-size: 0.86rem; }
tbody tr { transition: background var(--duration-fast); }
tbody tr:hover { background: rgb(255 255 255 / 55%); }
.table-primary { color: #3d3526; font-family: var(--font-display); font-weight: 600; }

td select,
.form-field input {
  width: 100%;
  min-height: 38px;
  padding: 0 10px;
  border: 1px solid rgb(196 180 154 / 65%);
  border-radius: 2px;
  background: rgb(255 255 255 / 62%);
  color: #4a4333;
  font: inherit;
}

td select { width: auto; min-width: 92px; }
td select:focus,
.form-field input:focus { border-color: #8a9a8c; outline: 3px solid rgb(138 154 140 / 18%); outline-offset: 1px; }
td select:disabled { cursor: not-allowed; opacity: 0.58; }
td select option { color: #4a4333; }

.status-pill { display: inline-flex; min-height: 25px; align-items: center; padding: 0 9px; border: 1px solid rgb(196 180 154 / 55%); border-radius: 999px; font-family: var(--font-display); font-size: 0.72rem; }
.status-pill.is-active { border-color: rgb(110 125 112 / 42%); background: rgb(138 154 140 / 13%); color: #526457; }
.status-pill.is-muted { background: rgb(196 180 154 / 14%); color: #8b7e60; }
.table-action { min-height: 32px; padding: 0 10px; border-radius: 2px; font-size: 0.75rem; }
.table-action.is-danger { border-color: rgb(143 47 42 / 35%); color: #8f2f2a; }
.table-placeholder { color: #b0a590; }

.rule-form { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; padding: 18px; border: 1px solid rgb(196 180 154 / 45%); background: rgb(240 237 228 / 62%); }
.form-field { display: grid; gap: 6px; min-width: 0; }
.form-field > span { color: #7a5c2d; font-family: var(--font-display); font-size: 0.74rem; }
.form-field input::placeholder { color: #a79a80; }
.checkbox-field { display: flex; min-height: 58px; align-items: center; gap: 9px; padding: 10px; border: 1px dashed rgb(138 154 140 / 52%); background: rgb(138 154 140 / 8%); cursor: pointer; }
.checkbox-field input { width: 18px; height: 18px; accent-color: #6e7d70; }
.checkbox-field span { display: grid; gap: 2px; }
.checkbox-field strong { color: #4a4333; font-family: var(--font-display); font-size: 0.8rem; font-weight: 600; }
.checkbox-field small { color: #8b7e60; font-size: 0.68rem; }
.rule-actions { display: flex; flex-wrap: wrap; align-items: end; gap: 8px; }
.primary-action { border-color: #8b6f47; background: #8b6f47; color: #faf8f2; font-weight: 600; }
.primary-action:hover { border-color: #6b5d3e; background: #6b5d3e; }

.notice { position: fixed; right: 24px; bottom: 24px; z-index: 30; max-width: min(360px, calc(100vw - 32px)); padding: 12px 18px; border: 1px solid rgb(110 125 112 / 55%); border-radius: 2px; background: #f7f3e9; color: #526457; box-shadow: 0 10px 28px rgb(107 93 62 / 14%); }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

@media (max-width: 1050px) {
  .admin-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .rule-form { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .rule-actions { align-items: center; }
}

@media (max-width: 700px) {
  .admin-head, .panel-title { align-items: flex-start; flex-direction: column; }
  .refresh-button { width: 100%; }
  .admin-tabs { grid-template-columns: 1fr; }
  .admin-tab { min-height: 64px; }
  .rule-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 480px) {
  .admin-page { padding-inline: 16px; }
  .admin-panel { padding: 18px 12px; }
  .rule-form { grid-template-columns: 1fr; padding: 14px; }
  .rule-actions, .rule-actions button { width: 100%; }
  .panel-title h2 { font-size: 1.5rem; }
}
</style>
