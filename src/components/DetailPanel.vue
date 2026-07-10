<script setup>
import { computed } from 'vue'
import { TIMELINE_START_YEAR, TIMELINE_START_MONTH } from '../constants.js'
import { formatYearMonth } from '../composables/calendar.js'

const props = defineProps({
  project: { type: Object, default: null },
})
const emit = defineEmits(['edit', 'remove', 'close'])

const startLabel = computed(() =>
  props.project ? formatYearMonth(props.project.startMonth, TIMELINE_START_YEAR, TIMELINE_START_MONTH) : ''
)
// 結束月：起點 + 長度，減一極小值讓「剛好整月」落在最後一個月而非跨到下月
const endLabel = computed(() =>
  props.project
    ? formatYearMonth(props.project.startMonth + props.project.duration - 0.001, TIMELINE_START_YEAR, TIMELINE_START_MONTH)
    : ''
)
const durationLabel = computed(() => {
  if (!props.project) return ''
  const d = props.project.duration
  return Number.isInteger(d) ? `${d} 個月` : `${d} 個月`
})
</script>

<template>
  <section class="detail" :class="{ empty: !project }">
    <template v-if="project">
      <div class="head">
        <div class="title-wrap">
          <span class="swatch" :style="{ background: project.color || 'var(--accent)' }" />
          <h2>{{ project.name }}</h2>
        </div>
        <div class="acts">
          <button @click="emit('edit', project)">編輯</button>
          <button class="danger" @click="emit('remove', project.id)">刪除</button>
          <button class="ghost" title="關閉" @click="emit('close')">✕</button>
        </div>
      </div>

      <div class="grid">
        <div class="field">
          <span class="k">時程</span>
          <span class="v mono">{{ startLabel }} → {{ endLabel }}</span>
        </div>
        <div class="field">
          <span class="k">長度</span>
          <span class="v mono">{{ durationLabel }}</span>
        </div>
        <div class="field">
          <span class="k">負責人</span>
          <span class="v">{{ project.owner || '—' }}</span>
        </div>
        <div class="field">
          <span class="k">核心利益人</span>
          <span class="v">{{ project.stakeholder || '—' }}</span>
        </div>
        <div class="field span-2">
          <span class="k">簡介</span>
          <span class="v">{{ project.summary || '—' }}</span>
        </div>
      </div>
    </template>

    <p v-else class="hint">點擊時間軸上的橫條，這裡顯示該 Project 的詳細資訊</p>
  </section>
</template>

<style scoped>
.detail {
  margin-top: var(--sp-5);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: var(--sp-4) var(--sp-5);
}
.detail.empty { display: flex; align-items: center; justify-content: center; }
.hint { margin: 0; color: var(--muted); font-size: 13px; padding: var(--sp-4); }

.head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--sp-4); margin-bottom: var(--sp-4); }
.title-wrap { display: flex; align-items: center; gap: var(--sp-3); min-width: 0; }
.swatch { flex: none; width: 12px; height: 12px; border-radius: 3px; }
.head h2 { margin: 0; font-size: 17px; font-weight: 650; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.acts { flex: none; display: flex; gap: var(--sp-2); }
.acts button {
  padding: var(--sp-1) var(--sp-3); font: inherit; font-size: 13px; font-weight: 550;
  border: 1px solid var(--border-strong); border-radius: var(--radius-sm);
  background: var(--surface); color: var(--text); cursor: pointer;
}
.acts button:hover { background: var(--surface-2); }
.acts .danger { border-color: var(--danger); color: var(--danger); }
.acts .danger:hover { background: var(--danger); color: #fff; }
.acts .ghost { border: none; color: var(--muted); }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3) var(--sp-5); }
.field { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.field.span-2 { grid-column: 1 / -1; }
.k { font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
.v { font-size: 14px; color: var(--text); line-height: 1.5; overflow-wrap: anywhere; }
.v.mono { font-family: var(--font-mono); }
</style>
