import { ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { pxToMonth, clampBar } from './geometry.js'
import { MIN_DURATION } from '../constants.js'

const CLICK_THRESHOLD = 4  // 位移小於此像素視為點擊，而非拖曳

export function useDragBar({ project, monthWidth, trackLeft, resolveLane, onChange, onSelect }) {
  const dragging = ref(false)
  let mode = null            // 'move' | 'left' | 'right'
  let grabOffsetMonths = 0
  let startSnapshot = null   // { startMonth, duration } 拖曳起始快照
  let downX = 0, downY = 0   // 按下座標，用來判斷是否為點擊
  let moved = false          // 本次是否真的拖動過

  function begin(m, e) {
    e.preventDefault()
    e.stopPropagation()
    dragging.value = true
    mode = m
    moved = false
    downX = e.clientX
    downY = e.clientY
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
    if (!moved && Math.hypot(e.clientX - downX, e.clientY - downY) > CLICK_THRESHOLD) {
      moved = true
    }
    const mouseMonth = pxToMonth(e.clientX, trackLeft(), monthWidth())
    const snap = startSnapshot

    if (mode === 'move') {
      const clamped = clampBar(mouseMonth - grabOffsetMonths, snap.duration)
      const { categoryId, lane } = resolveLane(e.clientY)
      onChange({ startMonth: clamped.startMonth, lane, categoryId })
    } else if (mode === 'right') {
      // 右緣跟滑鼠（邊界座標）：duration = 滑鼠位置 - 起始月
      const duration = mouseMonth - snap.startMonth
      const clamped = clampBar(snap.startMonth, duration)
      onChange({ startMonth: clamped.startMonth, duration: clamped.duration })
    } else if (mode === 'left') {
      // 左緣跟滑鼠：右緣（end）固定，start 變、duration 反向變
      const end = snap.startMonth + snap.duration
      const newStart = Math.min(mouseMonth, end - MIN_DURATION)
      const clamped = clampBar(newStart, end - newStart)
      onChange({ startMonth: clamped.startMonth, duration: clamped.duration })
    }
  })

  useEventListener(window, 'pointerup', () => {
    if (!dragging.value) return
    // 未真正拖動、且按在橫條主體 → 視為點擊選取
    if (!moved && mode === 'move') onSelect?.()
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
