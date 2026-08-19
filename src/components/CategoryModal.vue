<script setup>
import { ref, watch, nextTick } from 'vue'
import AppIcon from './AppIcon.vue'

// 8 色 swatch：與深色主題對比足夠的中亮度色
const SWATCHES = [
  '#60a5fa', '#2dd4bf', '#34d399', '#facc15',
  '#fb923c', '#f87171', '#c084fc', '#94a3b8',
]

const props = defineProps({
  open: { type: Boolean, default: false },
  category: { type: Object, default: null },  // null = 新增
})
const emit = defineEmits(['save', 'remove', 'close'])

const form = ref({ name: '', color: SWATCHES[0] })
const nameInput = ref(null)

watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    form.value = props.category
      ? { name: props.category.name, color: props.category.color }
      : { name: '', color: SWATCHES[0] }
    await nextTick()
    nameInput.value?.focus()
  }
})

function submit() {
  if (!form.value.name.trim()) return
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
      <dialog class="modal" open aria-labelledby="cat-title">
        <div class="modal-head">
          <h2 id="cat-title">{{ category ? '編輯類別' : '新增類別' }}</h2>
          <button class="close" title="關閉" aria-label="關閉" @click="emit('close')">
            <AppIcon name="x" :size="15" />
          </button>
        </div>

        <form @submit.prevent="submit">
          <label>
            <span>名稱 <em class="req" title="必填">*</em></span>
            <input ref="nameInput" v-model="form.name" required />
          </label>
          <div class="swatch-field">
            <span>底色</span>
            <div class="swatches" role="radiogroup" aria-label="類別底色">
              <button
                v-for="c in SWATCHES"
                :key="c"
                type="button"
                class="swatch"
                :class="{ active: form.color === c }"
                :style="{ background: c }"
                :aria-label="c"
                :aria-pressed="form.color === c"
                @click="form.color = c"
              />
            </div>
          </div>
          <div class="actions">
            <button
              v-if="category"
              type="button"
              class="danger"
              @click="emit('remove', category)"
            >刪除</button>
            <span class="spacer" />
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
  width: 340px; max-width: 100%;
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
label, .swatch-field { display: flex; flex-direction: column; gap: var(--sp-1); font-size: 13px; color: var(--muted); }
.req { font-style: normal; color: var(--danger); }
input {
  padding: var(--sp-2) var(--sp-3); font: inherit; color: var(--text);
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: border-color var(--dur) var(--ease);
}
input:hover { border-color: var(--border-strong); }
input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.swatches { display: flex; gap: var(--sp-2); }
.swatch {
  width: 26px; height: 26px;
  border: 2px solid transparent; border-radius: 999px;
  cursor: pointer; padding: 0;
  transition: transform var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.swatch:hover { transform: scale(1.12); }
.swatch.active { border-color: var(--text); transform: scale(1.12); }

.actions { display: flex; align-items: center; gap: var(--sp-2); margin-top: var(--sp-2); }
.spacer { flex: 1; }
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
.danger {
  border: 1px solid var(--danger);
  background: var(--danger-soft); color: var(--danger); font-weight: 600;
}
.danger:hover { background: var(--danger-strong); border-color: var(--danger-strong); color: #fff; }
</style>
