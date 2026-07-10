<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  project: { type: Object, default: null },
})
const emit = defineEmits(['save', 'close'])

const form = ref({ name: '', summary: '', owner: '', stakeholder: '' })

// 每次開啟時，用傳入的 project 填表（編輯）或清空（新增）
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    form.value = props.project
      ? { name: props.project.name, summary: props.project.summary, owner: props.project.owner, stakeholder: props.project.stakeholder }
      : { name: '', summary: '', owner: '', stakeholder: '' }
  }
})

function submit() {
  if (!form.value.name.trim()) return  // 名稱必填
  emit('save', { ...form.value })
}
</script>

<template>
  <div v-if="open" class="backdrop" @click.self="emit('close')">
    <div class="modal">
      <h2>{{ project ? '編輯 Project' : '新增 Project' }}</h2>
      <label>名稱<input v-model="form.name" /></label>
      <label>簡介<textarea v-model="form.summary" /></label>
      <label>負責人<input v-model="form.owner" /></label>
      <label>核心利益人<input v-model="form.stakeholder" /></label>
      <div class="actions">
        <button @click="emit('close')">取消</button>
        <button @click="submit">儲存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.55);
  display: flex; align-items: center; justify-content: center;
  padding: var(--sp-4);
}
.modal {
  background: var(--surface); color: var(--text);
  padding: var(--sp-5); border-radius: var(--radius);
  border: 1px solid var(--border); box-shadow: var(--shadow);
  display: flex; flex-direction: column; gap: var(--sp-3);
  width: 360px; max-width: 100%;
  font-family: var(--font-ui);
}
.modal h2 { margin: 0 0 var(--sp-1); font-size: 16px; font-weight: 650; }
label { display: flex; flex-direction: column; gap: var(--sp-1); font-size: 13px; color: var(--muted); }
input, textarea {
  padding: var(--sp-2); font: inherit; color: var(--text);
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
input:focus, textarea:focus { outline: 2px solid var(--accent); outline-offset: -1px; border-color: var(--accent); }
textarea { min-height: 64px; resize: vertical; }
.actions { display: flex; justify-content: flex-end; gap: var(--sp-2); margin-top: var(--sp-2); }
button {
  padding: var(--sp-2) var(--sp-4); font: inherit; font-weight: 550;
  border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
  background: var(--surface); color: var(--text); cursor: pointer;
}
button:hover { background: var(--surface-2); }
.actions button:last-child { background: var(--accent); border-color: var(--accent); color: #fff; }
.actions button:last-child:hover { background: #2f5ede; }
</style>
