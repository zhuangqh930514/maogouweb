export function isAshareTradeDay(date = new Date()) {
  const day = date.getDay()
  return day >= 1 && day <= 5
}

export function isAshareMarketOpen(date = new Date()) {
  if (!isAshareTradeDay(date)) {
    return false
  }
  const minutes = date.getHours() * 60 + date.getMinutes()
  return (minutes >= 9 * 60 + 30 && minutes <= 11 * 60 + 30) || (minutes >= 13 * 60 && minutes <= 15 * 60)
}

export function ashareMarketStatus(date = new Date()) {
  if (!isAshareTradeDay(date)) {
    return 'A股休市'
  }
  const minutes = date.getHours() * 60 + date.getMinutes()
  if (minutes < 9 * 60 + 30) {
    return 'A股未开盘'
  }
  if (minutes > 11 * 60 + 30 && minutes < 13 * 60) {
    return 'A股午间休市'
  }
  if (minutes > 15 * 60) {
    return 'A股已收盘'
  }
  return 'A股休市'
}

export function marketSourceStatus(sourceStatus, date = new Date()) {
  const status = String(sourceStatus || 'UNAVAILABLE').trim().toUpperCase()
  if (status === 'UNAVAILABLE') {
    return 'UNAVAILABLE'
  }
  if (status === 'STALE') {
    return 'STALE'
  }
  return isAshareMarketOpen(date) ? 'REALTIME' : 'RECENT_CLOSE'
}

export function marketSourceStatusText(sourceStatus, date = new Date()) {
  return {
    REALTIME: '实时',
    STALE: '非实时',
    RECENT_CLOSE: '最近收盘',
    UNAVAILABLE: '数据源异常',
  }[marketSourceStatus(sourceStatus, date)] || '数据状态待确认'
}

export function formatDateTime(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}
