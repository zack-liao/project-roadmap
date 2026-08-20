import { describe, it, expect, beforeEach, vi } from 'vitest'

// 在 node 環境模擬 localStorage
beforeEach(() => {
  const store = {}
  vi.stubGlobal('localStorage', {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
  })
  // 模擬 crypto.randomUUID
  let n = 0
  vi.stubGlobal('crypto', { randomUUID: () => `id-${++n}` })
})

import { useProjects } from './useProjects.js'
import { nextTick } from 'vue'

describe('useProjects', () => {
  it('adds a project with generated id and defaults', () => {
    const { projects, addProject } = useProjects()
    const p = addProject({ name: 'A', summary: 's', owner: 'o', stakeholder: 'k' })
    expect(p.id).toBe('id-1')
    expect(p.startMonth).toBe(null)
    expect(p.duration).toBe(1)
    expect(p.lane).toBe(null)
    expect(projects.value).toHaveLength(1)
  })

  it('updates a project by id (shallow merge)', () => {
    const { projects, addProject, updateProject } = useProjects()
    const p = addProject({ name: 'A', summary: '', owner: '', stakeholder: '' })
    updateProject(p.id, { startMonth: 3, duration: 2, lane: 0 })
    expect(projects.value[0].startMonth).toBe(3)
    expect(projects.value[0].name).toBe('A')
  })

  it('removes a project by id', () => {
    const { projects, addProject, removeProject } = useProjects()
    const p = addProject({ name: 'A', summary: '', owner: '', stakeholder: '' })
    removeProject(p.id)
    expect(projects.value).toHaveLength(0)
  })

  it('persists to localStorage on change', async () => {
    const { addProject } = useProjects()
    addProject({ name: 'A', summary: '', owner: '', stakeholder: '' })
    await nextTick()
    const saved = JSON.parse(localStorage.getItem('roadmap.projects'))
    expect(saved.projects).toHaveLength(1)
    expect(saved.projects[0].name).toBe('A')
    expect(saved.categories).toEqual([])
  })

  it('loadFromArray replaces the whole list', () => {
    const { projects, loadFromArray } = useProjects()
    loadFromArray([{ id: 'x', name: 'X', summary: '', owner: '', stakeholder: '', startMonth: 0, duration: 1, lane: 0 }])
    expect(projects.value).toHaveLength(1)
    expect(projects.value[0].id).toBe('x')
  })
})

describe('categories', () => {
  it('starts empty and adds a category with id, name, color', () => {
    const { categories, addCategory } = useProjects()
    expect(categories.value).toEqual([])
    const c = addCategory({ name: '官網', color: '#60a5fa' })
    expect(c.id).toBeTruthy()
    expect(categories.value).toEqual([{ id: c.id, name: '官網', color: '#60a5fa' }])
  })

  it('updates a category by id', () => {
    const { categories, addCategory, updateCategory } = useProjects()
    const c = addCategory({ name: '官網', color: '#60a5fa' })
    updateCategory(c.id, { name: '官網 2.0', color: '#34d399' })
    expect(categories.value[0]).toEqual({ id: c.id, name: '官網 2.0', color: '#34d399' })
  })

  it('removing a category moves its projects to uncategorized (categoryId null)', () => {
    const { addCategory, removeCategory, addProject, projects } = useProjects()
    const c = addCategory({ name: '官網', color: '#60a5fa' })
    const p = addProject({ name: 'A' })
    p.categoryId = c.id
    removeCategory(c.id)
    expect(projects.value[0].categoryId).toBe(null)
    expect(projects.value).toHaveLength(1)
  })

  it('new projects default to categoryId null', () => {
    const { addProject } = useProjects()
    expect(addProject({ name: 'A' }).categoryId).toBe(null)
  })

  it('loads legacy array storage as projects with no categories', () => {
    localStorage.setItem('roadmap.projects', JSON.stringify([
      { id: 'x', name: 'Old', startMonth: 1, duration: 2, lane: 0 },
    ]))
    const { projects, categories } = useProjects()
    expect(projects.value).toHaveLength(1)
    expect(projects.value[0].categoryId).toBe(null)
    expect(categories.value).toEqual([])
  })

  it('loads object storage with categories and projects', () => {
    localStorage.setItem('roadmap.projects', JSON.stringify({
      categories: [{ id: 'c1', name: '官網', color: '#60a5fa' }],
      projects: [{ id: 'x', name: 'A', categoryId: 'c1' }],
    }))
    const { projects, categories } = useProjects()
    expect(categories.value).toHaveLength(1)
    expect(projects.value[0].categoryId).toBe('c1')
  })

  it('loadFromArray accepts legacy array payload', () => {
    const { loadFromArray, projects, categories } = useProjects()
    loadFromArray([{ id: 'x', name: 'A' }])
    expect(projects.value).toHaveLength(1)
    expect(categories.value).toEqual([])
  })

  it('loadFromArray accepts {categories, projects} payload', () => {
    const { loadFromArray, projects, categories } = useProjects()
    loadFromArray({ categories: [{ id: 'c1', name: '官網', color: '#60a5fa' }], projects: [{ id: 'x', name: 'A', categoryId: 'c1' }] })
    expect(categories.value).toHaveLength(1)
    expect(projects.value[0].categoryId).toBe('c1')
  })
})

describe('absolute date persistence', () => {
  // 時間軸起點 2026-07 → BASE = 2026*12 + 6
  const BASE = 2026 * 12 + 6

  it('persists startAbs (absolute month) instead of relative startMonth', async () => {
    const { addProject, updateProject } = useProjects()
    const p = addProject({ name: 'A' })
    updateProject(p.id, { startMonth: 3.25, lane: 0 })
    await nextTick()
    const saved = JSON.parse(localStorage.getItem('roadmap.projects'))
    expect(saved.projects[0].startAbs).toBe(BASE + 3.25)
    expect(saved.projects[0].startMonth).toBeUndefined()
  })

  it('unscheduled projects persist startAbs null', async () => {
    const { addProject } = useProjects()
    addProject({ name: 'A' })
    await nextTick()
    const saved = JSON.parse(localStorage.getItem('roadmap.projects'))
    expect(saved.projects[0].startAbs).toBe(null)
  })

  it('loads startAbs back into the current origin offset', () => {
    localStorage.setItem('roadmap.projects', JSON.stringify({
      categories: [],
      projects: [{ id: 'x', name: 'A', startAbs: BASE + 5, duration: 2, lane: 0 }],
    }))
    const { projects } = useProjects()
    expect(projects.value[0].startMonth).toBe(5)
  })

  it('startAbs survives a save/load round trip unchanged', async () => {
    localStorage.setItem('roadmap.projects', JSON.stringify({
      categories: [],
      projects: [{ id: 'x', name: 'A', startAbs: BASE + 5, duration: 2, lane: 0 }],
    }))
    const first = useProjects()
    first.updateProject('x', { duration: 3 })  // 觸發存檔，但沒動時間
    await nextTick()
    const saved = JSON.parse(localStorage.getItem('roadmap.projects'))
    expect(saved.projects[0].startAbs).toBe(BASE + 5)
  })

  it('legacy data with only startMonth still loads as offset', () => {
    localStorage.setItem('roadmap.projects', JSON.stringify([
      { id: 'x', name: 'Old', startMonth: 2, duration: 1, lane: 0 },
    ]))
    const { projects } = useProjects()
    expect(projects.value[0].startMonth).toBe(2)
  })

  it('export payload carries startAbs', () => {
    const { addProject, updateProject, toArray } = useProjects()
    const p = addProject({ name: 'A' })
    updateProject(p.id, { startMonth: 1.5, lane: 0 })
    expect(toArray().projects[0].startAbs).toBe(BASE + 1.5)
  })
})

describe('moveCategory', () => {
  it('moves a category to a new index', () => {
    const { categories, addCategory, moveCategory } = useProjects()
    const a = addCategory({ name: 'A', color: '#111111' })
    const b = addCategory({ name: 'B', color: '#222222' })
    const c = addCategory({ name: 'C', color: '#333333' })
    moveCategory(c.id, 0)
    expect(categories.value.map(x => x.name)).toEqual(['C', 'A', 'B'])
    moveCategory(a.id, 2)
    expect(categories.value.map(x => x.name)).toEqual(['C', 'B', 'A'])
  })

  it('ignores unknown ids and clamps index', () => {
    const { categories, addCategory, moveCategory } = useProjects()
    const a = addCategory({ name: 'A', color: '#111111' })
    addCategory({ name: 'B', color: '#222222' })
    moveCategory('nope', 0)
    moveCategory(a.id, 99)
    expect(categories.value.map(x => x.name)).toEqual(['B', 'A'])
  })
})
