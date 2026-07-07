<script setup>
import { computed } from 'vue'
import { monthToPx, durationToPx } from '../composables/geometry.js'
import { useDragBar } from '../composables/useDragBar.js'

const props = defineProps({
  project: { type: Object, required: true },
  monthWidth: { type: Number, required: true },
  trackLeft: { type: Number, required: true },
})
const emit = defineEmits(['edit', 'remove', 'update'])

const style = computed(() => ({
  left: monthToPx(props.project.startMonth ?? 0, props.monthWidth) + 'px',
  width: durationToPx(props.project.duration, props.monthWidth) + 'px',
  top: (props.project.lane ?? 0) * 44 + 'px',
  background: props.project.color || '#4f7cff',
}))

const { onPointerdownMove, dragging } = useDragBar({
  project: () => props.project,
  monthWidth: () => props.monthWidth,
  trackLeft: () => props.trackLeft,
  onChange: (patch) => emit('update', props.project.id, patch),
})
</script>

<template>
  <div
    class="bar"
    :class="{ dragging }"
    :style="style"
    @pointerdown="onPointerdownMove"
    @dblclick="emit('edit', project)"
  >
    <span class="label">{{ project.name }}</span>
    <button class="del" @click.stop="emit('remove', project.id)" @pointerdown.stop>✕</button>
  </div>
</template>

<style scoped>
.bar {
  position: absolute; height: 36px; border-radius: 6px;
  color: #fff; display: flex; align-items: center; padding: 0 8px;
  font: 13px system-ui, sans-serif; overflow: hidden; box-sizing: border-box;
  cursor: grab; user-select: none; touch-action: none;
}
.bar.dragging { cursor: grabbing; opacity: .85; }
.label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.del { background: transparent; border: none; color: #fff; cursor: pointer; opacity: 0; }
.bar:hover .del { opacity: 1; }
</style>
