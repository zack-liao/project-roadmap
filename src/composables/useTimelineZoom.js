import { ref, computed } from 'vue'
import { MONTH_WIDTH, MONTH_COUNT } from '../constants.js'

// 月寬縮放範圍：33% ~ 400%
export const MONTH_WIDTH_MIN = 24
export const MONTH_WIDTH_MAX = 288

const clampWidth = (w) => Math.min(MONTH_WIDTH_MAX, Math.max(MONTH_WIDTH_MIN, w))

export function useTimelineZoom() {
  const monthWidth = ref(MONTH_WIDTH)
  const totalWidth = computed(() => MONTH_COUNT * monthWidth.value)
  const zoomPercent = computed(() => Math.round((monthWidth.value / MONTH_WIDTH) * 100))

  // 以 anchorMonth（月座標）為中心縮放：縮放後該月仍停在視口內 anchorViewportX 處。
  // 回傳新 scrollLeft，由呼叫端套到捲動容器。
  function zoomAt(factor, anchorMonth, anchorViewportX) {
    monthWidth.value = clampWidth(monthWidth.value * factor)
    return Math.max(0, anchorMonth * monthWidth.value - anchorViewportX)
  }

  // 讓 [a, b]（月座標，可反向）撐滿視口寬。回傳新 scrollLeft；區間長度為 0 時不動作。
  function fitRange(a, b, viewportWidth) {
    const start = Math.min(a, b)
    const span = Math.abs(b - a)
    if (span === 0) return null
    monthWidth.value = clampWidth(viewportWidth / span)
    return Math.max(0, start * monthWidth.value)
  }

  function reset() {
    monthWidth.value = MONTH_WIDTH
  }

  return { monthWidth, totalWidth, zoomPercent, zoomAt, fitRange, reset }
}
