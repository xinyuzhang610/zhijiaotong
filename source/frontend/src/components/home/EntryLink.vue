<script setup>
defineProps({
  role: {
    type: String,
    required: true,
    validator: value => ['teacher', 'student'].includes(value)
  },
  label: {
    type: String,
    required: true
  },
  to: {
    type: [String, Object],
    required: true
  },
  testId: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <RouterLink
    class="entry-link"
    :class="`entry-link--${role}`"
    :to="to"
    :data-testid="testId || undefined"
  >
    <span class="entry-link__frame">
      <span class="entry-link__label">{{ label }}</span>
    </span>
  </RouterLink>
</template>

<style scoped>
.entry-link {
  display: inline-flex;
  min-height: 3rem;
  padding: .2rem;
  border: 1px solid var(--gold-400);
  border-radius: .3rem;
  color: var(--moon-50);
  font-family: var(--font-body);
  font-size: .95rem;
  font-weight: 500;
  letter-spacing: .08em;
  line-height: 1;
  text-decoration: none;
}

.entry-link__frame {
  display: inline-flex;
  min-height: calc(3rem - .4rem);
  align-items: center;
  justify-content: center;
  padding: .55rem 1.15rem;
  border: 1px solid rgb(213 166 79 / 48%);
  border-radius: .12rem;
}

.entry-link__label {
  text-align: center;
  /* 抵消最后一个字符后的 letter-spacing，确保文字严格居中 */
  margin-right: -.08em;
}

.entry-link--teacher {
  background: var(--ink-950);
  color: var(--gold-200);
}

.entry-link--student {
  border-color: var(--gold-300);
  background: var(--jade-700);
  color: var(--gold-200);
}

.entry-link--student .entry-link__frame {
  border-color: rgb(244 211 139 / 52%);
}

.entry-link:focus-visible {
  outline: 2px solid var(--moon-50);
  outline-offset: .25rem;
}

@media (hover: hover) {
  .entry-link {
    transition: transform .3s var(--ease-out), border-color .3s, box-shadow .3s;
  }

  .entry-link:hover {
    transform: translateY(-2px);
    border-color: var(--gold-300);
    box-shadow: 0 6px 24px rgb(213 166 79 / 22%);
  }

  .entry-link--teacher:hover {
    background: #10191f;
  }

  .entry-link--student:hover {
    background: #1d4a40;
  }
}

@media (prefers-reduced-motion: reduce) {
  .entry-link {
    transition: none;
  }
}
</style>
