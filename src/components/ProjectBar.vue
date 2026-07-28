<script setup>
import { computed } from 'vue'
import { monthToPx, durationToPx } from '../composables/geometry.js'
import { useDragBar } from '../composables/useDragBar.js'
import { LANE_HEIGHT } from '../constants.js'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  project: { type: Object, required: true },
  monthWidth: { type: Number, required: true },
  trackLeft: { type: Number, required: true },
  trackTop: { type: Number, required: true },
  selected: { type: Boolean, default: false },
})
const emit = defineEmits(['edit', 'remove', 'update', 'select'])

const color = computed(() => props.project.color || 'var(--accent)')

const style = computed(() => ({
  left: monthToPx(props.project.startMonth ?? 0, props.monthWidth) + 'px',
  width: durationToPx(props.project.duration, props.monthWidth) + 'px',
  top: (props.project.lane ?? 0) * LANE_HEIGHT + 'px',
  '--bar-color': color.value,
}))

const durationLabel = computed(() => `${props.project.duration}mo`)

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
    <div class="handle left" @pointerdown="onPointerdownResizeLeft"><i /></div>
    <button class="label" @click="emit('select', project.id)">{{ project.name }}</button>
    <span class="dur">{{ durationLabel }}</span>
    <button
      class="del"
      title="刪除"
      aria-label="刪除"
      @click.stop="emit('remove', project.id)"
      @pointerdown.stop
    ><AppIcon name="x" :size="12" /></button>
    <div class="handle right" @pointerdown="onPointerdownResizeRight"><i /></div>
  </div>
</template>

<style scoped>
.bar {
  position: absolute; height: 34px;
  display: flex; align-items: center; gap: 6px;
  padding: 0 10px 0 12px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bar-color) 22%, var(--surface-2));
  border: 1px solid color-mix(in srgb, var(--bar-color) 45%, transparent);
  color: var(--text);
  font-family: var(--font-ui); font-size: 12.5px;
  overflow: hidden; box-sizing: border-box;
  cursor: grab; user-select: none; touch-action: none;
  transition: box-shadow var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
/* 左色脊：專案色一眼可辨（signature） */
.bar::before {
  content: '';
  position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  background: var(--bar-color);
}
.bar:hover { border-color: color-mix(in srgb, var(--bar-color) 80%, transparent); box-shadow: var(--shadow); }
.bar.dragging { cursor: grabbing; opacity: .88; box-shadow: var(--shadow-lg); z-index: 5; }
.bar.selected {
  border-color: var(--bar-color);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--bar-color) 25%, transparent);
  z-index: 4;
}

.handle {
  position: absolute; top: 0; bottom: 0; width: 10px;
  display: flex; align-items: center; justify-content: center;
  cursor: ew-resize; z-index: 2;
}
.handle.left { left: 0; }
.handle.right { right: 0; }
.handle i {
  width: 2px; height: 12px; border-radius: 1px;
  background: color-mix(in srgb, var(--text) 55%, transparent);
  opacity: 0;
  transition: opacity var(--dur) var(--ease);
}
.bar:hover .handle i, .bar.selected .handle i { opacity: 1; }

.label {
  flex: 1; min-width: 0;
  padding: 0; margin: 0; border: none; background: transparent;
  font: inherit; font-weight: 550; color: inherit; text-align: left;
  cursor: inherit;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.dur {
  flex: none;
  font-family: var(--font-mono); font-size: 10.5px;
  color: var(--muted); letter-spacing: .02em;
}
.del {
  flex: none;
  width: 20px; height: 20px;
  display: inline-flex; align-items: center; justify-content: center;
  background: transparent; border: none; border-radius: var(--radius-xs);
  color: var(--muted); cursor: pointer; opacity: 0;
  transition: opacity var(--dur) var(--ease), background var(--dur) var(--ease), color var(--dur) var(--ease);
}
.bar:hover .del, .bar:focus-within .del, .bar.selected .del { opacity: 1; }
.del:hover { background: var(--danger-soft); color: var(--danger); }
</style>
