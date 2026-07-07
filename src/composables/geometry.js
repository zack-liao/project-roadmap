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
