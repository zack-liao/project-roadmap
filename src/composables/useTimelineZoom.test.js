import { describe, it, expect } from 'vitest'
import { useTimelineZoom, MONTH_WIDTH_MIN, MONTH_WIDTH_MAX } from './useTimelineZoom.js'
import { MONTH_WIDTH, MONTH_COUNT } from '../constants.js'

describe('useTimelineZoom', () => {
  it('starts at the default month width', () => {
    const { monthWidth, zoomPercent } = useTimelineZoom()
    expect(monthWidth.value).toBe(MONTH_WIDTH)
    expect(zoomPercent.value).toBe(100)
  })

  it('zoomAt scales width and keeps the anchor month under the same viewport x', () => {
    const { monthWidth, zoomAt } = useTimelineZoom()
    // 游標停在月座標 6、視口內 x=300px 處，放大 2 倍
    const scrollLeft = zoomAt(2, 6, 300)
    expect(monthWidth.value).toBe(MONTH_WIDTH * 2)
    // 新 scrollLeft 使 6 * newWidth - scrollLeft === 300
    expect(6 * monthWidth.value - scrollLeft).toBeCloseTo(300)
  })

  it('zoomAt clamps to min and max width', () => {
    const { monthWidth, zoomAt } = useTimelineZoom()
    zoomAt(100, 0, 0)
    expect(monthWidth.value).toBe(MONTH_WIDTH_MAX)
    zoomAt(0.0001, 0, 0)
    expect(monthWidth.value).toBe(MONTH_WIDTH_MIN)
  })

  it('zoomAt never returns a negative scrollLeft', () => {
    const { zoomAt } = useTimelineZoom()
    const scrollLeft = zoomAt(0.5, 0, 0)
    expect(scrollLeft).toBeGreaterThanOrEqual(0)
  })

  it('fitRange sizes the range to fill the viewport and scrolls to its start', () => {
    const { monthWidth, fitRange } = useTimelineZoom()
    // 3 個月撐滿 720px 視口 → 月寬 240
    const scrollLeft = fitRange(2, 5, 720)
    expect(monthWidth.value).toBe(240)
    expect(scrollLeft).toBeCloseTo(2 * 240)
  })

  it('fitRange clamps width so a tiny range cannot exceed max zoom', () => {
    const { monthWidth, fitRange } = useTimelineZoom()
    fitRange(0, 0.25, 1000)  // 0.25 月要撐滿 1000px → 4000px/月，超過上限
    expect(monthWidth.value).toBe(MONTH_WIDTH_MAX)
  })

  it('fitRange accepts a reversed range', () => {
    const { monthWidth, fitRange } = useTimelineZoom()
    const scrollLeft = fitRange(5, 2, 720)
    expect(monthWidth.value).toBe(240)
    expect(scrollLeft).toBeCloseTo(2 * 240)
  })

  it('fitRange ignores a zero-length range', () => {
    const { monthWidth, fitRange } = useTimelineZoom()
    const scrollLeft = fitRange(3, 3, 720)
    expect(monthWidth.value).toBe(MONTH_WIDTH)  // 不變
    expect(scrollLeft).toBe(null)
  })

  it('reset returns to the default width', () => {
    const { monthWidth, zoomAt, reset } = useTimelineZoom()
    zoomAt(2, 0, 0)
    reset()
    expect(monthWidth.value).toBe(MONTH_WIDTH)
  })

  it('total width follows month width', () => {
    const { totalWidth, zoomAt } = useTimelineZoom()
    zoomAt(2, 0, 0)
    expect(totalWidth.value).toBe(MONTH_COUNT * MONTH_WIDTH * 2)
  })
})
