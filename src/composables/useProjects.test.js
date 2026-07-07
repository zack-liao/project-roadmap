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
    expect(saved).toHaveLength(1)
    expect(saved[0].name).toBe('A')
  })

  it('loadFromArray replaces the whole list', () => {
    const { projects, loadFromArray } = useProjects()
    loadFromArray([{ id: 'x', name: 'X', summary: '', owner: '', stakeholder: '', startMonth: 0, duration: 1, lane: 0 }])
    expect(projects.value).toHaveLength(1)
    expect(projects.value[0].id).toBe('x')
  })
})
