<script setup>
import { ref } from 'vue'
import { useProjects } from './composables/useProjects.js'
import ProjectModal from './components/ProjectModal.vue'
import Timeline from './components/Timeline.vue'
import ProjectList from './components/ProjectList.vue'
import Toolbar from './components/Toolbar.vue'

const { projects, addProject, updateProject, removeProject, exportJSON, importJSON } = useProjects()

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
    addProject(fields)  // 新增後留在「未排程」，等使用者拖進 timeline
  }
  modalOpen.value = false
}
function schedule(id, patch) {
  updateProject(id, patch)
}
async function handleImport(file) {
  try {
    const count = await importJSON(file)
    alert(`匯入成功：${count} 筆`)
  } catch (err) {
    alert(`匯入失敗：${err.message}`)
  }
}
</script>

<template>
  <header>
    <h1>Project Roadmap</h1>
    <Toolbar
      @add="openAdd"
      @export="exportJSON"
      @import="handleImport"
    />
  </header>

  <div class="layout">
    <ProjectList
      :projects="projects"
      @edit="openEdit"
      @remove="removeProject"
    />
    <Timeline
      :projects="projects"
      @edit="openEdit"
      @remove="removeProject"
      @update="updateProject"
      @schedule="schedule"
    />
  </div>

  <ProjectModal
    :open="modalOpen"
    :project="editing"
    @save="handleSave"
    @close="modalOpen = false"
  />
</template>

<style scoped>
header { display: flex; align-items: center; gap: 16px; font-family: system-ui, sans-serif; margin-bottom: 16px; }
.layout { display: flex; gap: 16px; }
.layout > :last-child { flex: 1; }
</style>
