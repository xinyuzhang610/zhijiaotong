<template>
  <fieldset class="identity-switch">
    <legend>{{ legend }}</legend>
    <div class="identity-options">
      <label
        v-for="option in options"
        :key="option.value"
        class="identity-option"
        :class="{ 'is-active': modelValue === option.value }"
      >
        <input
          :checked="modelValue === option.value"
          :value="option.value"
          name="identity-role"
          type="radio"
          @change="$emit('update:modelValue', option.value)"
        >
        <span class="identity-symbol" aria-hidden="true">
          <svg v-if="option.value === 'teacher'" viewBox="0 0 24 24"><path d="M4 5.5 12 2l8 3.5-8 3.6L4 5.5Zm2.5 3.1V14c0 2.2 2.5 4 5.5 4s5.5-1.8 5.5-4V8.6L12 11 6.5 8.6ZM19 9v7"/></svg>
          <svg v-else-if="option.value === 'admin'" viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 4.6-3 8.1-7 10-4-1.9-7-5.4-7-10V6l7-3Z"/><path d="m9 12 2 2 4-4"/></svg>
          <svg v-else viewBox="0 0 24 24"><path d="M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM5 21c.4-4.5 2.8-7 7-7s6.6 2.5 7 7M4 8h3m10 0h3"/></svg>
        </span>
        <span><strong>{{ option.title }}</strong><small>{{ option.description }}</small></span>
      </label>
    </div>
  </fieldset>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: 'teacher' },
  legend: { type: String, default: '选择你的身份' }
})

defineEmits(['update:modelValue'])

const options = [
  { value: 'teacher', title: '我是教师', description: '发现需求，创造课堂新可能' },
  { value: 'student', title: '我是学生', description: '探索兴趣，开启知识旅程' },
  { value: 'admin', title: '我是管理员', description: '运营管理，守护平台秩序' }
]
</script>

<style scoped>
.identity-switch{border:0;margin:0;padding:0}.identity-switch legend{margin-bottom:var(--space-sm);color:var(--moon-200);font-size:.78rem;letter-spacing:.12em}.identity-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.identity-option{position:relative;display:flex;align-items:center;gap:12px;min-height:72px;padding:12px;border:1px solid var(--color-border);border-radius:var(--radius-lg);background:var(--material-panel);cursor:pointer;transition:border-color var(--motion-fast),background var(--motion-fast),transform var(--motion-fast)}.identity-option:hover{transform:translateY(-2px);border-color:var(--gold-400)}.identity-option.is-active{border-color:var(--jade-400);background:var(--material-panel-strong);box-shadow:inset 0 0 28px var(--effect-jade-soft)}.identity-option input{position:absolute;inset:0;opacity:0;cursor:pointer}.identity-option:has(input:focus-visible){outline:3px solid var(--focus-ring);outline-offset:3px}.identity-symbol{display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;border:1px solid color-mix(in srgb,var(--gold-400) 40%,transparent);border-radius:50%;color:var(--gold-300)}.identity-symbol svg{width:22px;fill:none;stroke:currentColor;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.identity-option strong,.identity-option small{display:block}.identity-option strong{color:var(--moon-50);font-size:.92rem}.identity-option small{margin-top:4px;color:var(--moon-300);font-size:.72rem;line-height:1.35}@media(max-width:520px){.identity-options{grid-template-columns:1fr}.identity-option{min-height:64px}}
.identity-option{background:var(--material-panel-dark)}
</style>
