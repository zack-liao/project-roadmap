<script setup>
import { ref } from 'vue'
import { useProjects } from './composables/useProjects.js'
import ProjectModal from './components/ProjectModal.vue'
import Timeline from './components/Timeline.vue'

const { projects, addProject, updateProject, removeProject } = useProjects()

const modalOpen = ref(false)
const editing = ref(null)

function openAdd() {
  editing.value = null
  modalOpen.value = true
}
function openEdit(project) {
  editing.value = project
  modalOpen.value = true
}
function handleSave(fields) {
  if (editing.value) {
    updateProject(editing.value.id, fields)
  } else {
    // 新增後直接排到第一格方便看到（暫時；Task 8 改成拖曳排程）
    const p = addProject(fields)
    updateProject(p.id, { startMonth: 0, lane: nextFreeLane() })
  }
  modalOpen.value = false
}
function nextFreeLane() {
  const used = projects.value.filter((p) => p.lane !== null).map((p) => p.lane)
  let lane = 0
  while (used.includes(lane)) lane++
  return lane
}
</script>

<template>
  <header>
    <h1>Project Roadmap</h1>
    <button @click="openAdd">+ 新增 Project</button>
  </header>

  <Timeline
    :projects="projects"
    @edit="openEdit"
    @remove="removeProject"
    @update="updateProject"
  />

  <ProjectModal
    :open="modalOpen"
    :project="editing"
    @save="handleSave"
    @close="modalOpen = false"
  />
</template>

<style scoped>
header { display: flex; align-items: center; gap: 16px; font-family: system-ui, sans-serif; margin-bottom: 16px; }
</style>
