<script setup>
import { ref, computed } from 'vue'
import { useProjects } from './composables/useProjects.js'
import ProjectModal from './components/ProjectModal.vue'
import Timeline from './components/Timeline.vue'
import ProjectList from './components/ProjectList.vue'
import Toolbar from './components/Toolbar.vue'
import DetailPanel from './components/DetailPanel.vue'

const { projects, addProject, updateProject, removeProject, exportJSON, importJSON } = useProjects()

const modalOpen = ref(false)
const editing = ref(null)
const selectedId = ref(null)

const selectedProject = computed(() =>
  projects.value.find((p) => p.id === selectedId.value) || null
)

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
function handleRemove(id) {
  removeProject(id)
  if (selectedId.value === id) selectedId.value = null
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
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <span class="mark" />
        <h1>Project Roadmap</h1>
      </div>
      <Toolbar
        @add="openAdd"
        @export="exportJSON"
        @import="handleImport"
      />
    </header>

    <div class="body">
      <ProjectList
        :projects="projects"
        @add="openAdd"
        @edit="openEdit"
        @remove="handleRemove"
      />
      <main class="main">
        <Timeline
          :projects="projects"
          :selected-id="selectedId"
          @edit="openEdit"
          @remove="handleRemove"
          @update="updateProject"
          @schedule="schedule"
          @select="selectedId = $event"
        />
        <DetailPanel
          :project="selectedProject"
          @edit="openEdit"
          @remove="handleRemove"
          @close="selectedId = null"
        />
      </main>
    </div>
  </div>

  <ProjectModal
    :open="modalOpen"
    :project="editing"
    @save="handleSave"
    @close="modalOpen = false"
  />
</template>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.topbar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: var(--sp-3) var(--sp-5);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.brand { display: flex; align-items: center; gap: var(--sp-3); }
.mark {
  width: 14px; height: 14px; border-radius: 4px;
  background: var(--accent);
  box-shadow: inset 0 0 0 3px var(--surface), 0 0 0 1px var(--accent);
}
.topbar h1 {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
  letter-spacing: -0.01em;
}
.body {
  flex: 1;
  min-height: 0;              /* 讓內部 pane 能各自捲動 */
  display: flex;
}
.main {
  flex: 1;
  min-width: 0;              /* 允許 timeline 橫向捲動不撐破版面 */
  padding: var(--sp-5);
  overflow: auto;
}
</style>
