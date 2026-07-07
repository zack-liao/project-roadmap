<script setup>
import { ref } from 'vue'
import { useProjects } from './composables/useProjects.js'
import ProjectModal from './components/ProjectModal.vue'

const { projects, addProject } = useProjects()

const modalOpen = ref(false)
const editing = ref(null)

function openAdd() {
  editing.value = null
  modalOpen.value = true
}

function handleSave(fields) {
  addProject(fields)
  modalOpen.value = false
}
</script>

<template>
  <header>
    <h1>Project Roadmap</h1>
    <button @click="openAdd">+ 新增 Project</button>
  </header>

  <ul>
    <li v-for="p in projects" :key="p.id">{{ p.name }} — {{ p.owner }}</li>
  </ul>

  <ProjectModal
    :open="modalOpen"
    :project="editing"
    @save="handleSave"
    @close="modalOpen = false"
  />
</template>

<style scoped>
header { display: flex; align-items: center; gap: 16px; font-family: system-ui, sans-serif; }
</style>
