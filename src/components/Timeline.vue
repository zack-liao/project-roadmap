<script setup>
import { ref, computed } from 'vue'
import { useElementSize } from '@vueuse/core'
import { MONTHS, MONTH_COUNT } from '../constants.js'
import ProjectBar from './ProjectBar.vue'

const props = defineProps({
  projects: { type: Array, required: true },
})
const emit = defineEmits(['edit', 'remove'])

const trackEl = ref(null)
const { width: trackWidth } = useElementSize(trackEl)
const monthWidth = computed(() => (trackWidth.value || 0) / MONTH_COUNT)

// 只畫已排程（startMonth 非 null）的 project
const scheduled = computed(() =>
  props.projects.filter((p) => p.startMonth !== null && p.lane !== null)
)

const laneCount = computed(() =>
  Math.max(4, ...scheduled.value.map((p) => (p.lane ?? 0) + 1))
)

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
    >
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
        @edit="emit('edit', $event)"
        @remove="emit('remove', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.timeline { font-family: system-ui, sans-serif; }
.header { display: flex; border-bottom: 2px solid #333; }
.month-cell { flex: 1; text-align: center; padding: 6px 0; font-size: 13px; font-weight: 600; }
.track { position: relative; background: #fafafa; }
.grid-line { position: absolute; top: 0; bottom: 0; width: 1px; background: #e5e5e5; }
</style>
