<script setup>
import { ref, watch, nextTick } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  project: { type: Object, default: null },
})
const emit = defineEmits(['save', 'close'])

const form = ref({ name: '', summary: '', owner: '', stakeholder: '' })
const nameInput = ref(null)

// 每次開啟時，用傳入的 project 填表（編輯）或清空（新增），並聚焦名稱欄
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    form.value = props.project
      ? { name: props.project.name, summary: props.project.summary, owner: props.project.owner, stakeholder: props.project.stakeholder }
      : { name: '', summary: '', owner: '', stakeholder: '' }
    await nextTick()
    nameInput.value?.focus()
  }
})

function submit() {
  if (!form.value.name.trim()) return  // 名稱必填
  emit('save', { ...form.value })
}
</script>

<template>
  <Transition name="modal">
    <div
      v-if="open"
      class="backdrop"
      @click.self="emit('close')"
      @keydown.esc="emit('close')"
    >
      <dialog class="modal" open>
        <div class="modal-head">
          <h2>{{ project ? '編輯 Project' : '新增 Project' }}</h2>
          <button class="close" title="關閉" aria-label="關閉" @click="emit('close')">
            <AppIcon name="x" :size="15" />
          </button>
        </div>

        <form @submit.prevent="submit">
          <label>
            <span>名稱 <em class="req" title="必填">*</em></span>
            <input ref="nameInput" v-model="form.name" required />
          </label>
          <label>
            <span>簡介</span>
            <textarea v-model="form.summary" />
          </label>
          <label>
            <span>負責人</span>
            <input v-model="form.owner" />
          </label>
          <label>
            <span>核心利益人</span>
            <input v-model="form.stakeholder" />
          </label>
          <div class="actions">
            <button type="button" class="ghost" @click="emit('close')">取消</button>
            <button type="submit" class="primary" :disabled="!form.name.trim()">儲存</button>
          </div>
        </form>
      </dialog>
    </div>
  </Transition>
</template>

<style scoped>
.backdrop {
  position: fixed; inset: 0;
  background: rgba(2, 6, 23, .66);
  backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center;
  padding: var(--sp-4);
  z-index: 40;
}
.modal {
  position: static; margin: 0;
  background: var(--surface); color: var(--text);
  padding: var(--sp-5); border-radius: var(--radius);
  border: 1px solid var(--border-strong); box-shadow: var(--shadow-lg);
  width: 380px; max-width: 100%;
  font-family: var(--font-ui);
}

.modal-enter-active, .modal-leave-active { transition: opacity var(--dur) var(--ease); }
.modal-enter-active .modal, .modal-leave-active .modal { transition: transform var(--dur) var(--ease); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(8px) scale(.98); }

.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--sp-4);
}
.modal h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 16px; font-weight: 600;
}
.close {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: var(--radius-xs);
  background: transparent; color: var(--muted); cursor: pointer;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
}
.close:hover { background: var(--surface-2); color: var(--text); }

form { display: flex; flex-direction: column; gap: var(--sp-3); }
label { display: flex; flex-direction: column; gap: var(--sp-1); font-size: 13px; color: var(--muted); }
.req { font-style: normal; color: var(--danger); }
input, textarea {
  padding: var(--sp-2) var(--sp-3); font: inherit; color: var(--text);
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: border-color var(--dur) var(--ease);
}
input:hover, textarea:hover { border-color: var(--border-strong); }
input:focus, textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
textarea { min-height: 72px; resize: vertical; }

.actions { display: flex; justify-content: flex-end; gap: var(--sp-2); margin-top: var(--sp-2); }
.actions button {
  padding: var(--sp-2) var(--sp-4); font: inherit; font-size: 13px; font-weight: 550;
  border-radius: var(--radius-sm); cursor: pointer;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
}
.ghost {
  border: 1px solid var(--border-strong);
  background: transparent; color: var(--muted);
}
.ghost:hover { background: var(--surface-2); color: var(--text); }
.primary {
  border: 1px solid var(--accent-strong);
  background: var(--accent); color: var(--accent-ink); font-weight: 600;
}
.primary:hover:not(:disabled) { background: var(--accent-strong); }
.primary:disabled { opacity: .45; cursor: not-allowed; }
</style>
