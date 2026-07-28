<script setup>
import { ref } from 'vue'
import AppIcon from './AppIcon.vue'

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
    <button class="ghost" @click="pickFile">
      <AppIcon name="upload" :size="15" />匯入
    </button>
    <button class="ghost" @click="emit('export')">
      <AppIcon name="download" :size="15" />匯出
    </button>
    <button class="primary" @click="emit('add')">
      <AppIcon name="plus" :size="15" />新增 Project
    </button>
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: var(--sp-2) var(--sp-4);
  font: inherit;
  font-size: 13px;
  font-weight: 550;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease), color var(--dur) var(--ease);
}
.ghost {
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--muted);
}
.ghost:hover { background: var(--surface-2); color: var(--text); }
.primary {
  border: 1px solid var(--accent-strong);
  background: var(--accent);
  color: var(--accent-ink);
  font-weight: 600;
}
.primary:hover { background: var(--accent-strong); }
</style>
