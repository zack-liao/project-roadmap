import { describe, it, expect } from 'vitest'
import { pxToMonth, monthToPx, durationToPx, clampBar, pxToLane, resolveBandLane } from './geometry.js'
import { MONTH_COUNT } from '../constants.js'

describe('pxToMonth', () => {
  it('snaps a continuous month position to the nearest quarter (0.25)', () => {
    // monthWidth=100, trackLeft=0 → 1px = 0.01 月
    expect(pxToMonth(0, 0, 100)).toBe(0)
    expect(pxToMonth(120, 0, 100)).toBe(1.25)   // 1.20 → 最近 0.25 = 1.25
    expect(pxToMonth(112, 0, 100)).toBe(1)      // 1.12 → 1.00
    expect(pxToMonth(138, 0, 100)).toBe(1.5)    // 1.38 → 1.50
  })

  it('accounts for track left offset', () => {
    expect(pxToMonth(250, 200, 100)).toBe(0.5)  // (250-200)/100 = 0.50
  })

  it('clamps below 0 and above MONTH_COUNT (edge coordinate)', () => {
    expect(pxToMonth(-500, 0, 100)).toBe(0)
    expect(pxToMonth(99999, 0, 100)).toBe(MONTH_COUNT)   // 右邊界可達跨度尾端
  })
})

describe('monthToPx / durationToPx', () => {
  it('converts fractional month and duration to pixels', () => {
    expect(monthToPx(3, 100)).toBe(300)
    expect(monthToPx(3.25, 100)).toBe(325)
    expect(durationToPx(2.5, 100)).toBe(250)
  })
})

describe('clampBar', () => {
  it('keeps a valid fractional bar unchanged', () => {
    expect(clampBar(3, 2.25)).toEqual({ startMonth: 3, duration: 2.25 })
  })
  it('forces duration to at least MIN_DURATION (0.25)', () => {
    expect(clampBar(3, 0)).toEqual({ startMonth: 3, duration: 0.25 })
    expect(clampBar(3, 0.1)).toEqual({ startMonth: 3, duration: 0.25 })
  })
  it('pulls a bar that overflows the right edge back inside', () => {
    // 起點貼到尾端外、duration 3 → 應被拉回，使 end 剛好等於 MONTH_COUNT
    const r = clampBar(MONTH_COUNT + 5, 3)
    expect(r).toEqual({ startMonth: MONTH_COUNT - 3, duration: 3 })
  })
  it('never lets startMonth go below 0', () => {
    expect(clampBar(-3, 2)).toEqual({ startMonth: 0, duration: 2 })
  })
})

describe('pxToLane', () => {
  it('floors a continuous y position to the lane it falls in', () => {
    expect(pxToLane(0, 0, 44)).toBe(0)
    expect(pxToLane(43, 0, 44)).toBe(0)
    expect(pxToLane(44, 0, 44)).toBe(1)
    expect(pxToLane(100, 0, 44)).toBe(2)
  })

  it('accounts for track top offset', () => {
    expect(pxToLane(250, 200, 44)).toBe(1)  // (250-200)/44 = 1.13 → lane 1
  })

  it('clamps below lane 0 (no upper clamp, track grows instead)', () => {
    expect(pxToLane(-500, 0, 44)).toBe(0)
  })
})

describe('resolveBandLane', () => {
  const bands = [
    { id: 'c1', top: 0, height: 96, laneCount: 2 },
    { id: 'c2', top: 96, height: 96, laneCount: 2 },
    { id: null, top: 192, height: 96, laneCount: 2 },
  ]

  it('offsets lanes below the band header when headerPx is given', () => {
    // header 28px：y=30 在 c1 header 下方一點 → lane 0；y=20 在 header 內 → clamp lane 0
    expect(resolveBandLane(bands, 30, 44, 28)).toEqual({ categoryId: 'c1', lane: 0 })
    expect(resolveBandLane(bands, 20, 44, 28)).toEqual({ categoryId: 'c1', lane: 0 })
    expect(resolveBandLane(bands, 28 + 44 + 2, 44, 28)).toEqual({ categoryId: 'c1', lane: 1 })
  })

  it('maps y inside first band to its lanes', () => {
    expect(resolveBandLane(bands, 10, 44)).toEqual({ categoryId: 'c1', lane: 0 })
    expect(resolveBandLane(bands, 50, 44)).toEqual({ categoryId: 'c1', lane: 1 })
  })

  it('maps y inside a lower band (drag downward crosses band boundary)', () => {
    expect(resolveBandLane(bands, 100, 44)).toEqual({ categoryId: 'c2', lane: 0 })
    expect(resolveBandLane(bands, 150, 44)).toEqual({ categoryId: 'c2', lane: 1 })
    expect(resolveBandLane(bands, 200, 44)).toEqual({ categoryId: null, lane: 0 })
  })

  it('clamps above the track to the first band lane 0', () => {
    expect(resolveBandLane(bands, -50, 44)).toEqual({ categoryId: 'c1', lane: 0 })
  })

  it('clamps below the track to the last band, allowing one new lane', () => {
    expect(resolveBandLane(bands, 500, 44)).toEqual({ categoryId: null, lane: 2 })
  })

  it('band bottom padding maps to a new lane within that band', () => {
    // c1 高 96 = 2 lane * 44 + 8 padding；y=92 落在 padding → lane 2（帶內新列）
    expect(resolveBandLane(bands, 92, 44)).toEqual({ categoryId: 'c1', lane: 2 })
  })
})
