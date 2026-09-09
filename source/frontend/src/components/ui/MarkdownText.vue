<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import texmath from 'markdown-it-texmath'
import katex from 'katex'
import DOMPurify from 'dompurify'
import 'katex/dist/katex.min.css'

const props = defineProps({
  content: { type: String, default: '' }
})

const md = new MarkdownIt({ html: false, breaks: true, linkify: true })
md.use(texmath, {
  engine: katex,
  delimiters: ['dollars'],
  katexOptions: { throwOnError: false }
})

// DeepSeek 常输出 \[...\] / \(...\) 包裹的 LaTeX；统一归一化为 $ / $$ 定界符，
// 由 markdown-it-texmath 的 dollars 规则渲染（brackets 块级规则在该版本下不稳定）。
// 只转换完整成对的定界符，流式输出进行到一半时不会泄漏裸 $$。
const DISPLAY_LATEX_RE = new RegExp(String.raw`\\\[([\s\S]*?)\\\]`, 'g')
const INLINE_LATEX_RE = new RegExp(String.raw`\\([\s\S]*?)\\\)`, 'g')
const DOLLAR_BLOCK_RE = new RegExp(String.raw`\$\$[\s\S]*?\$\$`, 'g')

// $$...$$ 块内不允许出现额外 $（markdown-it-texmath 的正则直接整块丢弃），
// 把模型偶尔嵌套进块的噪音 $ 清掉，公式才能正常渲染。
const stripStrayDollarsInBlocks = (text) => text.replace(DOLLAR_BLOCK_RE, (match) => {
  const inner = match.slice(2, -2).replace(/\$/g, '')
  return '$$' + inner + '$$'
})

const normalizeLatex = (text) => stripStrayDollarsInBlocks(text
  .replace(DISPLAY_LATEX_RE, (_, body) => `\n\n$$\n${body.trim()}\n$$\n\n`)
  .replace(INLINE_LATEX_RE, (_, body) => `$${body.trim()}$`))

const html = computed(() => DOMPurify.sanitize(md.render(normalizeLatex(props.content || ''))))
</script>

<template>
  <div class="markdown-body" v-html="html" />
</template>

<style>
/* 全局样式（供复古风格页面内的消息气泡使用） */
.markdown-body {
  color: inherit;
  font-size: inherit;
  line-height: 1.75;
  white-space: normal;
  word-break: break-word;
}

.markdown-body > :first-child { margin-top: 0; }
.markdown-body > :last-child { margin-bottom: 0; }

.markdown-body p { margin: 0 0 0.7em; }

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5 {
  margin: 1.05em 0 0.45em;
  font-weight: 600;
  line-height: 1.3;
}

.markdown-body h1 { font-size: 1.28em; }
.markdown-body h2 { font-size: 1.18em; }
.markdown-body h3 { font-size: 1.08em; }
.markdown-body h4, .markdown-body h5 { font-size: 1em; }

.markdown-body ul,
.markdown-body ol {
  margin: 0.5em 0;
  padding-left: 1.5em;
}

.markdown-body li { margin: 0.28em 0; }
.markdown-body li > ul,
.markdown-body li > ol { margin: 0.2em 0; }

.markdown-body strong { font-weight: 700; }

.markdown-body blockquote {
  margin: 0.7em 0;
  padding: 0.35em 1em;
  border-left: 3px solid rgba(184, 161, 110, 0.6);
  color: inherit;
  opacity: 0.9;
}

.markdown-body code {
  padding: 0.15em 0.4em;
  border: 1px solid rgba(107, 93, 62, 0.18);
  border-radius: 3px;
  background: rgba(107, 93, 62, 0.08);
  font-size: 0.92em;
}

.markdown-body pre {
  margin: 0.7em 0;
  padding: 12px 14px;
  overflow-x: auto;
  border: 1px solid rgba(107, 93, 62, 0.18);
  border-radius: 4px;
  background: rgba(107, 93, 62, 0.08);
  line-height: 1.6;
}

.markdown-body pre code {
  padding: 0;
  border: 0;
  background: transparent;
}

.markdown-body hr {
  margin: 1em 0;
  border: 0;
  border-top: 1px dashed rgba(139, 111, 71, 0.4);
}

.markdown-body a { color: #8b6f47; text-decoration: underline; }

.markdown-body img { max-width: 100%; }

.markdown-body table {
  margin: 0.7em 0;
  border-collapse: collapse;
}

.markdown-body th,
.markdown-body td {
  padding: 6px 10px;
  border: 1px solid rgba(107, 93, 62, 0.25);
}

.markdown-body th { background: rgba(107, 93, 62, 0.08); }

.markdown-body .katex-display {
  margin: 0.7em 0;
  padding: 6px 0;
  overflow-x: auto;
  overflow-y: hidden;
}
</style>
