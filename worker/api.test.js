import { describe, it, expect, beforeEach } from 'vitest'
import { handleApi } from './api.js'
import { createFakeD1 } from './test/fake-d1.js'

let db

// handleApi 收到的是已經通過驗證的使用者;驗證本身在 auth.test.js
const USER = { id: 'google-sub-1', email: 'zack@hexschool.com', name: 'Zack', picture: '' }

beforeEach(() => {
  db = createFakeD1()
})

function call(method, path, body) {
  const init = { method }
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body)
    init.headers = { 'content-type': 'application/json' }
  }
  return handleApi(new Request(`https://example.com${path}`, init), db, USER)
}

async function state() {
  return (await call('GET', '/api/state')).json()
}

const newCategory = (name) => call('POST', '/api/categories', { name })
const newProject = (fields) => call('POST', '/api/projects', fields)

describe('GET /api/state', () => {
  it('空資料庫回空的 categories 與 projects', async () => {
    expect(await state()).toEqual({ categories: [], projects: [] })
  })

  it('不讓中間層快取舊的 roadmap', async () => {
    const res = await call('GET', '/api/state')
    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})

describe('專案 CRUD', () => {
  it('建立回 201 並出現在 state 裡', async () => {
    const res = await newProject({ name: '改版', owner: 'zack' })
    expect(res.status).toBe(201)

    const created = await res.json()
    expect(created).toMatchObject({ name: '改版', owner: 'zack', startAbs: null, duration: 1 })
    expect((await state()).projects).toHaveLength(1)
  })

  it('PATCH 只改帶到的欄位，其餘保持原值', async () => {
    const { id } = await (await newProject({ name: '改版', owner: 'zack' })).json()

    const updated = await (await call('PATCH', `/api/projects/${id}`, { startAbs: 24318, duration: 3 })).json()
    expect(updated).toMatchObject({ name: '改版', owner: 'zack', startAbs: 24318, duration: 3 })
  })

  it('PATCH startAbs 為 null 可以把專案退回未排程', async () => {
    const { id } = await (await newProject({ name: '改版', startAbs: 24318 })).json()

    const updated = await (await call('PATCH', `/api/projects/${id}`, { startAbs: null })).json()
    expect(updated.startAbs).toBeNull()
  })

  it('DELETE 回 204 且資料真的消失', async () => {
    const { id } = await (await newProject({ name: '改版' })).json()

    expect((await call('DELETE', `/api/projects/${id}`)).status).toBe(204)
    expect((await state()).projects).toEqual([])
  })

  it.each(['PATCH', 'DELETE'])('%s 不存在的 id 回 404', async (method) => {
    const res = await call(method, '/api/projects/nope', method === 'PATCH' ? { name: 'x' } : undefined)
    expect(res.status).toBe(404)
  })

  it('categoryId 指向不存在的分類時回 400 而不是 500', async () => {
    const res = await newProject({ name: '改版', categoryId: 'ghost' })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/categoryId/)
  })
})

describe('分類', () => {
  it('依建立順序排列', async () => {
    await newCategory('平台')
    await newCategory('成長')

    expect((await state()).categories.map((c) => c.name)).toEqual(['平台', '成長'])
  })

  it('PUT /api/categories/order 重排，而不是被當成 id 為 order 的分類', async () => {
    const a = await (await newCategory('平台')).json()
    const b = await (await newCategory('成長')).json()

    const res = await call('PUT', '/api/categories/order', { ids: [b.id, a.id] })
    expect(res.status).toBe(200)
    expect((await res.json()).categories.map((c) => c.name)).toEqual(['成長', '平台'])
  })

  it('刪掉分類時底下的專案保留，只把 categoryId 清成 null', async () => {
    const c = await (await newCategory('平台')).json()
    await newProject({ name: '改版', categoryId: c.id })

    expect((await call('DELETE', `/api/categories/${c.id}`)).status).toBe(204)

    const after = await state()
    expect(after.categories).toEqual([])
    expect(after.projects).toHaveLength(1)
    expect(after.projects[0].categoryId).toBeNull()
  })
})

describe('PUT /api/state', () => {
  it('整包覆寫並回傳覆寫後的狀態', async () => {
    await newCategory('舊的')
    await newProject({ name: '舊專案' })

    const res = await call('PUT', '/api/state', {
      categories: [{ id: 'c1', name: '平台', color: '#f00' }],
      projects: [{ id: 'p1', name: '匯入的', categoryId: 'c1', startAbs: 24318, duration: 2 }],
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      categories: [{ id: 'c1', name: '平台', color: '#f00', createdBy: USER.id }],
      projects: [{
        id: 'p1', name: '匯入的', summary: '', owner: '', stakeholder: '',
        startAbs: 24318, duration: 2, lane: null, categoryId: 'c1', createdBy: USER.id,
      }],
    })
  })

  it('保留匯入檔的分類順序', async () => {
    await call('PUT', '/api/state', {
      categories: [{ id: 'b', name: 'B' }, { id: 'a', name: 'A' }],
      projects: [],
    })
    expect((await state()).categories.map((c) => c.id)).toEqual(['b', 'a'])
  })

  it('匯入檔有壞資料時整包不進去，舊資料留著', async () => {
    await newProject({ name: '舊專案' })

    const res = await call('PUT', '/api/state', {
      categories: [],
      projects: [{ name: '好的' }, { name: '壞的', duration: 0 }],
    })

    expect(res.status).toBe(400)
    expect((await state()).projects.map((p) => p.name)).toEqual(['舊專案'])
  })
})

describe('錯誤處理', () => {
  it('不合法的 JSON body 回 400', async () => {
    expect((await call('POST', '/api/projects', '{nope')).status).toBe(400)
  })

  it('body 是陣列而不是物件時回 400', async () => {
    expect((await call('POST', '/api/projects', [])).status).toBe(400)
  })

  it('不支援的 method 回 405', async () => {
    expect((await call('DELETE', '/api/state')).status).toBe(405)
  })

  it('未知路徑回 404', async () => {
    expect((await call('GET', '/api/nope')).status).toBe(404)
  })
})

describe('資料出處', () => {
  it('建立的專案記下是誰建的,用 token 的 sub 不是 email', async () => {
    const created = await (await newProject({ name: '改版' })).json()
    expect(created.createdBy).toBe('google-sub-1')
  })

  it('建立的分類也記下出處', async () => {
    const created = await (await newCategory('平台')).json()
    expect(created.createdBy).toBe('google-sub-1')
  })

  it('前端自己送 createdBy 會被忽略,出處只由 token 決定', async () => {
    const created = await (await newProject({ name: '改版', createdBy: '冒充的' })).json()
    expect(created.createdBy).toBe('google-sub-1')
  })

  it('大家看到同一份資料,不會因為出處不同被濾掉', async () => {
    await newProject({ name: '我建的' })
    // 換一個人建立
    await handleApi(
      new Request('https://example.com/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: '別人建的' }),
        headers: { 'content-type': 'application/json' },
      }),
      db,
      { id: 'google-sub-2', email: 'other@hexschool.com' },
    )

    const after = await state()
    expect(after.projects.map((p) => p.name)).toEqual(['我建的', '別人建的'])
    expect(after.projects.map((p) => p.createdBy)).toEqual(['google-sub-1', 'google-sub-2'])
  })
})
