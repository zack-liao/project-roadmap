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
  gapPx: { type: Number, default: Number.POSITIVE_INFINITY },
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

// 名稱實際像素寬放不進條內時，整個名稱浮到條外右側（標準 Gantt 做法），
// 永不截斷成省略號。CHROME_PX 為條內名稱以外的固定佔位（padding、把手、時長徽章、刪除鈕）。
const CHROME_PX = 96
const measureCtx = document.createElement('canvas').getContext('2d')
let labelFont = null
function nameWidth(text) {
  if (!labelFont) {
    const fam = getComputedStyle(document.documentElement).getPropertyValue('--font-ui').trim() || 'sans-serif'
    labelFont = `550 12.5px ${fam}`
  }
  measureCtx.font = labelFont
  return measureCtx.measureText(text).width
}
const fitsInside = computed(() =>
  durationToPx(props.project.duration, props.monthWidth) >= nameWidth(props.project.name) + CHROME_PX
)
// 條外要留 18px 邊距，且不可壓到同 lane 右鄰的 bar；空隙不夠就退回條內截斷 + tooltip
const isNarrow = computed(() =>
  !fitsInside.value && props.gapPx >= nameWidth(props.project.name) + 18
)

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
    :class="{ dragging, selected, narrow: isNarrow }"
    :style="style"
    :title="project.name"
    @pointerdown="onPointerdownMove"
    @dblclick="emit('edit', project)"
  >
    <div class="handle left" @pointerdown="onPointerdownResizeLeft"><i /></div>
    <button v-if="!isNarrow" class="label" @click="emit('select', project.id)">{{ project.name }}</button>
    <span v-if="!isNarrow" class="dur">{{ durationLabel }}</span>
    <span v-if="isNarrow" class="label-out">{{ project.name }}</span>
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
  /* overflow 保持 visible：label 需要 position:sticky（overflow hidden 會使 sticky 相對 bar 自身而失效） */
  box-sizing: border-box;
  cursor: grab; user-select: none; touch-action: none;
  transition: box-shadow var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
/* 左色脊：專案色一眼可辨（signature） */
.bar::before {
  content: '';
  position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
  background: var(--bar-color);
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
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
  /* sticky：橫條左端捲出視口時，名稱貼在可視左緣不消失。
     shrink-to-fit（非 flex:1）才有滑動空間 */
  position: sticky; left: 12px;
  flex: 0 1 auto; min-width: 0;
  padding: 0; margin: 0; border: none; background: transparent;
  font: inherit; font-weight: 550; color: inherit; text-align: left;
  cursor: inherit;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.bar.narrow { padding: 0 4px; z-index: 2; }
.label-out {
  position: absolute; left: calc(100% + 6px); top: 50%;
  transform: translateY(-50%);
  white-space: nowrap;
  font-size: 12px; font-weight: 550; color: var(--text);
  padding: 1px 6px; border-radius: var(--radius-xs);
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  pointer-events: none;
}

.dur {
  flex: none; margin-left: auto;
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
