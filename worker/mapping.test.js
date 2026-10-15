import { describe, it, expect } from 'vitest'
import {
  buildProjectCreate, buildProjectPatch,
  buildCategoryCreate, buildCategoryPatch,
  rowToProject, rowToCategory, parseState, parseIdList,
} from './mapping.js'

const id = () => 'generated-id'

describe('buildProjectCreate', () => {
  it('缺的欄位補預設值，未排程的專案 start_abs 是 null', () => {
    expect(buildProjectCreate({ name: '改版' }, id)).toEqual({
      id: 'generated-id',
      columns: {
        name: '改版', summary: '', owner: '', stakeholder: '',
        start_abs: null, duration: 1, lane: null, category_id: null, image_key: null,
      },
    })
  })

  it('沿用前端帶來的 id，樂觀更新才不用換 id', () => {
    expect(buildProjectCreate({ id: 'from-client' }, id).id).toBe('from-client')
  })

  it('API 的 camelCase 對應到資料表的 snake_case 欄位', () => {
    const { columns } = buildProjectCreate({ startAbs: 24318.5, categoryId: 'c1' }, id)
    expect(columns.start_abs).toBe(24318.5)
    expect(columns.category_id).toBe('c1')
  })

  it('未知欄位忽略而不是報錯', () => {
    expect(buildProjectCreate({ nope: 1 }, id).columns).not.toHaveProperty('nope')
  })

  it.each([
    ['name 不是字串', { name: 1 }],
    ['duration 為 0', { duration: 0 }],
    ['duration 不是整數', { duration: 1.5 }],
    ['startAbs 是字串', { startAbs: '2026-01' }],
    ['startAbs 是 NaN', { startAbs: NaN }],
    ['lane 不是整數', { lane: 1.2 }],
    ['categoryId 是空字串', { categoryId: '' }],
  ])('%s 時丟 400', (_label, input) => {
    expect(() => buildProjectCreate(input, id)).toThrowError(expect.objectContaining({ status: 400 }))
  })
})

describe('buildProjectPatch', () => {
  it('只帶到的欄位才進 SET，沒帶的不會被預設值蓋掉', () => {
    expect(buildProjectPatch({ duration: 3 })).toEqual({ duration: 3 })
  })

  it('明確傳 null 可以把排程清空', () => {
    expect(buildProjectPatch({ startAbs: null })).toEqual({ start_abs: null })
  })

  it('空物件丟 400，避免組出壞掉的 UPDATE', () => {
    expect(() => buildProjectPatch({})).toThrowError(expect.objectContaining({ status: 400 }))
  })
})

describe('category 對應', () => {
  it('舊資料沒有 created_by 時回 null 而不是 undefined', () => {
    expect(rowToCategory({ id: 'c1', name: '平台', color: '#f00' }).createdBy).toBe(null)
  })

  it('建立時補預設顏色', () => {
    expect(buildCategoryCreate({ name: '平台' }, id).columns).toEqual({ name: '平台', color: '#60a5fa' })
  })

  it('patch 只動帶到的欄位', () => {
    expect(buildCategoryPatch({ color: '#f00' })).toEqual({ color: '#f00' })
  })

  it('rowToCategory 不外露 position', () => {
    expect(rowToCategory({ id: 'c1', name: '平台', color: '#f00', position: 3, created_by: 'sub-1' })).toEqual({
      id: 'c1', name: '平台', color: '#f00', createdBy: 'sub-1',
    })
  })
})

describe('rowToProject', () => {
  it('把資料列轉回前端用的 camelCase 形狀', () => {
    expect(rowToProject({
      id: 'p1', name: '改版', summary: 's', owner: 'o', stakeholder: 'st',
      start_abs: 24318, duration: 2, lane: 0, category_id: 'c1',
      created_by: 'sub-1', created_at: 'x', updated_at: 'y',
    })).toEqual({
      id: 'p1', name: '改版', summary: 's', owner: 'o', stakeholder: 'st',
      startAbs: 24318, duration: 2, lane: 0, categoryId: 'c1',
      imageKey: null, createdBy: 'sub-1',
    })
  })
})

describe('parseState', () => {
  it('categories 省略時當成空陣列', () => {
    expect(parseState({ projects: [] }).categories).toEqual([])
  })

  it('projects 不是陣列時丟 400', () => {
    expect(() => parseState({})).toThrowError(expect.objectContaining({ status: 400 }))
  })
})

describe('parseIdList', () => {
  it('回傳字串陣列', () => {
    expect(parseIdList({ ids: ['a', 'b'] })).toEqual(['a', 'b'])
  })

  it('元素不是字串時丟 400', () => {
    expect(() => parseIdList({ ids: [1] })).toThrowError(expect.objectContaining({ status: 400 }))
  })
})
