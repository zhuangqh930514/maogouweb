const STATUS_LABELS = Object.freeze({
  ACTIVE: '运行中',
  ADD: '加仓',
  AFTER_CLOSE: '收盘后',
  AVAILABLE: '可用',
  AVOID: '建议回避',
  BALANCED: '均衡震荡',
  BEAR: '弱势',
  BEFORE_OPEN: '开盘前',
  BUILD_DAILY_INSIGHT: '汇总日报结论',
  BUILD_RESEARCH_DAILY_REPORT: '生成投研日报',
  BUILD_SAMPLES: '固化学习样本',
  BULL: '强势',
  BUY: '买入',
  CHALLENGER: '候选策略',
  CHAMPION: '正式策略',
  CHECK_DATA_QUALITY: '检查数据质量',
  COMPLETED: '已完成',
  COMPUTE_FACTORS: '计算因子',
  DATA_UNAVAILABLE: '数据不可用',
  DEFENSIVE: '防御模式',
  DECISION: '决策',
  DISABLED: '已停用',
  DOWN: '看跌',
  EMPTY: '暂无数据',
  EMPTY_RESULT: '暂无结果',
  ENABLED: '已启用',
  FAILED: '执行失败',
  FAILED_PIPELINE: '流水线失败',
  FETCH_DATA: '抓取收盘数据',
  FRESH: '数据新鲜',
  FUNDAMENTAL: '基本面',
  GENERATE_PREDICTIONS: '生成预测结果',
  GENERATE_REPORTS: '生成个股报告',
  HIGH: '高风险',
  HIGH_RISK: '高风险',
  HOLD: '持有',
  IDLE: '等待中',
  INACTIVE: '未启用',
  INTRADAY: '盘中',
  LOW: '低风险',
  LOW_SAMPLE: '样本不足',
  MEDIUM: '中风险',
  MARKET: '市场',
  MISSING: '数据缺失',
  NEGATIVE: '负向',
  NEUTRAL: '中性',
  NO_TRIGGER: '未触发',
  PARTIAL_READY: '部分就绪',
  PARTIAL_SUCCESS: '部分成功',
  PENDING: '待处理',
  PLANNED: '规划中',
  POSITIVE: '正向',
  PROMPT_STABILITY: '提示词稳定性',
  READY: '就绪',
  REALTIME: '实时',
  REASSESS: '重新评估',
  RECOMMEND: '推荐关注',
  REDUCE: '减仓',
  REPORT_JSON: '报告结构',
  RUNNING: '执行中',
  RISK: '风险',
  SELL: '卖出',
  SHADOW: '影子运行',
  SIDEWAYS: '震荡',
  SKIPPED: '已跳过',
  STALE: '非实时',
  STANDBY: '可回滚',
  STOP_LOSS: '止损',
  SUCCESS: '成功',
  STRONG: '强势',
  SUPPORT: '支持',
  TAKE_PROFIT: '分批止盈',
  TECHNICAL: '技术面',
  TRENDING: '趋势行情',
  UNAVAILABLE: '数据不可用',
  UNKNOWN: '待确认',
  UP: '看涨',
  VERIFIED: '已验证',
  VERIFY_LABELS: '复盘成熟预测',
  WATCH: '观察',
  WATCHLIST: '自选股',
  WEAK: '弱势',
})

const REPLACEMENTS = Object.entries(STATUS_LABELS)
  .sort(([left], [right]) => right.length - left.length)

export function statusLabel(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback
  const normalized = String(value).trim().toUpperCase()
  return STATUS_LABELS[normalized] || String(value)
}

export function localizeStatusText(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback
  let result = String(value)
  for (const [code, label] of REPLACEMENTS) {
    const pattern = new RegExp(`(^|[^A-Z0-9_])${code}(?=$|[^A-Z0-9_])`, 'g')
    result = result.replace(pattern, `$1${label}`)
  }
  return result
}

export { STATUS_LABELS }
