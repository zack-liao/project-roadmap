import { ref, watch } from 'vue'
import { STORAGE_KEY } from '../constants.js'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function useProjects() {
  const projects = ref(load())

  // 任何變化（深層）都自動存回 localStorage
  watch(projects, (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
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

  function loadFromArray(arr) {
    projects.value = Array.isArray(arr) ? arr : []
  }

  function toArray() {
    return JSON.parse(JSON.stringify(projects.value))
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
          const arr = JSON.parse(reader.result)
          if (!Array.isArray(arr)) throw new Error('格式錯誤：不是陣列')
          loadFromArray(arr)
          resolve(arr.length)
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
    loadFromArray, toArray, exportJSON, importJSON,
  }
}
