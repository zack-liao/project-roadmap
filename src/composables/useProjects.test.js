import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useProjects } from './useProjects.js'

// 時間軸起點 2026-07 → BASE = 2026*12 + 6
const BASE = 2026 * 12 + 6

beforeEach(() => {
  let n = 0
  vi.stubGlobal('crypto', { randomUUID: () => `id-${++n}` })
})

// 行為比照 Worker:保存整份 state,回傳 API 形狀(startAbs、categoryId)的資料
function createFakeClient(initial = { categories: [], projects: [] }) {
  const state = structuredClone(initial)
  const calls = []
  const fail = new Map()

  function record(name, ...args) {
    calls.push({ name, args })
    if (fail.has(name)) throw new Error(fail.get(name))
  }

  return {
    calls,
    state,
    failOn: (name, message) => fail.set(name, message),
    // 測試要直接改伺服器端狀態,模擬「本地樂觀更新與伺服器不一致」
    serverState: state,

    async getState() {
      record('getState')
      return structuredClone(state)
    },
    async replaceState(next) {
      record('replaceState', next)
      state.categories = structuredClone(next.categories)
      state.projects = structuredClone(next.projects)
      return structuredClone(state)
    },
    async createProject(p) {
      record('createProject', p)
      state.projects.push(structuredClone(p))
      return structuredClone(p)
    },
    async patchProject(id, patch) {
      record('patchProject', id, patch)
      const p = state.projects.find((x) => x.id === id)
      Object.assign(p, structuredClone(patch))
      return structuredClone(p)
    },
    async deleteProject(id) {
      record('deleteProject', id)
      state.projects = state.projects.filter((x) => x.id !== id)
      return null
    },
    async createCategory(c) {
      record('createCategory', c)
      state.categories.push(structuredClone(c))
      return structuredClone(c)
    },
    async patchCategory(id, patch) {
      record('patchCategory', id, patch)
      const c = state.categories.find((x) => x.id === id)
      Object.assign(c, structuredClone(patch))
      return structuredClone(c)
    },
    async deleteCategory(id) {
      record('deleteCategory', id)
      state.categories = state.categories.filter((x) => x.id !== id)
      for (const p of state.projects) if (p.categoryId === id) p.categoryId = null
      return null
    },
    async reorderCategories(ids) {
      record('reorderCategories', ids)
      state.categories.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
      return structuredClone(state)
    },
  }
}

const callNames = (client) => client.calls.map((c) => c.name)
const lastCall = (client, name) => [...client.calls].reverse().find((c) => c.name === name)

async function setup(initial) {
  const client = createFakeClient(initial)
  const store = useProjects(client)
  await store.loaded
  return { client, store }
}

describe('初次載入', () => {
  it('啟動時向 /api/state 取資料,不再讀 localStorage', async () => {
    const { client, store } = await setup()
    expect(callNames(client)).toEqual(['getState'])
    expect(store.ready.value).toBe(true)
  })

  it('把 startAbs 換算回目前起點的相對 startMonth', async () => {
    const { store } = await setup({
      categories: [{ id: 'c1', name: '官網', color: '#60a5fa' }],
      projects: [{ id: 'x', name: 'A', startAbs: BASE + 5, duration: 2, lane: 0, categoryId: 'c1' }],
    })
    expect(store.projects.value[0].startMonth).toBe(5)
    expect(store.categories.value).toHaveLength(1)
  })

  it('未排程的專案 startAbs null 載入成 startMonth null', async () => {
    const { store } = await setup({ categories: [], projects: [{ id: 'x', name: 'A', startAbs: null }] })
    expect(store.projects.value[0].startMonth).toBe(null)
  })

  it('載入失敗時記錄錯誤而不是整個炸掉', async () => {
    const client = createFakeClient()
    client.failOn('getState', '連不上')
    const store = useProjects(client)
    await store.loaded
    expect(store.syncError.value).toMatch(/連不上/)
    expect(store.projects.value).toEqual([])
  })
})

describe('專案', () => {
  it('新增時本地立刻出現,並以同一個 id 送出 POST', async () => {
    const { client, store } = await setup()
    const p = store.addProject({ name: 'A', summary: 's', owner: 'o', stakeholder: 'k' })

    expect(p.id).toBe('id-1')
    expect(p.startMonth).toBe(null)
    expect(p.duration).toBe(1)
    expect(store.projects.value).toHaveLength(1)

    await store.settled()
    expect(lastCall(client, 'createProject').args[0]).toMatchObject({ id: 'id-1', name: 'A', startAbs: null })
  })

  it('更新是淺層合併,未帶到的欄位保留', async () => {
    const { store } = await setup()
    const p = store.addProject({ name: 'A' })
    store.updateProject(p.id, { startMonth: 3, duration: 2, lane: 0 })

    expect(store.projects.value[0].startMonth).toBe(3)
    expect(store.projects.value[0].name).toBe('A')
  })

  it('送出的 PATCH 用絕對座標 startAbs', async () => {
    const { client, store } = await setup()
    const p = store.addProject({ name: 'A' })
    store.updateProject(p.id, { startMonth: 3.25, lane: 0 })
    await store.settled()

    expect(lastCall(client, 'patchProject').args[1]).toEqual({ startAbs: BASE + 3.25, lane: 0 })
  })

  it('patch 沒帶 startMonth 時不送 startAbs,免得把排程清掉', async () => {
    const { client, store } = await setup({
      categories: [], projects: [{ id: 'x', name: 'A', startAbs: BASE + 5, duration: 2, lane: 0 }],
    })
    store.updateProject('x', { duration: 3 })
    await store.settled()

    expect(lastCall(client, 'patchProject').args[1]).toEqual({ duration: 3 })
    expect(client.serverState.projects[0].startAbs).toBe(BASE + 5)
  })

  it('拖曳造成的連續更新合併成一次 PATCH', async () => {
    const { client, store } = await setup()
    const p = store.addProject({ name: 'A' })
    for (let m = 0; m < 10; m++) store.updateProject(p.id, { startMonth: m, lane: 0 })
    await store.settled()

    expect(client.calls.filter((c) => c.name === 'patchProject')).toHaveLength(1)
    expect(lastCall(client, 'patchProject').args[1]).toEqual({ startAbs: BASE + 9, lane: 0 })
  })

  it('刪除後本地消失,並送出 DELETE', async () => {
    const { client, store } = await setup()
    const p = store.addProject({ name: 'A' })
    store.removeProject(p.id)
    await store.settled()

    expect(store.projects.value).toHaveLength(0)
    expect(client.serverState.projects).toHaveLength(0)
  })

  it('刪除排在更新之後送出,不會對已刪除的資料下 PATCH', async () => {
    const { client, store } = await setup()
    const p = store.addProject({ name: 'A' })
    store.updateProject(p.id, { duration: 4 })
    store.removeProject(p.id)
    await store.settled()

    expect(callNames(client)).toEqual(['getState', 'createProject', 'patchProject', 'deleteProject'])
  })

  it('更新不存在的 id 不會送出任何請求', async () => {
    const { client, store } = await setup()
    store.updateProject('nope', { duration: 2 })
    await store.settled()
    expect(callNames(client)).toEqual(['getState'])
  })
})

describe('類別', () => {
  it('新增後本地立刻出現並送出 POST', async () => {
    const { client, store } = await setup()
    const c = store.addCategory({ name: '官網', color: '#60a5fa' })
    await store.settled()

    expect(store.categories.value).toEqual([{ id: c.id, name: '官網', color: '#60a5fa' }])
    expect(lastCall(client, 'createCategory').args[0]).toEqual({ id: c.id, name: '官網', color: '#60a5fa' })
  })

  it('更新類別', async () => {
    const { store } = await setup()
    const c = store.addCategory({ name: '官網', color: '#60a5fa' })
    store.updateCategory(c.id, { name: '官網 2.0', color: '#34d399' })

    expect(store.categories.value[0]).toEqual({ id: c.id, name: '官網 2.0', color: '#34d399' })
  })

  it('刪除類別時底下的專案留著,categoryId 清成 null', async () => {
    const { client, store } = await setup()
    const c = store.addCategory({ name: '官網' })
    const p = store.addProject({ name: 'A' })
    store.updateProject(p.id, { categoryId: c.id })
    store.removeCategory(c.id)
    await store.settled()

    expect(store.projects.value).toHaveLength(1)
    expect(store.projects.value[0].categoryId).toBe(null)
    expect(client.serverState.projects[0].categoryId).toBe(null)
  })

  it('新專案預設沒有類別', async () => {
    const { store } = await setup()
    expect(store.addProject({ name: 'A' }).categoryId).toBe(null)
  })
})

describe('moveCategory', () => {
  it('搬到新位置後把整串新順序送給後端', async () => {
    const { client, store } = await setup()
    const a = store.addCategory({ name: 'A' })
    const b = store.addCategory({ name: 'B' })
    const c = store.addCategory({ name: 'C' })

    store.moveCategory(c.id, 0)
    expect(store.categories.value.map((x) => x.name)).toEqual(['C', 'A', 'B'])

    store.moveCategory(a.id, 2)
    expect(store.categories.value.map((x) => x.name)).toEqual(['C', 'B', 'A'])

    await store.settled()
    expect(lastCall(client, 'reorderCategories').args[0]).toEqual([c.id, b.id, a.id])
    expect(client.serverState.categories.map((x) => x.name)).toEqual(['C', 'B', 'A'])
  })

  it('未知 id 不動,index 會被夾在範圍內', async () => {
    const { client, store } = await setup()
    const a = store.addCategory({ name: 'A' })
    store.addCategory({ name: 'B' })

    store.moveCategory('nope', 0)
    store.moveCategory(a.id, 99)

    expect(store.categories.value.map((x) => x.name)).toEqual(['B', 'A'])
    await store.settled()
    expect(client.calls.filter((c) => c.name === 'reorderCategories')).toHaveLength(1)
  })
})

describe('同步失敗', () => {
  it('寫入失敗時顯示錯誤,並重新載入回伺服器的真實狀態', async () => {
    const { client, store } = await setup({
      categories: [], projects: [{ id: 'x', name: 'A', startAbs: BASE + 5, duration: 2, lane: 0 }],
    })
    client.failOn('patchProject', '伺服器錯誤')

    store.updateProject('x', { duration: 9 })
    expect(store.projects.value[0].duration).toBe(9)   // 樂觀更新先畫上去

    await store.settled()
    expect(store.syncError.value).toMatch(/伺服器錯誤/)
    expect(store.projects.value[0].duration).toBe(2)   // 再被伺服器狀態校正回來
  })
})

describe('匯出 / 匯入', () => {
  const asFile = (data) => ({ text: async () => JSON.stringify(data) })

  it('匯出的內容帶絕對座標 startAbs', async () => {
    const { store } = await setup()
    const p = store.addProject({ name: 'A' })
    store.updateProject(p.id, { startMonth: 1.5, lane: 0 })

    expect(store.toArray().projects[0].startAbs).toBe(BASE + 1.5)
    expect(store.toArray().projects[0].startMonth).toBeUndefined()
  })

  it('匯入整包覆寫後端,回傳筆數', async () => {
    const { client, store } = await setup()
    const count = await store.importJSON(asFile({
      categories: [{ id: 'c1', name: '官網', color: '#f00' }],
      projects: [{ id: 'x', name: 'A', startAbs: BASE + 2, duration: 1, lane: 0, categoryId: 'c1' }],
    }))

    expect(count).toBe(1)
    expect(callNames(client)).toContain('replaceState')
    expect(store.projects.value[0].startMonth).toBe(2)
    expect(store.categories.value).toHaveLength(1)
  })

  it('吃得下舊版的純陣列匯入檔', async () => {
    const { store } = await setup()
    const count = await store.importJSON(asFile([{ id: 'x', name: 'Old', startMonth: 2, duration: 1, lane: 0 }]))

    expect(count).toBe(1)
    expect(store.categories.value).toEqual([])
    expect(store.projects.value[0].startMonth).toBe(2)
  })

  it('格式錯誤時丟出錯誤,不碰後端', async () => {
    const { client, store } = await setup()
    await expect(store.importJSON(asFile({ nope: true }))).rejects.toThrow(/格式錯誤/)
    expect(callNames(client)).not.toContain('replaceState')
  })
})
