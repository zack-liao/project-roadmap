import { describe, it, expect } from 'vitest'
import { pxToMonth, monthToPx, durationToPx, clampBar } from './geometry.js'

describe('pxToMonth', () => {
  it('maps track-relative x to month index, snapping to nearest', () => {
    // monthWidth=100, trackLeft=0
    expect(pxToMonth(0, 0, 100)).toBe(0)
    expect(pxToMonth(149, 0, 100)).toBe(1)   // round: 1.49 -> 1
    expect(pxToMonth(150, 0, 100)).toBe(2)   // round: 1.5 -> 2
  })

  it('accounts for track left offset', () => {
    expect(pxToMonth(250, 200, 100)).toBe(1) // (250-200)/100 = 0.5 -> 1
  })

  it('clamps below 0 and above 11', () => {
    expect(pxToMonth(-500, 0, 100)).toBe(0)
    expect(pxToMonth(99999, 0, 100)).toBe(11)
  })
})

describe('monthToPx / durationToPx', () => {
  it('converts month and duration to pixels', () => {
    expect(monthToPx(3, 100)).toBe(300)
    expect(durationToPx(2, 100)).toBe(200)
  })
})

describe('clampBar', () => {
  it('keeps a valid bar unchanged', () => {
    expect(clampBar(3, 2)).toEqual({ startMonth: 3, duration: 2 })
  })
  it('forces duration to at least 1', () => {
    expect(clampBar(3, 0)).toEqual({ startMonth: 3, duration: 1 })
  })
  it('pulls a bar that overflows the right edge back inside', () => {
    // start 10, duration 5 would end at 15; max end is 12 (exclusive)
    expect(clampBar(10, 5)).toEqual({ startMonth: 7, duration: 5 })
  })
  it('never lets startMonth go below 0', () => {
    expect(clampBar(-3, 2)).toEqual({ startMonth: 0, duration: 2 })
  })
})
