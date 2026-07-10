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
    <button class="primary" @click="emit('add')">+ 新增 Project</button>
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
.toolbar { display: flex; gap: var(--sp-2); }
button {
  padding: var(--sp-2) var(--sp-4);
  font-size: 13px; font-weight: 550;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface); color: var(--text);
  cursor: pointer;
  transition: background .12s, border-color .12s;
}
button:hover { background: var(--surface-2); }
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
button.primary:hover { background: #2f5ede; }
</style>
