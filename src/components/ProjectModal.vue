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
  position: fixed; inset: 0; background: rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: #fff; padding: 24px; border-radius: 8px;
  display: flex; flex-direction: column; gap: 12px; min-width: 320px;
  font-family: system-ui, sans-serif;
}
label { display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
input, textarea { padding: 6px; border: 1px solid #ccc; border-radius: 4px; }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
button { padding: 6px 16px; cursor: pointer; }
</style>
