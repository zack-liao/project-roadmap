<script setup>
import { ref, computed } from 'vue'
import { useProjects } from './composables/useProjects.js'
import ProjectModal from './components/ProjectModal.vue'
import Timeline from './components/Timeline.vue'
import ProjectList from './components/ProjectList.vue'
import Toolbar from './components/Toolbar.vue'
import DetailPanel from './components/DetailPanel.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import ToastStack from './components/ToastStack.vue'

const { projects, addProject, updateProject, removeProject, exportJSON, importJSON } = useProjects()

const modalOpen = ref(false)
const editing = ref(null)
const selectedId = ref(null)

const selectedProject = computed(() =>
  projects.value.find((p) => p.id === selectedId.value) || null
)

const toasts = ref([])
let toastSeq = 0
function toast(type, text) {
  const id = ++toastSeq
  toasts.value.push({ id, type, text })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 3200)
}

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
    toast('success', '已更新')
  } else {
    addProject(fields)  // 新增後留在「未排程」，等使用者拖進 timeline
    toast('success', '已新增，拖曳卡片到時間軸排程')
  }
  modalOpen.value = false
}
function schedule(id, patch) {
  updateProject(id, patch)
}
const removeTarget = ref(null)  // 待確認刪除的 project

function handleRemove(id) {
  removeTarget.value = projects.value.find((p) => p.id === id) || null
}
function confirmRemove() {
  const target = removeTarget.value
  if (!target) return
  removeProject(target.id)
  if (selectedId.value === target.id) selectedId.value = null
  removeTarget.value = null
  toast('success', '已刪除')
}
function handleExport() {
  exportJSON()
  toast('success', '已匯出 JSON')
}
async function handleImport(file) {
  try {
    const count = await importJSON(file)
    toast('success', `匯入成功：${count} 筆`)
  } catch (err) {
    toast('error', `匯入失敗：${err.message}`)
  }
}
</script>

<template>
  <div class="app">
    <header class="topbar">
      <div class="brand">
        <span class="mark" aria-hidden="true" />
        <h1>Roadmap</h1>
        <span class="tally">{{ projects.length }} projects</span>
      </div>
      <Toolbar
        @add="openAdd"
        @export="handleExport"
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
  <ConfirmDialog
    :open="removeTarget !== null"
    title="刪除 Project"
    :message="removeTarget ? `確定要刪除「${removeTarget.name}」？此動作無法復原。` : ''"
    @confirm="confirmRemove"
    @close="removeTarget = null"
  />
  <ToastStack :toasts="toasts" />
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
.brand { display: flex; align-items: baseline; gap: var(--sp-3); }
.mark {
  align-self: center;
  width: 12px; height: 12px; border-radius: 3px;
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent-soft), 0 0 0 4px var(--accent-soft);
}
.topbar h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: .01em;
}
.tally {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--faint);
  letter-spacing: .03em;
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
