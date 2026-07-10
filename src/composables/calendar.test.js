import { describe, it, expect } from 'vitest'
import { buildColumns, buildYearGroups, dateToOffset, offsetToYearMonth, formatYearMonth } from './calendar.js'

describe('buildColumns', () => {
  const cols = buildColumns(2026, 6, 18) // Jul 2026 起 18 個月

  it('produces one column per month', () => {
    expect(cols).toHaveLength(18)
  })
  it('starts at Jul 2026 (numeric label 7)', () => {
    expect(cols[0]).toMatchObject({ index: 0, year: 2026, month: 6, label: '7', isYearStart: true })
  })
  it('rolls over into next year at Jan (label 1)', () => {
    expect(cols[6]).toMatchObject({ year: 2027, month: 0, label: '1', isYearStart: true })
  })
  it('ends at Dec 2027 (label 12)', () => {
    expect(cols[17]).toMatchObject({ year: 2027, month: 11, label: '12' })
  })
})

describe('buildYearGroups', () => {
  it('groups columns by year with correct spans', () => {
    const cols = buildColumns(2026, 6, 18)
    expect(buildYearGroups(cols)).toEqual([
      { year: 2026, span: 6 },
      { year: 2027, span: 12 },
    ])
  })
})

describe('offsetToYearMonth / formatYearMonth', () => {
  it('maps offset 0 to the start year-month', () => {
    expect(offsetToYearMonth(0, 2026, 6)).toEqual({ year: 2026, month: 7 })
    expect(formatYearMonth(0, 2026, 6)).toBe('2026-07')
  })
  it('rolls into next year and floors fractional offsets', () => {
    expect(offsetToYearMonth(6.75, 2026, 6)).toEqual({ year: 2027, month: 1 })
    expect(formatYearMonth(6.75, 2026, 6)).toBe('2027-01')
  })
})

describe('dateToOffset', () => {
  it('returns 0 at the very start month day 1', () => {
    expect(dateToOffset(new Date(2026, 6, 1), 2026, 6)).toBe(0)
  })
  it('adds within-month day fraction', () => {
    // 2026-07-16：July 有 31 天，(16-1)/31 ≈ 0.4839
    expect(dateToOffset(new Date(2026, 6, 16), 2026, 6)).toBeCloseTo(15 / 31, 5)
  })
  it('counts whole months across the range', () => {
    // 2027-01-01 距 2026-07 = 6 個月
    expect(dateToOffset(new Date(2027, 0, 1), 2026, 6)).toBe(6)
  })
})
