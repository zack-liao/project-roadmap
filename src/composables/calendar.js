// 產生時間軸每一欄的資訊：從 (startYear, startMonth) 起算 count 個月。
// 回傳 [{ index, year, month, label, isYearStart }]
export function buildColumns(startYear, startMonth, count) {
  const origin = startYear * 12 + startMonth
  const cols = []
  for (let i = 0; i < count; i++) {
    const abs = origin + i
    const year = Math.floor(abs / 12)
    const month = abs % 12
    cols.push({
      index: i,
      year,
      month,
      label: String(month + 1),  // 月份用數字：1~12
      isYearStart: month === 0 || i === 0,  // 一月，或整條軸的第一欄
    })
  }
  return cols
}

// 把欄位依年份分組，供雙層表頭上排使用。
// 回傳 [{ year, span }]（span = 該年在範圍內佔幾個月）
export function buildYearGroups(columns) {
  const groups = []
  for (const c of columns) {
    const last = groups[groups.length - 1]
    if (last && last.year === c.year) {
      last.span += 1
    } else {
      groups.push({ year: c.year, span: 1 })
    }
  }
  return groups
}

// 月偏移（距起點）→ 實際年月。用於詳情面板顯示可讀日期。
// 回傳 { year, month }（month 為 1~12）
export function offsetToYearMonth(offset, startYear, startMonth) {
  const abs = startYear * 12 + startMonth + Math.floor(offset)
  return { year: Math.floor(abs / 12), month: (abs % 12) + 1 }
}

// 格式化成 'YYYY-MM'
export function formatYearMonth(offset, startYear, startMonth) {
  const { year, month } = offsetToYearMonth(offset, startYear, startMonth)
  return `${year}-${String(month).padStart(2, '0')}`
}

// 某日期距時間軸起點的「月偏移」（含當月內的日比例），供今日線定位。
// 超出範圍回傳負值或 > count，呼叫端可據此判斷是否顯示。
export function dateToOffset(date, startYear, startMonth) {
  const abs = date.getFullYear() * 12 + date.getMonth()
  const origin = startYear * 12 + startMonth
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const frac = (date.getDate() - 1) / daysInMonth
  return abs - origin + frac
}
