<script setup>
import { ref, computed } from 'vue'
import { useElementSize, useElementBounding } from '@vueuse/core'
import { MONTHS, MONTH_COUNT, SUBDIVISIONS } from '../constants.js'
import { pxToMonth } from '../composables/geometry.js'
import ProjectBar from './ProjectBar.vue'

const props = defineProps({
  projects: { type: Array, required: true },
})
const emit = defineEmits(['edit', 'remove', 'update', 'schedule'])

const trackEl = ref(null)
const { width: trackWidth } = useElementSize(trackEl)
const { left: trackLeft } = useElementBounding(trackEl)
const monthWidth = computed(() => (trackWidth.value || 0) / MONTH_COUNT)

// 只畫已排程（startMonth 非 null）的 project
const scheduled = computed(() =>
  props.projects.filter((p) => p.startMonth !== null && p.lane !== null)
)

const laneCount = computed(() =>
  Math.max(4, ...scheduled.value.map((p) => (p.lane ?? 0) + 1))
)

function onDrop(e) {
  const id = e.dataTransfer.getData('text/plain')
  if (!id) return
  // clamp：落點留至少 1 月空間，橫條不掉出右緣
  const raw = pxToMonth(e.clientX, trackLeft.value, monthWidth.value)
  const startMonth = Math.min(raw, MONTH_COUNT - 1)
  // 用滑鼠 y 相對 track 頂端算 lane（每列 44px）
  const rect = trackEl.value.getBoundingClientRect()
  const lane = Math.max(0, Math.floor((e.clientY - rect.top) / 44))
  emit('schedule', id, { startMonth, lane })
}

defineExpose({ trackEl, monthWidth })
</script>

<template>
  <div class="timeline">
    <div class="header">
      <div v-for="m in MONTHS" :key="m" class="month-cell">{{ m }}</div>
    </div>
    <div
      ref="trackEl"
      class="track"
      :style="{ height: laneCount * 44 + 8 + 'px' }"
      @dragover.prevent
      @drop="onDrop"
    >
      <div
        v-for="i in MONTH_COUNT * SUBDIVISIONS"
        :key="'q' + i"
        class="grid-line quarter"
        :style="{ left: (i - 1) * monthWidth / SUBDIVISIONS + 'px' }"
      />
      <div
        v-for="i in MONTH_COUNT"
        :key="i"
        class="grid-line"
        :style="{ left: (i - 1) * monthWidth + 'px' }"
      />
      <ProjectBar
        v-for="p in scheduled"
        :key="p.id"
        :project="p"
        :month-width="monthWidth"
        :track-left="trackLeft"
        @edit="emit('edit', $event)"
        @remove="emit('remove', $event)"
        @update="(id, patch) => emit('update', id, patch)"
      />
    </div>
  </div>
</template>

<style scoped>
.timeline { font-family: system-ui, sans-serif; }
.header { display: flex; border-bottom: 2px solid #333; }
.month-cell { flex: 1; text-align: center; padding: 6px 0; font-size: 13px; font-weight: 600; }
.track { position: relative; background: #fafafa; }
.grid-line { position: absolute; top: 0; bottom: 0; width: 1px; background: #cfcfcf; }
.grid-line.quarter { background: #efefef; }
</style>
