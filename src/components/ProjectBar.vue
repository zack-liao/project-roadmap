<script setup>
import { computed } from 'vue'
import { monthToPx, durationToPx } from '../composables/geometry.js'
import { useDragBar } from '../composables/useDragBar.js'
import { LANE_HEIGHT } from '../constants.js'

const props = defineProps({
  project: { type: Object, required: true },
  monthWidth: { type: Number, required: true },
  trackLeft: { type: Number, required: true },
  trackTop: { type: Number, required: true },
  selected: { type: Boolean, default: false },
})
const emit = defineEmits(['edit', 'remove', 'update', 'select'])

const style = computed(() => ({
  left: monthToPx(props.project.startMonth ?? 0, props.monthWidth) + 'px',
  width: durationToPx(props.project.duration, props.monthWidth) + 'px',
  top: (props.project.lane ?? 0) * LANE_HEIGHT + 'px',
  background: props.project.color || 'var(--accent)',
}))

const { onPointerdownMove, onPointerdownResizeLeft, onPointerdownResizeRight, dragging } = useDragBar({
  project: () => props.project,
  monthWidth: () => props.monthWidth,
  trackLeft: () => props.trackLeft,
  trackTop: () => props.trackTop,
  onChange: (patch) => emit('update', props.project.id, patch),
  onSelect: () => emit('select', props.project.id),
})
</script>

<template>
  <div
    class="bar"
    :class="{ dragging, selected }"
    :style="style"
    @pointerdown="onPointerdownMove"
    @dblclick="emit('edit', project)"
  >
    <div class="handle left" @pointerdown="onPointerdownResizeLeft" />
    <span class="label">{{ project.name }}</span>
    <button class="del" @click.stop="emit('remove', project.id)" @pointerdown.stop>✕</button>
    <div class="handle right" @pointerdown="onPointerdownResizeRight" />
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
.bar.selected { outline: 2px solid var(--text); outline-offset: 1px; box-shadow: 0 0 0 4px var(--accent-soft); }
.handle {
  position: absolute; top: 0; bottom: 0; width: 8px;
  cursor: ew-resize; z-index: 2;
}
.handle.left { left: 0; }
.handle.right { right: 0; }
.label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.del { background: transparent; border: none; color: #fff; cursor: pointer; opacity: 0; }
.bar:hover .del { opacity: 1; }
</style>
