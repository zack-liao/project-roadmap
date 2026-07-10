<script setup>
import { computed } from 'vue'

const props = defineProps({
  projects: { type: Array, required: true },
})
const emit = defineEmits(['add', 'edit', 'remove'])

const unscheduled = computed(() =>
  props.projects.filter((p) => p.startMonth === null)
)

function onDragStart(e, id) {
  e.dataTransfer.setData('text/plain', id)
  e.dataTransfer.effectAllowed = 'move'
}
</script>

<template>
  <aside class="sidebar">
    <div class="head">
      <span class="title">未排程</span>
      <span class="count">{{ unscheduled.length }}</span>
    </div>

    <div v-if="unscheduled.length" class="items">
      <div
        v-for="p in unscheduled"
        :key="p.id"
        class="card"
        draggable="true"
        @dragstart="onDragStart($event, p.id)"
        @dblclick="emit('edit', p)"
      >
        <div class="card-main">
          <span class="name">{{ p.name }}</span>
          <span v-if="p.owner" class="owner">{{ p.owner }}</span>
        </div>
        <button class="del" title="刪除" @click.stop="emit('remove', p.id)">✕</button>
      </div>
    </div>

    <div v-else class="empty">
      <p class="empty-title">沒有待排程的 Project</p>
      <p class="empty-hint">新增後拖曳到右側時間軸即可安排時程</p>
      <button class="add" @click="emit('add')">+ 新增 Project</button>
    </div>

    <p v-if="unscheduled.length" class="foot">拖曳卡片到時間軸排程</p>
  </aside>
</template>

<style scoped>
.sidebar {
  flex: none;
  width: 264px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-right: 1px solid var(--border);
}
.head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-4) var(--sp-3);
  border-bottom: 1px solid var(--border);
}
.title { font-size: 13px; font-weight: 650; letter-spacing: .02em; text-transform: uppercase; color: var(--muted); }
.count {
  font-family: var(--font-mono);
  font-size: 12px;
  min-width: 22px; height: 22px; padding: 0 6px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--surface-2); border-radius: 999px; color: var(--text);
}

.items { flex: 1; min-height: 0; overflow-y: auto; padding: var(--sp-3); display: flex; flex-direction: column; gap: var(--sp-2); }
.card {
  display: flex; align-items: center; gap: var(--sp-2);
  padding: var(--sp-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-sm);
  cursor: grab;
  transition: box-shadow .12s, border-color .12s, transform .12s;
}
.card:hover { box-shadow: var(--shadow); transform: translateY(-1px); }
.card:active { cursor: grabbing; }
.card-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.name { font-size: 14px; font-weight: 550; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.owner { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.del {
  flex: none; width: 24px; height: 24px; border: none; border-radius: var(--radius-sm);
  background: transparent; color: var(--muted); cursor: pointer; opacity: 0;
  transition: opacity .12s, background .12s, color .12s;
}
.card:hover .del { opacity: 1; }
.del:hover { background: var(--surface-2); color: var(--danger); }

.empty {
  flex: 1; min-height: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--sp-2); padding: var(--sp-5); text-align: center;
}
.empty-title { margin: 0; font-size: 14px; font-weight: 600; color: var(--text); }
.empty-hint { margin: 0; font-size: 12px; line-height: 1.5; color: var(--muted); max-width: 200px; }
.add {
  margin-top: var(--sp-3); padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--accent); border-radius: var(--radius-sm);
  background: var(--accent-soft); color: var(--accent-ink); font-weight: 600; cursor: pointer;
}
.add:hover { background: var(--accent); color: #fff; }

.foot {
  flex: none; margin: 0; padding: var(--sp-3) var(--sp-4);
  font-size: 11px; color: var(--muted); border-top: 1px solid var(--border);
}
</style>
