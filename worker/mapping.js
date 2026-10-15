// D1 資料列 <-> API JSON 的轉換與欄位驗證。純函式，不碰 D1，單元測試直接打這裡。
import { badRequest } from './http.js'
import { isValidImageKey } from './images.js'

function asString(key, v) {
  if (typeof v !== 'string') throw badRequest(`${key} 必須是字串`)
  return v
}

function asNullableNumber(key, v) {
  if (v === null || v === undefined) return null
  if (typeof v !== 'number' || !Number.isFinite(v)) throw badRequest(`${key} 必須是數字或 null`)
  return v
}

function asPositiveInt(key, v) {
  if (!Number.isInteger(v) || v < 1) throw badRequest(`${key} 必須是 >= 1 的整數`)
  return v
}

function asNullableInt(key, v) {
  if (v === null || v === undefined) return null
  if (!Number.isInteger(v)) throw badRequest(`${key} 必須是整數或 null`)
  return v
}

// 只收我們自己發出去的 key 形狀,前端不能指定任意的 R2 物件路徑
function asNullableImageKey(key, v) {
  if (v === null || v === undefined) return null
  if (!isValidImageKey(v)) throw badRequest(`${key} 不是有效的圖片 key`)
  return v
}

function asNullableId(key, v) {
  if (v === null || v === undefined) return null
  if (typeof v !== 'string' || v === '') throw badRequest(`${key} 必須是非空字串或 null`)
  return v
}

// apiKey -> { column, parse, fallback }。fallback 只在「建立」時補，PATCH 不套用。
const PROJECT_FIELDS = {
  name: { column: 'name', parse: asString, fallback: '' },
  summary: { column: 'summary', parse: asString, fallback: '' },
  owner: { column: 'owner', parse: asString, fallback: '' },
  stakeholder: { column: 'stakeholder', parse: asString, fallback: '' },
  startAbs: { column: 'start_abs', parse: asNullableNumber, fallback: null },
  duration: { column: 'duration', parse: asPositiveInt, fallback: 1 },
  lane: { column: 'lane', parse: asNullableInt, fallback: null },
  categoryId: { column: 'category_id', parse: asNullableId, fallback: null },
  imageKey: { column: 'image_key', parse: asNullableImageKey, fallback: null },
}

const CATEGORY_FIELDS = {
  name: { column: 'name', parse: asString, fallback: '' },
  color: { column: 'color', parse: asString, fallback: '#60a5fa' },
}

// 未知欄位直接忽略（不報錯），避免前端多帶一個 key 就整個請求失敗
function buildColumns(fields, input, { partial }) {
  const columns = {}
  for (const [key, spec] of Object.entries(fields)) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      columns[spec.column] = spec.parse(key, input[key])
    } else if (!partial) {
      columns[spec.column] = spec.fallback
    }
  }
  return columns
}

// id 由前端帶（樂觀更新時前端已先用這個 id 畫出來了），沒帶才由伺服器補
function resolveId(input, newId) {
  if (!Object.prototype.hasOwnProperty.call(input, 'id') || input.id === undefined || input.id === null) {
    return newId()
  }
  if (typeof input.id !== 'string' || input.id === '') throw badRequest('id 必須是非空字串')
  return input.id
}

export function buildProjectCreate(input, newId = () => crypto.randomUUID()) {
  return { id: resolveId(input, newId), columns: buildColumns(PROJECT_FIELDS, input, { partial: false }) }
}

export function buildProjectPatch(input) {
  const columns = buildColumns(PROJECT_FIELDS, input, { partial: true })
  if (Object.keys(columns).length === 0) throw badRequest('沒有可更新的欄位')
  return columns
}

export function buildCategoryCreate(input, newId = () => crypto.randomUUID()) {
  return { id: resolveId(input, newId), columns: buildColumns(CATEGORY_FIELDS, input, { partial: false }) }
}

export function buildCategoryPatch(input) {
  const columns = buildColumns(CATEGORY_FIELDS, input, { partial: true })
  if (Object.keys(columns).length === 0) throw badRequest('沒有可更新的欄位')
  return columns
}

export function rowToProject(row) {
  return {
    id: row.id,
    name: row.name,
    summary: row.summary,
    owner: row.owner,
    stakeholder: row.stakeholder,
    startAbs: row.start_abs,
    duration: row.duration,
    lane: row.lane,
    categoryId: row.category_id,
    imageKey: row.image_key ?? null,
    createdBy: row.created_by ?? null,
  }
}

// position 不外露：順序由回傳陣列本身表達，重排走 PUT /api/categories/order
export function rowToCategory(row) {
  return { id: row.id, name: row.name, color: row.color, createdBy: row.created_by ?? null }
}

// 匯入用的整包 payload：{ categories, projects }
export function parseState(input) {
  const categories = Array.isArray(input.categories) ? input.categories : []
  const projects = Array.isArray(input.projects) ? input.projects : []
  if (!Array.isArray(input.projects)) throw badRequest('state.projects 必須是陣列')
  return {
    categories: categories.map((c) => buildCategoryCreate(c)),
    projects: projects.map((p) => buildProjectCreate(p)),
  }
}

export function parseIdList(input) {
  if (!Array.isArray(input.ids)) throw badRequest('ids 必須是字串陣列')
  return input.ids.map((id, i) => {
    if (typeof id !== 'string' || id === '') throw badRequest(`ids[${i}] 必須是非空字串`)
    return id
  })
}
