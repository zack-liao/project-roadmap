<script setup>
import { ref, computed } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  projects: { type: Array, required: true },
})
const emit = defineEmits(['add', 'edit', 'remove'])

// 收合狀態記在 localStorage,重開維持
const COLLAPSE_KEY = 'roadmap.sidebarCollapsed'
const collapsed = ref(localStorage.getItem(COLLAPSE_KEY) === '1')
function toggleCollapse() {
  collapsed.value = !collapsed.value
  localStorage.setItem(COLLAPSE_KEY, collapsed.value ? '1' : '0')
}

const unscheduled = computed(() =>
  props.projects.filter((p) => p.startMonth === null)
)

function onDragStart(e, id) {
  e.dataTransfer.setData('text/plain', id)
  e.dataTransfer.effectAllowed = 'move'
}
</script>

<template>
  <aside class="sidebar" :class="{ collapsed }">
    <div class="head">
      <template v-if="!collapsed">
        <span class="title">未排程</span>
        <span class="count">{{ unscheduled.length }}</span>
      </template>
      <button
        class="collapse-btn"
        :title="collapsed ? '展開側欄' : '收合側欄'"
        :aria-label="collapsed ? '展開側欄' : '收合側欄'"
        :aria-expanded="!collapsed"
        @click="toggleCollapse"
      >
        <AppIcon :name="collapsed ? 'chevron-right' : 'chevron-left'" :size="15" />
      </button>
    </div>
    <div v-if="collapsed" class="rail" @click="toggleCollapse">
      <span class="rail-count">{{ unscheduled.length }}</span>
      <span class="rail-label">未排程</span>
    </div>
    <template v-if="!collapsed">

    <div v-if="unscheduled.length" class="items">
      <div
        v-for="p in unscheduled"
        :key="p.id"
        class="card"
        draggable="true"
        @dragstart="onDragStart($event, p.id)"
        @dblclick="emit('edit', p)"
      >
        <span class="grip"><AppIcon name="grip" :size="15" /></span>
        <div class="card-main">
          <span class="name">{{ p.name }}</span>
          <span v-if="p.owner" class="owner">{{ p.owner }}</span>
        </div>
        <div class="acts">
          <button class="act" title="編輯" aria-label="編輯" @click.stop="emit('edit', p)">
            <AppIcon name="pencil" :size="13" />
          </button>
          <button class="act del" title="刪除" aria-label="刪除" @click.stop="emit('remove', p.id)">
            <AppIcon name="trash" :size="13" />
          </button>
        </div>
      </div>
      <p class="foot">拖曳卡片到時間軸排程；雙擊卡片編輯</p>
    </div>

    <div v-else class="empty">
      <span class="empty-icon"><AppIcon name="calendar" :size="22" /></span>
      <p class="empty-title">沒有待排程的 Project</p>
      <p class="empty-hint">新增後拖曳到右側時間軸即可安排時程</p>
      <button class="add" @click="emit('add')">
        <AppIcon name="plus" :size="14" />新增 Project
      </button>
    </div>
    </template>
  </aside>
</template>

<style scoped>
.sidebar {
  flex: none;
  width: 264px;
  transition: width var(--dur) var(--ease);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border-right: 1px solid var(--border);
}
.sidebar.collapsed { width: 44px; }
.sidebar.collapsed .head {
  justify-content: center;
  padding: var(--sp-3) 0;
}
.collapse-btn {
  width: 24px; height: 24px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--border-strong); border-radius: var(--radius-xs);
  background: var(--surface-2); color: var(--muted); cursor: pointer;
  transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.collapse-btn:hover { color: var(--text); border-color: var(--accent); }

.rail {
  flex: 1;
  display: flex; flex-direction: column; align-items: center;
  gap: var(--sp-2); padding-top: var(--sp-3);
  cursor: pointer;
}
.rail-count {
  min-width: 20px; height: 20px; padding: 0 5px;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 999px;
  background: var(--surface-2); border: 1px solid var(--border-strong);
  font-family: var(--font-mono); font-size: 11px; color: var(--muted);
}
.rail-label {
  writing-mode: vertical-rl;
  font-size: 12px; letter-spacing: .2em; color: var(--faint);
}

.head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-4) var(--sp-4) var(--sp-3);
  border-bottom: 1px solid var(--border);
}
.title {
  font-family: var(--font-display);
  font-size: 13px; font-weight: 600; letter-spacing: .06em;
  text-transform: uppercase; color: var(--muted);
}
.count {
  font-family: var(--font-mono);
  font-size: 12px;
  min-width: 22px; height: 22px; padding: 0 6px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--accent-soft); border-radius: 999px; color: var(--accent);
}

.items {
  flex: 1; min-height: 0; overflow-y: auto;
  padding: var(--sp-3);
  display: flex; flex-direction: column; gap: var(--sp-2);
}
.card {
  display: flex; align-items: center; gap: var(--sp-2);
  padding: var(--sp-2) var(--sp-2) var(--sp-2) var(--sp-1);
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: grab;
  transition: border-color var(--dur) var(--ease), transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.card:hover { border-color: var(--border-strong); box-shadow: var(--shadow); transform: translateY(-1px); }
.card:active { cursor: grabbing; transform: none; }
.grip { flex: none; display: inline-flex; color: var(--faint); }
.card-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.name { font-size: 13.5px; font-weight: 550; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.owner { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.acts { flex: none; display: flex; gap: 2px; }
.act {
  width: 26px; height: 26px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: var(--radius-xs);
  background: transparent; color: var(--faint); cursor: pointer;
  opacity: 0;
  transition: opacity var(--dur) var(--ease), background var(--dur) var(--ease), color var(--dur) var(--ease);
}
.card:hover .act, .card:focus-within .act, .act:focus-visible { opacity: 1; }
.act:hover { background: var(--surface-3); color: var(--text); }
.act.del:hover { background: var(--danger-soft); color: var(--danger); }

.empty {
  flex: 1; min-height: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--sp-2); padding: var(--sp-5); text-align: center;
}
.empty-icon {
  display: inline-flex; padding: var(--sp-3);
  border-radius: 50%;
  background: var(--accent-soft); color: var(--accent);
  margin-bottom: var(--sp-1);
}
.empty-title { margin: 0; font-size: 14px; font-weight: 600; color: var(--text); }
.empty-hint { margin: 0; font-size: 12px; line-height: 1.5; color: var(--muted); max-width: 200px; }
.add {
  margin-top: var(--sp-3);
  display: inline-flex; align-items: center; gap: 6px;
  padding: var(--sp-2) var(--sp-4);
  border: 1px solid var(--accent-border); border-radius: var(--radius-sm);
  background: var(--accent-soft); color: var(--accent);
  font: inherit; font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
}
.add:hover { background: var(--accent); color: var(--accent-ink); }

.foot {
  margin: auto 0 0; padding-top: var(--sp-3);
  font-size: 11px; line-height: 1.5; color: var(--faint);
}
</style>
