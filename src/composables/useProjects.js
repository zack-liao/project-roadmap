import { ref, shallowRef } from 'vue'
import { createSyncQueue } from './syncQueue.js'
import { TIMELINE_START_YEAR, TIMELINE_START_MONTH } from '../constants.js'

// 後端存絕對月座標 startAbs(年*12+月+小數),與時間軸起點脫鉤:
// 起點常數改版時,已存資料的日期不會跟著位移(39f9cdb 起點從 2026-01 改
// 2026-07 曾使舊資料整批平移 6 個月)。記憶體內仍用相對 offset startMonth。
const ORIGIN_ABS = TIMELINE_START_YEAR * 12 + TIMELINE_START_MONTH

function fromApi(p) {
  const { startAbs, ...rest } = p
  return {
    categoryId: null,
    ...rest,
    startMonth: typeof startAbs === 'number' ? startAbs - ORIGIN_ABS : null,
  }
}

function toApi(p) {
  const { startMonth, ...rest } = p
  return {
    ...rest,
    startAbs: typeof startMonth === 'number' ? startMonth + ORIGIN_ABS : null,
  }
}

// patch 可能只帶部分欄位,沒帶 startMonth 時不可以擅自塞 startAbs: null 把排程清掉
function patchToApi(patch) {
  if (!Object.prototype.hasOwnProperty.call(patch, 'startMonth')) return { ...patch }
  return toApi(patch)
}

// 匯入檔可能是舊版的純陣列,或舊到只有相對 startMonth 的專案
function normalizeImport(data) {
  const raw = Array.isArray(data) ? { categories: [], projects: data } : data
  const categories = Array.isArray(raw?.categories) ? raw.categories : []
  const projects = Array.isArray(raw?.projects) ? raw.projects : []

  return {
    categories: categories.map((c) => ({ id: c.id, name: c.name ?? '', color: c.color ?? '#60a5fa' })),
    projects: projects.map((p) => {
      const startAbs = typeof p.startAbs === 'number'
        ? p.startAbs
        : (typeof p.startMonth === 'number' ? p.startMonth + ORIGIN_ABS : null)
      return {
        id: p.id,
        name: p.name ?? '',
        summary: p.summary ?? '',
        owner: p.owner ?? '',
        stakeholder: p.stakeholder ?? '',
        startAbs,
        duration: p.duration ?? 1,
        lane: p.lane ?? null,
        categoryId: p.categoryId ?? null,
      }
    }),
  }
}

// 搬家前的舊資料住在 localStorage。搬完不刪,改名留一份備份。
const LEGACY_KEY = 'roadmap.projects'
const LEGACY_BACKUP_KEY = 'roadmap.projects.migrated-backup'

function readLegacy() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const payload = normalizeImport(JSON.parse(raw))
    if (payload.projects.length === 0 && payload.categories.length === 0) return null
    return payload
  } catch {
    // 沒有 localStorage(SSR / 測試)或內容壞掉,當作沒有舊資料
    return null
  }
}

// client 由呼叫端提供(createApiClient 或測試用的替身),
// 因為它需要帶上登入後才拿得到的通行證
export function useProjects(client) {
  const projects = ref([])
  const categories = ref([])
  // 第一次載入完成前,畫面上是空的 roadmap 而不是「沒有資料」
  const ready = ref(false)
  const syncError = ref(null)
  // 偵測到、但還沒搬進資料庫的舊 localStorage 資料。
  // 用 shallowRef:這是要原封送出去的惰性資料,包成深層 proxy 只會讓送出時多一層代理。
  const legacy = shallowRef(null)

  function apply(state) {
    projects.value = (state?.projects ?? []).map(fromApi)
    categories.value = state?.categories ?? []
  }

  async function reload() {
    apply(await client.getState())
    ready.value = true
    // 只有在資料庫是空的時候才提議搬家,否則搬家會覆蓋掉大家正在用的資料
    legacy.value = projects.value.length === 0 && categories.value.length === 0
      ? readLegacy()
      : null
  }

  const queue = createSyncQueue({
    onError: async (err) => {
      syncError.value = err?.message ?? '與伺服器同步失敗'
      // 樂觀更新已經畫在畫面上卻沒寫進資料庫,重新拉一次回到伺服器的真實狀態
      try {
        await reload()
      } catch { /* 連重讀都失敗就維持現狀,錯誤訊息已經顯示了 */ }
    },
  })

  // 登入之後才由上層啟動:沒有通行證就不該去打 /api,只會換來一串 401
  async function start() {
    try {
      await reload()
    } catch (err) {
      syncError.value = `讀取資料失敗:${err.message}`
    }
  }

  // 登出時把畫面清乾淨,不把上一個人的資料留在螢幕上
  function reset() {
    projects.value = []
    categories.value = []
    legacy.value = null
    syncError.value = null
    ready.value = false
  }

  function addProject(fields) {
    const p = {
      id: crypto.randomUUID(),
      name: fields.name ?? '',
      summary: fields.summary ?? '',
      owner: fields.owner ?? '',
      stakeholder: fields.stakeholder ?? '',
      startMonth: null,
      duration: 1,
      lane: null,
      categoryId: null,
      imageKey: fields.imageKey ?? null,
    }
    projects.value.push(p)
    // id 由前端產生並一起送出,後端沿用,樂觀更新才不需要事後換 id
    const payload = toApi(p)
    queue.enqueue(() => client.createProject(payload))
    return p
  }

  function updateProject(id, patch) {
    const p = projects.value.find((x) => x.id === id)
    if (!p) return
    Object.assign(p, patch)
    queue.enqueuePatch(`project:${id}`, patchToApi(patch), (merged) => client.patchProject(id, merged))
  }

  function removeProject(id) {
    if (!projects.value.some((x) => x.id === id)) return
    projects.value = projects.value.filter((x) => x.id !== id)
    queue.enqueue(() => client.deleteProject(id))
  }

  function addCategory(fields) {
    const c = {
      id: crypto.randomUUID(),
      name: fields.name ?? '',
      color: fields.color ?? '#60a5fa',
    }
    categories.value.push(c)
    const payload = { ...c }
    queue.enqueue(() => client.createCategory(payload))
    return c
  }

  function updateCategory(id, patch) {
    const c = categories.value.find((x) => x.id === id)
    if (!c) return
    Object.assign(c, patch)
    queue.enqueuePatch(`category:${id}`, { ...patch }, (merged) => client.patchCategory(id, merged))
  }

  function moveCategory(id, toIndex) {
    const from = categories.value.findIndex((x) => x.id === id)
    if (from === -1) return
    const to = Math.max(0, Math.min(categories.value.length - 1, toIndex))
    const [c] = categories.value.splice(from, 1)
    categories.value.splice(to, 0, c)

    const ids = categories.value.map((x) => x.id)
    queue.enqueue(() => client.reorderCategories(ids))
  }

  function removeCategory(id) {
    if (!categories.value.some((x) => x.id === id)) return
    categories.value = categories.value.filter((x) => x.id !== id)
    // 後端靠 FK 的 ON DELETE SET NULL 做同一件事,這裡同步本地畫面
    for (const p of projects.value) {
      if (p.categoryId === id) p.categoryId = null
    }
    queue.enqueue(() => client.deleteCategory(id))
  }

  function toArray() {
    return JSON.parse(JSON.stringify({
      categories: categories.value,
      projects: projects.value.map(toApi),
    }))
  }

  function exportJSON() {
    const data = JSON.stringify(toArray(), null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'roadmap.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function importJSON(file) {
    const text = await file.text()
    const data = JSON.parse(text)
    const isLegacy = Array.isArray(data)
    if (!isLegacy && (typeof data !== 'object' || data === null || !Array.isArray(data.projects))) {
      throw new Error('格式錯誤:需要陣列或 { categories, projects }')
    }

    const payload = normalizeImport(data)
    // 先把排隊中的寫入送完,否則它們會蓋在整包覆寫之後
    await queue.settled()
    apply(await client.replaceState(payload))
    return payload.projects.length
  }

  // 一次性搬家:把這台瀏覽器裡的舊 roadmap 寫進資料庫
  async function migrateLegacy() {
    const payload = legacy.value
    if (!payload) return 0

    await queue.settled()
    apply(await client.replaceState(payload))

    // 搬完才動 localStorage,而且是改名不是刪除,搬錯還救得回來
    try {
      const raw = localStorage.getItem(LEGACY_KEY)
      if (raw !== null) {
        localStorage.setItem(LEGACY_BACKUP_KEY, raw)
        localStorage.removeItem(LEGACY_KEY)
      }
    } catch { /* 存不進備份不該讓搬家失敗,資料已經在資料庫裡了 */ }

    legacy.value = null
    return payload.projects.length
  }

  function dismissLegacy() {
    legacy.value = null
  }

  return {
    projects, addProject, updateProject, removeProject,
    categories, addCategory, updateCategory, removeCategory, moveCategory,
    toArray, exportJSON, importJSON,
    ready, syncError, reload, start, reset, flush: queue.flush, settled: queue.settled,
    legacy, migrateLegacy, dismissLegacy,
  }
}
