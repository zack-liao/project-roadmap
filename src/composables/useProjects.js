import { ref, watch } from 'vue'
import { STORAGE_KEY, TIMELINE_START_YEAR, TIMELINE_START_MONTH } from '../constants.js'

// 持久化用絕對月座標 startAbs（年*12+月+小數），與時間軸起點脫鉤：
// 起點常數改版時，已存資料的日期不會跟著位移（39f9cdb 起點從 2026-01 改
// 2026-07 曾使舊資料整批平移 6 個月）。記憶體內仍用相對 offset startMonth。
const ORIGIN_ABS = TIMELINE_START_YEAR * 12 + TIMELINE_START_MONTH

function fromStored(p) {
  const { startAbs, ...rest } = p
  return {
    categoryId: null,
    ...rest,
    startMonth: typeof startAbs === 'number' ? startAbs - ORIGIN_ABS : (p.startMonth ?? null),
  }
}

function toStorable(p) {
  const { startMonth, ...rest } = p
  return {
    ...rest,
    startAbs: typeof startMonth === 'number' ? startMonth + ORIGIN_ABS : null,
  }
}

// 儲存格式 { categories, projects }；讀到舊格式（純 projects 陣列）自動遷移
function normalize(data) {
  if (Array.isArray(data)) return { categories: [], projects: data }
  if (data && typeof data === 'object') {
    return {
      categories: Array.isArray(data.categories) ? data.categories : [],
      projects: Array.isArray(data.projects) ? data.projects : [],
    }
  }
  return { categories: [], projects: [] }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return normalize(raw ? JSON.parse(raw) : null)
  } catch {
    return { categories: [], projects: [] }
  }
}

export function useProjects() {
  const initial = load()
  const projects = ref(initial.projects.map(fromStored))
  const categories = ref(initial.categories)

  // 任何變化（深層）都自動存回 localStorage
  watch([projects, categories], () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      categories: categories.value,
      projects: projects.value.map(toStorable),
    }))
  }, { deep: true })

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
    }
    projects.value.push(p)
    return p
  }

  function updateProject(id, patch) {
    const p = projects.value.find((x) => x.id === id)
    if (p) Object.assign(p, patch)
  }

  function removeProject(id) {
    projects.value = projects.value.filter((x) => x.id !== id)
  }

  function addCategory(fields) {
    const c = {
      id: crypto.randomUUID(),
      name: fields.name ?? '',
      color: fields.color ?? '#60a5fa',
    }
    categories.value.push(c)
    return c
  }

  function updateCategory(id, patch) {
    const c = categories.value.find((x) => x.id === id)
    if (c) Object.assign(c, patch)
  }

  function removeCategory(id) {
    categories.value = categories.value.filter((x) => x.id !== id)
    for (const p of projects.value) {
      if (p.categoryId === id) p.categoryId = null
    }
  }

  function loadFromArray(data) {
    const norm = normalize(data)
    projects.value = norm.projects.map(fromStored)
    categories.value = norm.categories
  }

  function toArray() {
    return JSON.parse(JSON.stringify({
      categories: categories.value,
      projects: projects.value.map(toStorable),
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

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result)
          const isLegacy = Array.isArray(data)
          if (!isLegacy && (typeof data !== 'object' || data === null || !Array.isArray(data.projects))) {
            throw new Error('格式錯誤：需要陣列或 { categories, projects }')
          }
          loadFromArray(data)
          resolve(isLegacy ? data.length : data.projects.length)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })
  }

  return {
    projects, addProject, updateProject, removeProject,
    categories, addCategory, updateCategory, removeCategory,
    loadFromArray, toArray, exportJSON, importJSON,
  }
}
