import { describe, it, expect } from 'vitest'
import { pxToMonth, monthToPx, durationToPx, clampBar } from './geometry.js'

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
    expect(pxToMonth(99999, 0, 100)).toBe(12)   // 右邊界可達 12
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
    // start 10.5, duration 3 → end 13.5 > 12；拉回 start = 9
    expect(clampBar(10.5, 3)).toEqual({ startMonth: 9, duration: 3 })
  })
  it('never lets startMonth go below 0', () => {
    expect(clampBar(-3, 2)).toEqual({ startMonth: 0, duration: 2 })
  })
})
