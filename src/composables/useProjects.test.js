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
