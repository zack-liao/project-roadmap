import { MONTH_COUNT } from '../constants.js'

// 螢幕 x（相對整個視窗）→ 月 index，四捨五入吸附、clamp 0~11
export function pxToMonth(x, trackLeft, monthWidth) {
  const raw = (x - trackLeft) / monthWidth
  const rounded = Math.round(raw)
  return Math.min(MONTH_COUNT - 1, Math.max(0, rounded))
}

export function monthToPx(month, monthWidth) {
  return month * monthWidth
}

export function durationToPx(duration, monthWidth) {
  return duration * monthWidth
}

// 保證橫條合法：duration>=1、整條落在 0~11 內
export function clampBar(startMonth, duration) {
  const dur = Math.max(1, duration)
  let start = Math.max(0, startMonth)
  if (start + dur > MONTH_COUNT) {
    start = Math.max(0, MONTH_COUNT - dur)
  }
  return { startMonth: start, duration: dur }
}
