const red = '#dc2626'
const green = '#16a34a'
const blue = '#2563eb'
const grid = '#e5e7eb'
const text = '#6b7280'

export function lineOption(seriesName = '上证指数', data = [], labels = []) {
  const values = data.length ? data : [3128, 3136, 3124, 3142, 3138, 3152, 3148, 3168]
  const xLabels = labels.length ? labels : ['09:30', '10:00', '10:30', '11:00', '13:30', '14:00', '14:30', '15:00']
  return {
    color: [blue],
    tooltip: { trigger: 'axis' },
    grid: { top: 34, right: 24, bottom: 34, left: 48 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xLabels,
      axisLine: { lineStyle: { color: grid } },
      axisLabel: { color: text },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitLine: { lineStyle: { color: grid } },
      axisLabel: { color: text },
    },
    series: [
      {
        name: seriesName,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { width: 3 },
        areaStyle: { color: 'rgba(37, 99, 235, 0.08)' },
        data: values,
      },
    ],
  }
}

export function multiIndexOption(indexes) {
  const maxTrendLength = Math.max(8, ...indexes.map((item) => item.trend?.length || 0))
  const times = Array.from({ length: maxTrendLength }, (_, index) => String(index + 1))
  return {
    color: ['#2563eb', '#dc2626', '#16a34a', '#7c3aed'],
    tooltip: { trigger: 'axis' },
    legend: { top: 0, right: 0, textStyle: { color: text } },
    grid: { top: 42, right: 24, bottom: 34, left: 48 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: times,
      axisLine: { lineStyle: { color: grid } },
      axisTick: { show: false },
      axisLabel: { color: text },
    },
    yAxis: {
      type: 'value',
      scale: true,
      splitLine: { lineStyle: { color: grid } },
      axisLabel: { color: text },
    },
    series: indexes.map((item) => ({
      name: item.name,
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2.5 },
      data: item.trend,
    })),
  }
}

export function klineOption(items = []) {
  const dates = items.length ? items.map((item) => item.tradeDate?.slice(5) || item.tradeDate) : Array.from({ length: 24 }, (_, index) => `05-${String(index + 1).padStart(2, '0')}`)
  const data = items.length ? items.map((item) => [
    Number(item.open),
    Number(item.close),
    Number(item.low),
    Number(item.high),
  ]) : [
    [67, 69, 65, 70],
    [69, 68, 66, 70],
    [68, 71, 67, 72],
    [71, 73, 70, 75],
    [73, 72, 70, 74],
    [72, 76, 71, 77],
    [76, 79, 75, 80],
    [79, 78, 76, 80],
    [78, 81, 77, 82],
    [81, 83, 80, 85],
    [83, 82, 80, 84],
    [82, 84, 81, 85],
    [84, 86, 83, 88],
    [86, 85, 83, 87],
    [85, 88, 84, 89],
    [88, 90, 87, 91],
    [90, 89, 87, 91],
    [89, 92, 88, 93],
    [92, 91, 89, 93],
    [91, 94, 90, 95],
    [94, 93, 91, 95],
    [93, 96, 92, 98],
    [96, 95, 93, 97],
    [95, 99, 94, 100],
  ]
  return {
    tooltip: { trigger: 'axis' },
    grid: { top: 24, right: 24, bottom: 42, left: 48 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: grid } },
      axisTick: { show: false },
      axisLabel: { color: text },
    },
    yAxis: {
      scale: true,
      splitLine: { lineStyle: { color: grid } },
      axisLabel: { color: text },
    },
    series: [
      {
        type: 'candlestick',
        data,
        itemStyle: {
          color: red,
          color0: green,
          borderColor: red,
          borderColor0: green,
        },
      },
    ],
  }
}

export function barOption(items) {
  return {
    color: [blue],
    tooltip: { trigger: 'axis' },
    grid: { top: 24, right: 20, bottom: 38, left: 54 },
    xAxis: {
      type: 'category',
      data: items.map(([name]) => name),
      axisLabel: { color: text, interval: 0 },
      axisLine: { lineStyle: { color: grid } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: grid } },
      axisLabel: { color: text },
    },
    series: [
      {
        type: 'bar',
        barWidth: 26,
        data: items.map(([, value]) => ({
          value,
          itemStyle: { color: value >= 0 ? red : green, borderRadius: [4, 4, 0, 0] },
        })),
      },
    ],
  }
}

export function profitOption() {
  return {
    color: [red, blue],
    tooltip: { trigger: 'axis' },
    legend: { top: 0, right: 0, textStyle: { color: text } },
    grid: { top: 42, right: 24, bottom: 34, left: 54 },
    xAxis: {
      type: 'category',
      data: ['04-22', '04-26', '04-30', '05-04', '05-08', '05-12', '05-16', '05-20'],
      axisLine: { lineStyle: { color: grid } },
      axisTick: { show: false },
      axisLabel: { color: text },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: grid } },
      axisLabel: { color: text },
    },
    series: [
      { name: '组合收益', type: 'line', smooth: true, data: [0, 860, 420, 2380, 1860, 5460, 8210, 11630], lineStyle: { width: 3 } },
      { name: '沪深300', type: 'line', smooth: true, data: [0, 240, -120, 620, 880, 1340, 1660, 2080], lineStyle: { width: 2 } },
    ],
  }
}
