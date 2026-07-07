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

  return { projects, addProject, updateProject, removeProject, loadFromArray, toArray }
}
