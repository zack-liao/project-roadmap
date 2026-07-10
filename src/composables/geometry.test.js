import { describe, it, expect } from 'vitest'
import { pxToMonth, monthToPx, durationToPx, clampBar, pxToLane } from './geometry.js'
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
