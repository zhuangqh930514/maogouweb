export const marketIndexes = [
  {
    name: '上证指数',
    code: '000001.SH',
    value: 3168.42,
    change: 26.45,
    percent: 0.84,
    trend: [3118, 3126, 3121, 3140, 3136, 3152, 3148, 3168],
  },
  {
    name: '深证成指',
    code: '399001.SZ',
    value: 10248.91,
    change: 113.21,
    percent: 1.12,
    trend: [10020, 10086, 10042, 10128, 10156, 10132, 10210, 10248],
  },
  {
    name: '创业板指',
    code: '399006.SZ',
    value: 2114.37,
    change: -7.61,
    percent: -0.36,
    trend: [2132, 2128, 2134, 2116, 2122, 2108, 2110, 2114],
  },
  {
    name: '科创板指',
    code: '000688.SH',
    value: 889.26,
    change: 5.13,
    percent: 0.58,
    trend: [872, 878, 874, 882, 880, 886, 884, 889],
  },
]

export const newsItems = [
  { time: '14:53', title: '券商板块拉升，市场风险偏好回暖', source: '新浪财经' },
  { time: '14:37', title: 'AI 算力概念股午后成交额放大', source: '东方财富' },
  { time: '13:58', title: '北向资金净流入超过 50 亿元', source: 'AkShare' },
  { time: '11:22', title: '新能源产业链出现结构性反弹', source: '财联社' },
  { time: '10:08', title: '央行公开市场操作保持流动性平稳', source: '证券时报' },
]

export const watchStocks = [
  {
    code: '600519',
    name: '贵州茅台',
    price: 1672.8,
    percent: 1.42,
    volumeRatio: 1.12,
    aiScore: 72,
    advice: '观望/回踩买入',
    pe: 28.4,
    pb: 9.3,
    revenueGrowth: 16.8,
    profitGrowth: 15.4,
  },
  {
    code: '300750',
    name: '宁德时代',
    price: 198.64,
    percent: -0.82,
    volumeRatio: 1.86,
    aiScore: 64,
    advice: '控制仓位',
    pe: 21.8,
    pb: 4.6,
    revenueGrowth: 12.1,
    profitGrowth: 9.8,
  },
  {
    code: '688981',
    name: '中芯国际',
    price: 89.32,
    percent: 3.18,
    volumeRatio: 2.48,
    aiScore: 86,
    advice: '突破跟踪',
    pe: 48.6,
    pb: 3.21,
    revenueGrowth: 12.8,
    profitGrowth: 9.4,
  },
  {
    code: '600036',
    name: '招商银行',
    price: 37.18,
    percent: 0.46,
    volumeRatio: 0.92,
    aiScore: 69,
    advice: '稳健持有',
    pe: 6.8,
    pb: 0.92,
    revenueGrowth: 3.1,
    profitGrowth: 5.6,
  },
  {
    code: '002594',
    name: '比亚迪',
    price: 226.4,
    percent: 1.76,
    volumeRatio: 1.36,
    aiScore: 78,
    advice: '趋势修复',
    pe: 24.2,
    pb: 4.1,
    revenueGrowth: 18.4,
    profitGrowth: 11.2,
  },
  {
    code: '688256',
    name: '寒武纪',
    price: 432.18,
    percent: 4.82,
    volumeRatio: 3.21,
    aiScore: 81,
    advice: '高波动跟踪',
    pe: 0,
    pb: 13.4,
    revenueGrowth: 28.1,
    profitGrowth: -6.8,
  },
]

export const positions = [
  { code: '600519', name: '贵州茅台', buyPrice: 1590.4, quantity: 100, buyTime: '2026-05-12 10:18:00' },
  { code: '688981', name: '中芯国际', buyPrice: 67.52, quantity: 200, buyTime: '2026-05-08 13:42:00' },
  { code: '300750', name: '宁德时代', buyPrice: 203.94, quantity: 300, buyTime: '2026-05-15 09:58:00' },
  { code: '600036', name: '招商银行', buyPrice: 35.94, quantity: 500, buyTime: '2026-05-06 14:08:00' },
]

export const sectorHeatmap = [
  ['半导体', 3.8],
  ['证券', 2.6],
  ['AI算力', 2.2],
  ['白酒', 1.4],
  ['银行', 0.6],
  ['军工', 0.9],
  ['新能源', -0.8],
  ['医药', -1.1],
  ['地产', -1.9],
]

export const aiReports = [
  {
    id: 1,
    stock: '中芯国际',
    code: '688981',
    score: 86,
    advice: '突破跟踪',
    generatedAt: '2026-05-21 14:40',
    technicalAnalysis: '股价放量突破近 20 日平台，5/10/20 日均线多头排列，MACD 红柱扩大。短线趋势强，但已接近前高压力区。',
    riskWarning: '半导体板块波动率较高，若指数回落或成交量萎缩，可能出现快速回撤。跌破 84.5 元需重新评估。',
    buySellPoints: '回踩 86.8-87.5 区间可小仓位试探，突破 91.5 后再考虑加仓；止损位 84.5。',
    promptSummary: '实时价 89.32，涨幅 +3.18%，量比 2.48，近 20 日涨幅 +18.7%，主力净流入 +3.6 亿。',
  },
  {
    id: 2,
    stock: '贵州茅台',
    code: '600519',
    score: 72,
    advice: '观望回踩',
    generatedAt: '2026-05-21 14:15',
    technicalAnalysis: '价格仍处于震荡箱体上沿，量能温和放大但趋势确认不足。',
    riskWarning: '消费板块弹性有限，若指数回落可能跟随调整。',
    buySellPoints: '等待 1640-1655 区间回踩确认，避免追高。',
    promptSummary: '实时价 1672.80，涨幅 +1.42%，量比 1.12。',
  },
  {
    id: 3,
    stock: '宁德时代',
    code: '300750',
    score: 64,
    advice: '控制仓位',
    generatedAt: '2026-05-21 13:55',
    technicalAnalysis: '股价弱于指数，短期均线纠缠，资金承接一般。',
    riskWarning: '新能源链条波动较大，趋势修复需要放量确认。',
    buySellPoints: '跌破 194 需降低仓位，重新站上 202 再观察。',
    promptSummary: '实时价 198.64，涨幅 -0.82%，量比 1.86。',
  },
]

export const modelConfig = {
  apiBaseUrl: 'http://localhost:11434/v1',
  modelName: 'qwen3.6',
  apiKey: 'sk-local-dev-key',
  timeout: 60000,
  temperature: 0.2,
  maxTokens: 2048,
  intradayInterval: 30,
  closeTime: '15:30',
  analysisScope: '全部自选股',
  promptTemplate:
    '你是一名A股投研助手。请基于以下行情、K线、财务和持仓数据，输出 JSON 结构：technicalAnalysis、riskWarning、buySellPoints、score。',
}

export function getCurrentPrice(code) {
  return watchStocks.find((stock) => stock.code === code)?.price ?? 0
}

export function formatMoney(value) {
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })
}
