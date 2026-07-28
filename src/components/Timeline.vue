<script setup>
import { ref, computed } from 'vue'
import { useElementBounding } from '@vueuse/core'
import {
  MONTH_COUNT, MONTH_WIDTH, SUBDIVISIONS, LANE_HEIGHT,
  TIMELINE_START_YEAR, TIMELINE_START_MONTH,
} from '../constants.js'
import { pxToMonth, pxToLane } from '../composables/geometry.js'
import { buildColumns, buildYearGroups, dateToOffset } from '../composables/calendar.js'
import ProjectBar from './ProjectBar.vue'

const props = defineProps({
  projects: { type: Array, required: true },
  selectedId: { type: String, default: null },
})
const emit = defineEmits(['edit', 'remove', 'update', 'schedule', 'select'])

// 固定月寬 → 內容總寬固定，超出容器就橫向捲動
const monthWidth = MONTH_WIDTH
const totalWidth = MONTH_COUNT * MONTH_WIDTH

const columns = buildColumns(TIMELINE_START_YEAR, TIMELINE_START_MONTH, MONTH_COUNT)
const yearGroups = buildYearGroups(columns)

// 今日線位置（超出範圍則不顯示）
const today = new Date()
const todayOffset = dateToOffset(today, TIMELINE_START_YEAR, TIMELINE_START_MONTH)
const showToday = todayOffset >= 0 && todayOffset <= MONTH_COUNT
const todayLabel = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`

const trackEl = ref(null)
const { left: trackLeft, top: trackTop } = useElementBounding(trackEl)

const scheduled = computed(() =>
  props.projects.filter((p) => p.startMonth !== null && p.lane !== null)
)

const laneCount = computed(() =>
  Math.max(4, ...scheduled.value.map((p) => (p.lane ?? 0) + 1))
)

// 從側欄拖入時高亮軌道，提示可放置
const dropActive = ref(false)

function onDrop(e) {
  dropActive.value = false
  const id = e.dataTransfer.getData('text/plain')
  if (!id) return
  const raw = pxToMonth(e.clientX, trackLeft.value, monthWidth)
  const startMonth = Math.min(raw, MONTH_COUNT - 1)
  const lane = pxToLane(e.clientY, trackTop.value, LANE_HEIGHT)
  emit('schedule', id, { startMonth, lane })
}

defineExpose({ trackEl, monthWidth })
</script>

<template>
  <div class="timeline">
    <div class="scroll">
      <div class="canvas" :style="{ width: totalWidth + 'px' }">
        <!-- 上排：年份，跨越該年在範圍內的月數 -->
        <div class="year-row">
          <div
            v-for="g in yearGroups"
            :key="g.year"
            class="year-cell"
            :style="{ width: g.span * monthWidth + 'px' }"
          >{{ g.year }}</div>
        </div>

        <!-- 下排：月份 -->
        <div class="month-row">
          <div
            v-for="c in columns"
            :key="c.index"
            class="month-cell"
            :class="{ 'year-start': c.isYearStart && c.index !== 0 }"
            :style="{ width: monthWidth + 'px' }"
          >{{ c.label }}</div>
        </div>

        <!-- 軌道 -->
        <div
          ref="trackEl"
          class="track"
          :class="{ 'drop-active': dropActive }"
          :style="{ height: laneCount * LANE_HEIGHT + 8 + 'px' }"
          @dragover.prevent="dropActive = true"
          @dragleave.self="dropActive = false"
          @drop="onDrop"
          @click.self="emit('select', null)"
        >
          <!-- 季度細格線 -->
          <div
            v-for="i in MONTH_COUNT * SUBDIVISIONS"
            :key="'q' + i"
            class="grid-line quarter"
            :style="{ left: (i - 1) * monthWidth / SUBDIVISIONS + 'px' }"
          />
          <!-- 月格線（年首較粗） -->
          <div
            v-for="c in columns"
            :key="'m' + c.index"
            class="grid-line"
            :class="{ 'year-line': c.isYearStart && c.index !== 0 }"
            :style="{ left: c.index * monthWidth + 'px' }"
          />
          <!-- 今日線 + 日期 beacon -->
          <div
            v-if="showToday"
            class="today-line"
            :style="{ left: todayOffset * monthWidth + 'px' }"
          >
            <span class="today-chip">{{ todayLabel }}</span>
          </div>

          <p v-if="!scheduled.length" class="track-empty">
            從左側把 Project 拖到這裡開始排程
          </p>

          <ProjectBar
            v-for="p in scheduled"
            :key="p.id"
            :project="p"
            :month-width="monthWidth"
            :track-left="trackLeft"
            :track-top="trackTop"
            :selected="p.id === selectedId"
            @edit="emit('edit', $event)"
            @remove="emit('remove', $event)"
            @update="(id, patch) => emit('update', id, patch)"
            @select="emit('select', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline { font-family: var(--font-ui); }
.scroll {
  overflow-x: auto; overflow-y: hidden;
  border: 1px solid var(--border); border-radius: var(--radius);
  background: var(--surface); box-shadow: var(--shadow);
}
.canvas { position: relative; }

.year-row { display: flex; }
.year-cell {
  box-sizing: border-box; padding: var(--sp-2) 0; text-align: center;
  font-family: var(--font-mono);
  font-size: 12px; font-weight: 600; letter-spacing: .08em; color: var(--muted);
  background: var(--surface-2); border-left: 2px solid var(--border-strong);
}
.year-cell:first-child { border-left: none; }

.month-row { display: flex; border-bottom: 1px solid var(--border-strong); }
.month-cell {
  box-sizing: border-box; padding: var(--sp-2) 0; text-align: center;
  font-family: var(--font-mono);
  font-size: 11px; font-weight: 500; letter-spacing: .04em; color: var(--faint);
}
.month-cell.year-start { border-left: 2px solid var(--border-strong); }

.track {
  position: relative;
  background: var(--surface);
  transition: background var(--dur) var(--ease);
}
.track.drop-active { background: var(--accent-soft); }

.grid-line { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--border); }
.grid-line.quarter { background: color-mix(in srgb, var(--border) 40%, transparent); }
.grid-line.year-line { width: 2px; background: var(--border-strong); }

.today-line {
  position: absolute; top: 0; bottom: 0; width: 2px;
  background: var(--today); z-index: 6;
  pointer-events: none;   /* 不擋橫條拖曳 */
}
.today-chip {
  position: absolute; top: 4px; left: 50%; transform: translateX(-50%);
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--today); color: #451a03;
  font-family: var(--font-mono); font-size: 10px; font-weight: 600;
  letter-spacing: .03em;
  white-space: nowrap;
  box-shadow: 0 0 10px var(--today-soft);
}

.track-empty {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  margin: 0; color: var(--faint); font-size: 13px;
  pointer-events: none;
}
</style>
