<script setup>
import { ref, computed, nextTick } from 'vue'
import { useElementBounding } from '@vueuse/core'
import {
  MONTH_COUNT, SUBDIVISIONS, LANE_HEIGHT, BAND_HEADER, BAND_GAP,
  TIMELINE_START_YEAR, TIMELINE_START_MONTH,
} from '../constants.js'
import { pxToMonth, resolveBandLane } from '../composables/geometry.js'
import { useTimelineZoom } from '../composables/useTimelineZoom.js'
import { buildColumns, buildYearGroups, dateToOffset } from '../composables/calendar.js'
import ProjectBar from './ProjectBar.vue'

const props = defineProps({
  projects: { type: Array, required: true },
  categories: { type: Array, default: () => [] },
  selectedId: { type: String, default: null },
})
const emit = defineEmits(['edit', 'remove', 'update', 'schedule', 'select', 'add-category', 'edit-category'])

// 月寬可縮放；內容總寬隨之變化，超出容器就橫向捲動
const { monthWidth, totalWidth, zoomPercent, zoomAt, fitRange, reset } = useTimelineZoom()
const scrollEl = ref(null)

// 以「視口內某 x 位置」為錨點縮放：先算錨點的月座標，縮放後把它捲回原位
async function zoomBy(factor, viewportX = null) {
  const el = scrollEl.value
  if (!el) return
  const x = viewportX ?? el.clientWidth / 2
  const anchorMonth = (el.scrollLeft + x) / monthWidth.value
  const next = zoomAt(factor, anchorMonth, x)
  await nextTick()  // 等 canvas 寬度更新，否則 scrollLeft 會被舊寬度 clamp
  el.scrollLeft = next
}

function onWheel(e) {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  const rect = scrollEl.value.getBoundingClientRect()
  zoomBy(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - rect.left)
}

function resetZoom() {
  reset()
  if (scrollEl.value) scrollEl.value.scrollLeft = 0
}

// 月份標題列拖選 → 該區間撐滿視口
const selecting = ref(false)
const selAnchor = ref(0)   // 月座標
const selCursor = ref(0)
const selLeft = computed(() => Math.min(selAnchor.value, selCursor.value) * monthWidth.value)
const selWidth = computed(() => Math.abs(selCursor.value - selAnchor.value) * monthWidth.value)

function eventMonth(e) {
  const m = (e.clientX - trackLeft.value) / monthWidth.value
  return Math.min(MONTH_COUNT, Math.max(0, m))
}
function onSelectStart(e) {
  selecting.value = true
  selAnchor.value = selCursor.value = eventMonth(e)
  e.target.setPointerCapture?.(e.pointerId)
}
function onSelectMove(e) {
  if (!selecting.value) return
  selCursor.value = eventMonth(e)
}
async function onSelectEnd() {
  if (!selecting.value) return
  selecting.value = false
  const a = selAnchor.value, b = selCursor.value
  if (Math.abs(b - a) < 0.3) return  // 太短視為誤觸/點擊
  const next = fitRange(a, b, scrollEl.value.clientWidth)
  if (next === null) return
  await nextTick()  // 等 canvas 寬度更新，否則 scrollLeft 會被舊寬度 clamp
  scrollEl.value.scrollLeft = next
}

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

// Swimlane 帶：每個類別一帶 + 固定殿後的「未分類」帶。
// lane 為帶內列號；帶高隨帶內最大 lane 成長，最少 2 列。
const bands = computed(() => {
  const defs = [
    ...props.categories.map((c) => ({ id: c.id, name: c.name, color: c.color, editable: true })),
    { id: null, name: '未分類', color: null, editable: false },
  ]
  let top = 0
  return defs.map((d) => {
    const items = scheduled.value.filter((p) => (p.categoryId ?? null) === d.id)
    const laneCount = Math.max(2, ...items.map((p) => (p.lane ?? 0) + 1))
    const height = BAND_HEADER + laneCount * LANE_HEIGHT + 8
    const band = { ...d, items, laneCount, height, top }
    top += height + BAND_GAP
    return band
  })
})
const trackHeight = computed(() => {
  const last = bands.value[bands.value.length - 1]
  return last ? last.top + last.height + 8 : 0
})

// 每條 bar 右側到「同帶同列」下一條 bar 的空隙（px）。
// ProjectBar 用它決定名稱能否浮到條外而不壓到鄰條。
const gapById = computed(() => {
  const rows = new Map()
  for (const p of scheduled.value) {
    const key = `${p.categoryId ?? ''}#${p.lane}`
    if (!rows.has(key)) rows.set(key, [])
    rows.get(key).push(p)
  }
  const map = {}
  for (const list of rows.values()) {
    list.sort((a, b) => a.startMonth - b.startMonth)
    list.forEach((p, i) => {
      const next = list[i + 1]
      map[p.id] = next
        ? Math.max(0, (next.startMonth - (p.startMonth + p.duration)) * monthWidth.value)
        : Number.POSITIVE_INFINITY
    })
  }
  return map
})

// 回傳「以當下帶佈局快照」解析 y 的 resolver。
// 拖曳開始時呼叫一次，整段拖曳沿用同一快照 —— 不能用 live 佈局，
// 否則 lane 增加使帶長高、帶底追著游標跑，往下拖永遠出不了帶。
function makeLaneResolver() {
  const snap = bands.value.map((b) => ({
    id: b.id, top: b.top, height: b.height, laneCount: b.laneCount,
  }))
  return (clientY) => resolveBandLane(snap, clientY - trackTop.value, LANE_HEIGHT, BAND_HEADER)
}

// 從側欄拖入時高亮軌道，提示可放置
const dropActive = ref(false)

function onDrop(e) {
  dropActive.value = false
  const id = e.dataTransfer.getData('text/plain')
  if (!id) return
  const raw = pxToMonth(e.clientX, trackLeft.value, monthWidth.value)
  const startMonth = Math.min(raw, MONTH_COUNT - 1)
  const { categoryId, lane } = makeLaneResolver()(e.clientY)
  emit('schedule', id, { startMonth, lane, categoryId })
}

defineExpose({ trackEl, monthWidth })
</script>

<template>
  <div class="timeline">
    <div class="zoom-controls">
      <button class="zoom-btn" title="縮小" aria-label="縮小" @click="zoomBy(1 / 1.2)">−</button>
      <span class="zoom-pct">{{ zoomPercent }}%</span>
      <button class="zoom-btn" title="放大" aria-label="放大" @click="zoomBy(1.2)">＋</button>
      <button class="zoom-reset" @click="resetZoom">重設</button>
    </div>
    <div ref="scrollEl" class="scroll" @wheel="onWheel">
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
        <div
          class="month-row"
          :class="{ selecting }"
          @pointerdown="onSelectStart"
          @pointermove="onSelectMove"
          @pointerup="onSelectEnd"
          @pointercancel="selecting = false"
        >
          <div
            v-for="c in columns"
            :key="c.index"
            class="month-cell"
            :class="{ 'year-start': c.isYearStart && c.index !== 0 }"
            :style="{ width: monthWidth + 'px' }"
          >{{ c.label }}</div>
        </div>

        <!-- 拖選聚焦的高亮區 -->
        <div
          v-if="selecting"
          class="select-overlay"
          :style="{ left: selLeft + 'px', width: selWidth + 'px' }"
        />

        <!-- 軌道 -->
        <div
          ref="trackEl"
          class="track"
          :class="{ 'drop-active': dropActive }"
          :style="{ height: trackHeight + 'px' }"
          @dragover.prevent="dropActive = true"
          @dragleave.self="dropActive = false"
          @drop="onDrop"
          @click.self="emit('select', null)"
        >
          <!-- 季度細格線 -->
          <template v-if="monthWidth >= 48">
            <div
              v-for="i in MONTH_COUNT * SUBDIVISIONS"
              :key="'q' + i"
              class="grid-line quarter"
              :style="{ left: (i - 1) * monthWidth / SUBDIVISIONS + 'px' }"
            />
          </template>
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

          <!-- Swimlane 帶：視窗框（title bar + 圓角外框） -->
          <div
            v-for="b in bands"
            :key="b.id ?? 'uncat'"
            class="band"
            :style="{
              top: b.top + 'px',
              height: b.height + 'px',
              borderColor: `color-mix(in srgb, ${b.color || 'var(--border-strong)'} 45%, transparent)`,
              background: b.color ? `color-mix(in srgb, ${b.color} 7%, transparent)` : 'transparent',
            }"
          >
            <div
              class="band-head"
              :style="{
                background: `color-mix(in srgb, ${b.color || 'var(--border-strong)'} 16%, transparent)`,
                borderColor: `color-mix(in srgb, ${b.color || 'var(--border-strong)'} 45%, transparent)`,
              }"
            >
              <component
                :is="b.editable ? 'button' : 'span'"
                class="band-name"
                :class="{ editable: b.editable }"
                :style="b.color ? { color: b.color } : {}"
                @click="b.editable && emit('edit-category', props.categories.find((c) => c.id === b.id))"
              >{{ b.name }}</component>
            </div>
          </div>

          <p v-if="!scheduled.length" class="track-empty">
            從左側把 Project 拖到這裡開始排程
          </p>

          <template v-for="b in bands" :key="'bars-' + (b.id ?? 'uncat')">
            <ProjectBar
              v-for="p in b.items"
              :key="p.id"
              :project="p"
              :month-width="monthWidth"
              :track-left="trackLeft"
              :band-top="b.top + BAND_HEADER"
              :gap-px="gapById[p.id]"
              :make-lane-resolver="makeLaneResolver"
              :selected="p.id === selectedId"
              @edit="emit('edit', $event)"
              @remove="emit('remove', $event)"
              @update="(id, patch) => emit('update', id, patch)"
              @select="emit('select', $event)"
            />
          </template>
        </div>
      </div>
    </div>
    <button class="add-category" @click="emit('add-category')">＋ 新增類別</button>
  </div>
</template>

<style scoped>
.timeline { font-family: var(--font-ui); position: relative; }

.zoom-controls {
  display: flex; align-items: center; gap: var(--sp-1);
  margin-bottom: var(--sp-2);
  justify-content: flex-end;
}
.zoom-btn {
  width: 24px; height: 24px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--border-strong); border-radius: var(--radius-xs);
  background: var(--surface-2); color: var(--text);
  font-size: 13px; line-height: 1; cursor: pointer;
  transition: background var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.zoom-btn:hover { background: var(--surface); border-color: var(--accent); }
.zoom-pct {
  min-width: 44px; text-align: center;
  font-family: var(--font-mono); font-size: 11.5px; color: var(--muted);
}
.zoom-reset {
  margin-left: var(--sp-1);
  padding: 3px var(--sp-2);
  border: 1px solid var(--border-strong); border-radius: var(--radius-xs);
  background: transparent; color: var(--muted);
  font: inherit; font-size: 11.5px; cursor: pointer;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
}
.zoom-reset:hover { background: var(--surface-2); color: var(--text); }

.select-overlay {
  position: absolute; top: 0; bottom: 0;
  background: var(--accent-soft);
  border-left: 1px solid var(--accent);
  border-right: 1px solid var(--accent);
  z-index: 7; pointer-events: none;
}
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

.month-row {
  display: flex; border-bottom: 1px solid var(--border-strong);
  cursor: crosshair; user-select: none; touch-action: none;
}
.month-row.selecting { background: var(--surface-2); }
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

.band {
  position: absolute; left: 2px; right: 2px;
  border: 1.5px solid;
  border-radius: 10px;
  overflow: hidden;
  pointer-events: none;   /* 不擋 bar 拖曳；名稱自己開 pointer-events */
}
.band-head {
  height: 34.5px;         /* BAND_HEADER 36 - 上框線 */
  display: flex; align-items: center;
  border-bottom: 1px solid;
}
.band-name {
  position: sticky; left: 12px;
  display: inline-block;
  margin-left: 12px; padding: 0;
  border: none; background: transparent;
  color: var(--text);
  font: inherit; font-size: 15.5px; font-weight: 700; letter-spacing: .05em;
  pointer-events: auto;
  z-index: 5;
}
.band-name.editable { cursor: pointer; }
.band-name.editable:hover { filter: brightness(1.3); }

.add-category {
  margin-top: var(--sp-2);
  padding: var(--sp-1) var(--sp-3);
  border: 1px dashed var(--border-strong); border-radius: var(--radius-sm);
  background: transparent; color: var(--muted);
  font: inherit; font-size: 12px; cursor: pointer;
  transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.add-category:hover { color: var(--accent); border-color: var(--accent); }

.track-empty {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  margin: 0; color: var(--faint); font-size: 13px;
  pointer-events: none;
}
</style>
