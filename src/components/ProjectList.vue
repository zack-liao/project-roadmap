<script setup>
import { computed } from 'vue'

const props = defineProps({
  projects: { type: Array, required: true },
})
const emit = defineEmits(['edit', 'remove'])

const unscheduled = computed(() =>
  props.projects.filter((p) => p.startMonth === null)
)

function onDragStart(e, id) {
  e.dataTransfer.setData('text/plain', id)
  e.dataTransfer.effectAllowed = 'move'
}
</script>

<template>
  <aside class="list">
    <h3>未排程</h3>
    <p v-if="unscheduled.length === 0" class="empty">全部已排程</p>
    <div
      v-for="p in unscheduled"
      :key="p.id"
      class="item"
      draggable="true"
      @dragstart="onDragStart($event, p.id)"
      @dblclick="emit('edit', p)"
    >
      <span>{{ p.name }}</span>
      <button @click.stop="emit('remove', p.id)">✕</button>
    </div>
  </aside>
</template>

<style scoped>
.list { width: 200px; font-family: system-ui, sans-serif; border-right: 1px solid #e5e5e5; padding-right: 12px; }
h3 { font-size: 14px; margin: 0 0 8px; }
.empty { color: #999; font-size: 13px; }
.item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px; margin-bottom: 6px; background: #eef2ff; border-radius: 6px;
  cursor: grab; font-size: 14px;
}
.item button { border: none; background: transparent; cursor: pointer; }
</style>
