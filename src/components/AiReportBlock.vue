<template>
  <div class="report-block">
    <div class="block-icon" :class="tone"></div>
    <div class="block-main">
      <div class="block-title">{{ title }}</div>
      <div v-if="normalizedContent.type === 'pairs'" class="kv-grid">
        <div v-for="item in normalizedContent.items" :key="`${title}-${item.label}`" class="kv-card">
          <div class="kv-label">{{ item.label }}</div>
          <div class="kv-value">{{ item.value }}</div>
        </div>
      </div>
      <ul v-else-if="normalizedContent.type === 'list'" class="block-list">
        <li v-for="(item, index) in normalizedContent.items" :key="`${title}-${index}`">{{ item }}</li>
      </ul>
      <div v-else class="block-text">
        <p v-for="(line, index) in normalizedContent.lines" :key="`${title}-${index}`">{{ line }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const KEY_LABEL_MAP = {
  trend: '趋势',
  conclusion: '结论',
  summary: '摘要',
  support: '支撑位',
  resistance: '阻力位',
  volume: '成交量',
  volumeRatio: '量比',
  turnover: '换手率',
  macd: 'MACD',
  kdj: 'KDJ',
  rsi: 'RSI',
  ma5: 'MA5',
  ma10: 'MA10',
  ma20: 'MA20',
  ma30: 'MA30',
  ma60: 'MA60',
  score: '评分',
  risk: '风险',
  action: '操作建议',
  entry: '买点',
  stopLoss: '止损位',
  target: '目标位',
  reason: '原因',
  shortTerm: '短线',
  mediumTerm: '中线',
  currentPrice: '现价',
  bias: '乖离情况',
  signal: '信号',
  recentAction: '近期量能',
  comment: '说明',
}

const props = defineProps({
  title: { type: String, required: true },
  text: { type: [String, Object, Array], default: '' },
  content: { type: [String, Object, Array], default: '' },
  tone: { type: String, default: 'blue' },
})

const normalizedContent = computed(() => normalizeContent(props.content || props.text))

function normalizeContent(value) {
  if (value == null) {
    return { type: 'text', lines: ['暂无内容'] }
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => formatValue(item)).filter(Boolean)
    return items.length ? { type: 'list', items } : { type: 'text', lines: ['暂无内容'] }
  }

  if (isPlainObject(value)) {
    const items = buildPairs(value)
    return items.length ? { type: 'pairs', items } : { type: 'text', lines: ['暂无内容'] }
  }

  const raw = String(value).trim()
  if (!raw) {
    return { type: 'text', lines: ['暂无内容'] }
  }

  const parsed = parseMaybeJson(raw)
  if (parsed !== null) {
    return normalizeContent(parsed)
  }

  const lines = raw.split(/\n+/).map((item) => cleanText(item)).filter(Boolean)
  if (lines.length > 1) {
    return { type: 'list', items: lines.map((item) => stripBullet(item)) }
  }

  const segments = raw.split(/[；;]/).map((item) => cleanText(item)).filter(Boolean)
  if (segments.length > 1) {
    return { type: 'list', items: segments }
  }

  return { type: 'text', lines: [raw] }
}

function buildPairs(source) {
  return Object.entries(source)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => ({
      label: formatKey(key),
      value: formatValue(value),
    }))
    .filter((item) => item.value)
}

function formatValue(value) {
  if (value == null) {
    return ''
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).filter(Boolean).join('；')
  }

  if (isPlainObject(value)) {
    return buildPairs(value)
      .map((item) => `${item.label}：${item.value}`)
      .join('；')
  }

  return cleanText(String(value))
}

function formatKey(key) {
  if (KEY_LABEL_MAP[key]) {
    return KEY_LABEL_MAP[key]
  }
  if (/^[A-Z0-9]+$/.test(key)) {
    return key
  }
  const normalized = key
    .replace(/_/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .trim()
  return normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : key
}

function parseMaybeJson(raw) {
  if (!/^(\{|\[)/.test(raw)) {
    return null
  }
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function stripBullet(text) {
  return text.replace(/^[-*•\d]+[.、\s-]*/, '').trim()
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim()
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]'
}
</script>

<style scoped>
.report-block {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 12px;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.block-main {
  min-width: 0;
}

.block-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #dbeafe;
}

.block-icon.yellow {
  background: #fef3c7;
}

.block-icon.green {
  background: #dcfce7;
}

.block-title {
  font-size: 13px;
  font-weight: 800;
  line-height: 20px;
}

.block-text {
  margin-top: 6px;
  color: #4b5563;
  font-size: 13px;
  line-height: 21px;
}

.block-text p {
  margin: 0;
}

.block-text p + p {
  margin-top: 6px;
}

.block-list {
  margin: 8px 0 0;
  padding-left: 18px;
  color: #4b5563;
  font-size: 13px;
  line-height: 21px;
}

.block-list li + li {
  margin-top: 6px;
}

.kv-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 8px;
}

.kv-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 10px 12px;
}

.kv-label {
  color: #64748b;
  font-size: 12px;
  line-height: 18px;
}

.kv-value {
  margin-top: 4px;
  color: #111827;
  font-size: 13px;
  line-height: 20px;
  word-break: break-word;
}
</style>
