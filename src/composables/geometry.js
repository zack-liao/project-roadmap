import { MONTH_COUNT, SUBDIVISIONS, MIN_DURATION } from '../constants.js'

// 螢幕 x（相對整個視窗）→ 連續月座標，吸附到 1/SUBDIVISIONS（0.25 月）、clamp 0~12。
// 回傳的是「邊界座標」：0 = Jan 起點，12 = Dec 結束。
export function pxToMonth(x, trackLeft, monthWidth) {
  const raw = (x - trackLeft) / monthWidth
  const snapped = Math.round(raw * SUBDIVISIONS) / SUBDIVISIONS
  return Math.min(MONTH_COUNT, Math.max(0, snapped))
}

export function monthToPx(month, monthWidth) {
  return month * monthWidth
}

export function durationToPx(duration, monthWidth) {
  return duration * monthWidth
}

// 保證橫條合法：duration>=MIN_DURATION、整條落在 0~12 內
export function clampBar(startMonth, duration) {
  const dur = Math.max(MIN_DURATION, duration)
  let start = Math.max(0, startMonth)
  if (start + dur > MONTH_COUNT) {
    start = Math.max(0, MONTH_COUNT - dur)
  }
  return { startMonth: start, duration: dur }
}

// 螢幕 y（相對整個視窗）→ lane 整數列，向下取整、clamp 下限 0（無上限，track 會自動長高）。
export function pxToLane(y, trackTop, laneHeight) {
  return Math.max(0, Math.floor((y - trackTop) / laneHeight))
}

// 帶幾何快照 + y（相對 track 頂）→ { categoryId, lane }。
// bands: [{ id, top, height, laneCount }]。lane 可到 laneCount（帶尾新增一列）。
// headerPx 為帶頂標題列高度，lane 0 從標題列下方起算。
// 拖曳期間必須傳入「拖曳起點的快照」而非 live 帶佈局——lane 增加會使帶長高，
// live 佈局會讓帶底永遠追著游標跑，往下拖永遠出不了帶。
export function resolveBandLane(bands, y, laneHeight, headerPx = 0) {
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i]
    if (y < b.top + b.height || i === bands.length - 1) {
      const lane = Math.max(0, Math.min(b.laneCount, Math.floor((y - b.top - headerPx) / laneHeight)))
      return { categoryId: b.id, lane }
    }
  }
  return { categoryId: null, lane: 0 }
}
