import { ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { pxToMonth, clampBar } from './geometry.js'

// project: () => Project, monthWidth: () => number, trackLeft: () => number
// onChange: (patch) => void
export function useDragBar({ project, monthWidth, trackLeft, onChange }) {
  const dragging = ref(false)
  let grabOffsetMonths = 0  // 滑鼠抓在橫條內第幾個月，維持相對位置

  function onPointerdownMove(e) {
    e.preventDefault()
    dragging.value = true
    const p = project()
    const mouseMonth = pxToMonth(e.clientX, trackLeft(), monthWidth())
    grabOffsetMonths = mouseMonth - p.startMonth
    e.target.setPointerCapture?.(e.pointerId)
  }

  useEventListener(window, 'pointermove', (e) => {
    if (!dragging.value) return
    const p = project()
    const mouseMonth = pxToMonth(e.clientX, trackLeft(), monthWidth())
    const newStart = mouseMonth - grabOffsetMonths
    const clamped = clampBar(newStart, p.duration)
    onChange({ startMonth: clamped.startMonth })
  })

  useEventListener(window, 'pointerup', () => {
    dragging.value = false
  })

  return { onPointerdownMove, dragging }
}
