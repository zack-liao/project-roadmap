<script setup>
import { ref, watch, nextTick } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  message: { type: String, default: '' },
  confirmText: { type: String, default: '刪除' },
})
const emit = defineEmits(['confirm', 'close'])

const cancelBtn = ref(null)

// 開啟時聚焦「取消」，避免 Enter 誤觸破壞性動作
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    cancelBtn.value?.focus()
  }
})
</script>

<template>
  <Transition name="modal">
    <div
      v-if="open"
      class="backdrop"
      @click.self="emit('close')"
      @keydown.esc="emit('close')"
    >
      <dialog class="modal" open aria-labelledby="confirm-title">
        <div class="modal-head">
          <h2 id="confirm-title">{{ title }}</h2>
          <button class="close" title="關閉" aria-label="關閉" @click="emit('close')">
            <AppIcon name="x" :size="15" />
          </button>
        </div>

        <p v-if="message" class="message">{{ message }}</p>

        <div class="actions">
          <button ref="cancelBtn" type="button" class="ghost" @click="emit('close')">取消</button>
          <button type="button" class="danger" @click="emit('confirm')">{{ confirmText }}</button>
        </div>
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
  margin-bottom: var(--sp-3);
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

.message {
  margin: 0 0 var(--sp-4);
  font-size: 13px; line-height: 1.6; color: var(--muted);
  overflow-wrap: anywhere;
}

.actions { display: flex; justify-content: flex-end; gap: var(--sp-2); }
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
.danger {
  border: 1px solid var(--danger);
  background: var(--danger-soft); color: var(--danger); font-weight: 600;
}
.danger:hover { background: var(--danger-strong); border-color: var(--danger-strong); color: #fff; }
</style>
