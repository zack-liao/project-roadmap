import { ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { pxToMonth, clampBar } from './geometry.js'

export function useDragBar({ project, monthWidth, trackLeft, onChange }) {
  const dragging = ref(false)
  let mode = null            // 'move' | 'left' | 'right'
  let grabOffsetMonths = 0
  let startSnapshot = null   // { startMonth, duration } 拖曳起始快照

  function begin(m, e) {
    e.preventDefault()
    e.stopPropagation()
    dragging.value = true
    mode = m
    const p = project()
    startSnapshot = { startMonth: p.startMonth, duration: p.duration }
    const mouseMonth = pxToMonth(e.clientX, trackLeft(), monthWidth())
    grabOffsetMonths = mouseMonth - p.startMonth
    e.target.setPointerCapture?.(e.pointerId)
  }

  const onPointerdownMove = (e) => begin('move', e)
  const onPointerdownResizeLeft = (e) => begin('left', e)
  const onPointerdownResizeRight = (e) => begin('right', e)

  useEventListener(window, 'pointermove', (e) => {
    if (!dragging.value) return
    const mouseMonth = pxToMonth(e.clientX, trackLeft(), monthWidth())
    const snap = startSnapshot

    if (mode === 'move') {
      const clamped = clampBar(mouseMonth - grabOffsetMonths, snap.duration)
      onChange({ startMonth: clamped.startMonth })
    } else if (mode === 'right') {
      // 右緣跟滑鼠：duration = 滑鼠月 - 起始月 + 1
      const duration = mouseMonth - snap.startMonth + 1
      const clamped = clampBar(snap.startMonth, duration)
      onChange({ startMonth: clamped.startMonth, duration: clamped.duration })
    } else if (mode === 'left') {
      // 左緣跟滑鼠：右緣（end）固定，start 變、duration 反向變
      const end = snap.startMonth + snap.duration  // exclusive
      const newStart = Math.min(mouseMonth, end - 1)
      const clamped = clampBar(newStart, end - newStart)
      onChange({ startMonth: clamped.startMonth, duration: clamped.duration })
    }
  })

  useEventListener(window, 'pointerup', () => {
    dragging.value = false
    mode = null
  })

  return {
    onPointerdownMove,
    onPointerdownResizeLeft,
    onPointerdownResizeRight,
    dragging,
  }
}
