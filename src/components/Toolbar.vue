<script setup>
import { ref } from 'vue'

const emit = defineEmits(['add', 'export', 'import'])
const fileInput = ref(null)

function pickFile() {
  fileInput.value.click()
}
function onFile(e) {
  const file = e.target.files[0]
  if (file) emit('import', file)
  e.target.value = ''  // 清空才能重選同一檔
}
</script>

<template>
  <div class="toolbar">
    <button @click="emit('add')">+ 新增 Project</button>
    <button @click="emit('export')">匯出 JSON</button>
    <button @click="pickFile">匯入 JSON</button>
    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      hidden
      @change="onFile"
    />
  </div>
</template>

<style scoped>
.toolbar { display: flex; gap: 8px; font-family: system-ui, sans-serif; }
button { padding: 6px 14px; cursor: pointer; }
</style>
