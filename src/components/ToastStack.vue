<script setup>
import AppIcon from './AppIcon.vue'

defineProps({
  toasts: { type: Array, required: true },  // { id, type: 'success' | 'error', text }
})
</script>

<template>
  <div class="stack" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type" role="status">
        <AppIcon :name="t.type === 'error' ? 'alert' : 'check'" :size="15" />
        <span>{{ t.text }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.stack {
  position: fixed;
  bottom: var(--sp-5);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  z-index: 50;
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-4);
  border-radius: 999px;
  background: var(--surface-2);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-lg);
  font-size: 13px;
  font-weight: 500;
}
.toast.success { color: var(--accent); border-color: var(--accent-border); }
.toast.error { color: var(--danger); border-color: var(--danger); }
.toast span { color: var(--text); }

.toast-enter-active, .toast-leave-active { transition: opacity var(--dur) var(--ease), transform var(--dur) var(--ease); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
