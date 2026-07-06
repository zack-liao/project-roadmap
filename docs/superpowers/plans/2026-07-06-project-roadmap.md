# Project Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建一個純本地端 Vue 3 甘特圖 roadmap 工具，能新增/編輯 Project 並拖曳規劃到 12 個月的 timeline，資料存 localStorage 並可 JSON 匯入/匯出。

**Architecture:** Vite + Vue 3（`<script setup>` Composition API）。狀態邏輯抽在 `composables/`（`useProjects` 資料層、`useDragBar` 拖曳層），UI 元件只負責畫圖與發事件。純函式（座標↔月換算、CRUD）用 Vitest 測，UI 用瀏覽器手動驗證。

**Tech Stack:** Vue 3, Vite, VueUse, Vitest, localStorage, scoped CSS。

## Global Constraints

- 框架：Vue 3 僅用 Composition API + `<script setup>`，不用 Options API
- 純本地端：無後端、無網路請求、無 File System API（匯出用 Blob 下載、匯入用 `<input type=file>`）
- 儲存：localStorage key 固定 `roadmap.projects`，值為 `Project[]` 的 `JSON.stringify`
- 造型：只用 SFC scoped CSS，不引入 Tailwind 或任何 UI 框架
- 拖曳底層用 VueUse（`@vueuse/core`），甘特座標邏輯自刻
- Timeline 固定 12 個月（0=Jan ~ 11=Dec），單一年度，不做跨年
- `Project` 型別（貫穿全 plan，欄位名不可變）：
  ```js
  Project = {
    id: string,          // crypto.randomUUID()
    name: string,
    summary: string,
    owner: string,
    stakeholder: string,
    startMonth: number | null,  // 0~11；null = 未排程
    duration: number,           // 月數，>=1
    lane: number | null,        // 軌道列 index >=0；null = 未排程
    color?: string
  }
  ```
- 每 task 完成後 commit；commit message 用 Conventional Commits

---

## 檔案結構

```
project-roadmap/
├─ index.html
├─ package.json
├─ vite.config.js
├─ vitest.config.js          (或併入 vite.config.js)
├─ src/
│  ├─ main.js                Vue app 掛載進入點
│  ├─ App.vue                根元件，協調 state 與子元件
│  ├─ constants.js           MONTHS 陣列、STORAGE_KEY 等常數
│  ├─ composables/
│  │  ├─ useProjects.js      CRUD + localStorage + JSON 匯入匯出
│  │  ├─ useProjects.test.js Vitest
│  │  ├─ geometry.js         純函式：座標↔月換算（無 Vue 依賴，好測）
│  │  ├─ geometry.test.js    Vitest
│  │  └─ useDragBar.js       拖曳狀態機（VueUse pointer + geometry）
│  └─ components/
│     ├─ Toolbar.vue         新增鈕 + 匯入/匯出
│     ├─ ProjectList.vue     左側未排程清單
│     ├─ ProjectModal.vue    新增/編輯表單
│     ├─ Timeline.vue        甘特主體 + 12 月軸
│     └─ ProjectBar.vue      單一橫條（拖移 + 拉伸）
```

---

### Task 1: 專案骨架跑起來

**學什麼**：Vite 專案結構、`main.js` 如何把 Vue app 掛到 DOM、SFC（單一檔案元件）長怎樣、dev server 熱更新。對照後端：`main.js` ≈ 程式進入點，`App.vue` ≈ root controller。

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/App.vue`, `src/constants.js`

**Interfaces:**
- Produces: `src/constants.js` 匯出 `MONTHS`（12 元素字串陣列）、`STORAGE_KEY = 'roadmap.projects'`

- [ ] **Step 1: 初始化專案並裝依賴**

Run:
```bash
cd /Users/zack/work/project-roadmap
npm create vite@latest . -- --template vue
npm install
npm install @vueuse/core
npm install -D vitest
```
若 `npm create` 問是否覆蓋非空目錄，選 `Ignore files and continue`（保留 docs/、.git）。

- [ ] **Step 2: 清掉 Vite 範本雜物**

刪除 `src/components/HelloWorld.vue`、`src/assets/`、`src/style.css`（若存在）。從 `src/main.js` 移除 `import './style.css'`。

- [ ] **Step 3: 建常數檔**

Create `src/constants.js`：
```js
export const STORAGE_KEY = 'roadmap.projects'

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export const MONTH_COUNT = 12
```

- [ ] **Step 4: 極簡 App.vue**

Overwrite `src/App.vue`：
```vue
<script setup>
import { MONTHS } from './constants.js'
</script>

<template>
  <h1>Project Roadmap</h1>
  <p>Months: {{ MONTHS.join(', ') }}</p>
</template>

<style scoped>
h1 { font-family: system-ui, sans-serif; }
</style>
```

- [ ] **Step 5: 跑 dev server 驗證**

Run: `npm run dev`
Expected：終端印出 `Local: http://localhost:5173/`。瀏覽器開該網址，看到標題「Project Roadmap」與 12 個月份縮寫。改 App.vue 存檔，畫面自動更新（熱更新）。

- [ ] **Step 6: 設定 Vitest**

在 `vite.config.js` 加 test 設定（若用獨立 `vitest.config.js` 亦可）：
```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'node',
  },
})
```
在 `package.json` 的 `scripts` 加：`"test": "vitest run"`。

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + Vue 3 project with VueUse and Vitest"
```

---

### Task 2: geometry 純函式（座標↔月換算）

**學什麼**：把「數學/邏輯」和「畫面」分離 — 這些是純函式（同輸入必同輸出、無副作用），最好測。這是甘特的核心學習點。對照後端：像獨立的 util/domain function。

**Files:**
- Create: `src/composables/geometry.js`, `src/composables/geometry.test.js`

**Interfaces:**
- Produces:
  - `pxToMonth(x, trackLeft, monthWidth)` → `number`（clamp 到 0~11 的整數月）
  - `monthToPx(month, monthWidth)` → `number`（橫條 left）
  - `durationToPx(duration, monthWidth)` → `number`（橫條 width）
  - `clampBar(startMonth, duration)` → `{ startMonth, duration }`（保證落在 0~11 內、duration>=1）

- [ ] **Step 1: 寫失敗測試**

Create `src/composables/geometry.test.js`：
```js
import { describe, it, expect } from 'vitest'
import { pxToMonth, monthToPx, durationToPx, clampBar } from './geometry.js'

describe('pxToMonth', () => {
  it('maps track-relative x to month index, snapping to nearest', () => {
    // monthWidth=100, trackLeft=0
    expect(pxToMonth(0, 0, 100)).toBe(0)
    expect(pxToMonth(149, 0, 100)).toBe(1)   // round: 1.49 -> 1
    expect(pxToMonth(150, 0, 100)).toBe(2)   // round: 1.5 -> 2
  })

  it('accounts for track left offset', () => {
    expect(pxToMonth(250, 200, 100)).toBe(1) // (250-200)/100 = 0.5 -> 1
  })

  it('clamps below 0 and above 11', () => {
    expect(pxToMonth(-500, 0, 100)).toBe(0)
    expect(pxToMonth(99999, 0, 100)).toBe(11)
  })
})

describe('monthToPx / durationToPx', () => {
  it('converts month and duration to pixels', () => {
    expect(monthToPx(3, 100)).toBe(300)
    expect(durationToPx(2, 100)).toBe(200)
  })
})

describe('clampBar', () => {
  it('keeps a valid bar unchanged', () => {
    expect(clampBar(3, 2)).toEqual({ startMonth: 3, duration: 2 })
  })
  it('forces duration to at least 1', () => {
    expect(clampBar(3, 0)).toEqual({ startMonth: 3, duration: 1 })
  })
  it('pulls a bar that overflows the right edge back inside', () => {
    // start 10, duration 5 would end at 15; max end is 12 (exclusive)
    expect(clampBar(10, 5)).toEqual({ startMonth: 7, duration: 5 })
  })
  it('never lets startMonth go below 0', () => {
    expect(clampBar(-3, 2)).toEqual({ startMonth: 0, duration: 2 })
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test -- geometry`
Expected: FAIL，`pxToMonth is not a function`（模組尚未建立）。

- [ ] **Step 3: 實作 geometry.js**

Create `src/composables/geometry.js`：
```js
import { MONTH_COUNT } from '../constants.js'

// 螢幕 x（相對整個視窗）→ 月 index，四捨五入吸附、clamp 0~11
export function pxToMonth(x, trackLeft, monthWidth) {
  const raw = (x - trackLeft) / monthWidth
  const rounded = Math.round(raw)
  return Math.min(MONTH_COUNT - 1, Math.max(0, rounded))
}

export function monthToPx(month, monthWidth) {
  return month * monthWidth
}

export function durationToPx(duration, monthWidth) {
  return duration * monthWidth
}

// 保證橫條合法：duration>=1、整條落在 0~11 內
export function clampBar(startMonth, duration) {
  const dur = Math.max(1, duration)
  let start = Math.max(0, startMonth)
  if (start + dur > MONTH_COUNT) {
    start = Math.max(0, MONTH_COUNT - dur)
  }
  return { startMonth: start, duration: dur }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test -- geometry`
Expected: PASS，全部綠。

- [ ] **Step 5: Commit**

```bash
git add src/composables/geometry.js src/composables/geometry.test.js
git commit -m "feat: add geometry pure functions for gantt coordinate math"
```

---

### Task 3: useProjects composable（CRUD + localStorage）

**學什麼**：Vue 響應式（`ref`/`reactive`）— 資料變、畫面自動變，不用手動操作 DOM。這是 Vue 最核心概念。composable = 可重用的邏輯函式（用 `use` 開頭是慣例）。`watch` 監聽變化做副作用（存 localStorage）。對照後端：`useProjects` ≈ repository + 自動持久化。

**Files:**
- Create: `src/composables/useProjects.js`, `src/composables/useProjects.test.js`

**Interfaces:**
- Consumes: `STORAGE_KEY` from `constants.js`
- Produces: `useProjects()` 回傳 `{ projects, addProject, updateProject, removeProject, loadFromArray, toArray }`
  - `projects`：`ref<Project[]>`
  - `addProject(fields)`：帶入 `{name, summary, owner, stakeholder}`，自動補 `id`、`startMonth:null`、`duration:1`、`lane:null`，回傳新 project
  - `updateProject(id, patch)`：淺合併 patch 到指定 project
  - `removeProject(id)`：移除
  - `loadFromArray(arr)`：整份取代（匯入用）
  - `toArray()`：回傳當前陣列的純值拷貝（匯出用）

- [ ] **Step 1: 寫失敗測試**

Create `src/composables/useProjects.test.js`：
```js
import { describe, it, expect, beforeEach, vi } from 'vitest'

// 在 node 環境模擬 localStorage
beforeEach(() => {
  const store = {}
  vi.stubGlobal('localStorage', {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    removeItem: (k) => { delete store[k] },
  })
  // 模擬 crypto.randomUUID
  let n = 0
  vi.stubGlobal('crypto', { randomUUID: () => `id-${++n}` })
})

import { useProjects } from './useProjects.js'
import { nextTick } from 'vue'

describe('useProjects', () => {
  it('adds a project with generated id and defaults', () => {
    const { projects, addProject } = useProjects()
    const p = addProject({ name: 'A', summary: 's', owner: 'o', stakeholder: 'k' })
    expect(p.id).toBe('id-1')
    expect(p.startMonth).toBe(null)
    expect(p.duration).toBe(1)
    expect(p.lane).toBe(null)
    expect(projects.value).toHaveLength(1)
  })

  it('updates a project by id (shallow merge)', () => {
    const { projects, addProject, updateProject } = useProjects()
    const p = addProject({ name: 'A', summary: '', owner: '', stakeholder: '' })
    updateProject(p.id, { startMonth: 3, duration: 2, lane: 0 })
    expect(projects.value[0].startMonth).toBe(3)
    expect(projects.value[0].name).toBe('A')
  })

  it('removes a project by id', () => {
    const { projects, addProject, removeProject } = useProjects()
    const p = addProject({ name: 'A', summary: '', owner: '', stakeholder: '' })
    removeProject(p.id)
    expect(projects.value).toHaveLength(0)
  })

  it('persists to localStorage on change', async () => {
    const { addProject } = useProjects()
    addProject({ name: 'A', summary: '', owner: '', stakeholder: '' })
    await nextTick()
    const saved = JSON.parse(localStorage.getItem('roadmap.projects'))
    expect(saved).toHaveLength(1)
    expect(saved[0].name).toBe('A')
  })

  it('loadFromArray replaces the whole list', () => {
    const { projects, loadFromArray } = useProjects()
    loadFromArray([{ id: 'x', name: 'X', summary: '', owner: '', stakeholder: '', startMonth: 0, duration: 1, lane: 0 }])
    expect(projects.value).toHaveLength(1)
    expect(projects.value[0].id).toBe('x')
  })
})
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `npm test -- useProjects`
Expected: FAIL，`useProjects is not a function`。

- [ ] **Step 3: 實作 useProjects.js**

Create `src/composables/useProjects.js`：
```js
import { ref, watch } from 'vue'
import { STORAGE_KEY } from '../constants.js'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function useProjects() {
  const projects = ref(load())

  // 任何變化（深層）都自動存回 localStorage
  watch(projects, (val) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
  }, { deep: true })

  function addProject(fields) {
    const p = {
      id: crypto.randomUUID(),
      name: fields.name ?? '',
      summary: fields.summary ?? '',
      owner: fields.owner ?? '',
      stakeholder: fields.stakeholder ?? '',
      startMonth: null,
      duration: 1,
      lane: null,
    }
    projects.value.push(p)
    return p
  }

  function updateProject(id, patch) {
    const p = projects.value.find((x) => x.id === id)
    if (p) Object.assign(p, patch)
  }

  function removeProject(id) {
    projects.value = projects.value.filter((x) => x.id !== id)
  }

  function loadFromArray(arr) {
    projects.value = Array.isArray(arr) ? arr : []
  }

  function toArray() {
    return JSON.parse(JSON.stringify(projects.value))
  }

  return { projects, addProject, updateProject, removeProject, loadFromArray, toArray }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `npm test -- useProjects`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/composables/useProjects.js src/composables/useProjects.test.js
git commit -m "feat: add useProjects composable with localStorage persistence"
```

---

### Task 4: ProjectModal 表單（新增/編輯 4 欄）

**學什麼**：`v-model` 雙向綁定（表單輸入 ↔ 資料）、props 傳入、`emit` 傳出事件（子→父溝通）、`v-if` 條件渲染。對照後端：props ≈ 函式參數，emit ≈ callback/回傳。

**Files:**
- Create: `src/components/ProjectModal.vue`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: 無（獨立元件）
- Produces: `ProjectModal` 元件
  - props: `open: boolean`、`project: Project | null`（null=新增模式，非 null=編輯模式）
  - emits: `save`（payload `{name, summary, owner, stakeholder}`）、`close`

- [ ] **Step 1: 建 ProjectModal.vue**

Create `src/components/ProjectModal.vue`：
```vue
<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  project: { type: Object, default: null },
})
const emit = defineEmits(['save', 'close'])

const form = ref({ name: '', summary: '', owner: '', stakeholder: '' })

// 每次開啟時，用傳入的 project 填表（編輯）或清空（新增）
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    form.value = props.project
      ? { name: props.project.name, summary: props.project.summary, owner: props.project.owner, stakeholder: props.project.stakeholder }
      : { name: '', summary: '', owner: '', stakeholder: '' }
  }
})

function submit() {
  if (!form.value.name.trim()) return  // 名稱必填
  emit('save', { ...form.value })
}
</script>

<template>
  <div v-if="open" class="backdrop" @click.self="emit('close')">
    <div class="modal">
      <h2>{{ project ? '編輯 Project' : '新增 Project' }}</h2>
      <label>名稱<input v-model="form.name" /></label>
      <label>簡介<textarea v-model="form.summary" /></label>
      <label>負責人<input v-model="form.owner" /></label>
      <label>核心利益人<input v-model="form.stakeholder" /></label>
      <div class="actions">
        <button @click="emit('close')">取消</button>
        <button @click="submit">儲存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center;
}
.modal {
  background: #fff; padding: 24px; border-radius: 8px;
  display: flex; flex-direction: column; gap: 12px; min-width: 320px;
  font-family: system-ui, sans-serif;
}
label { display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
input, textarea { padding: 6px; border: 1px solid #ccc; border-radius: 4px; }
.actions { display: flex; justify-content: flex-end; gap: 8px; }
button { padding: 6px 16px; cursor: pointer; }
</style>
```

- [ ] **Step 2: 在 App.vue 接上 modal 與 useProjects**

Overwrite `src/App.vue`：
```vue
<script setup>
import { ref } from 'vue'
import { useProjects } from './composables/useProjects.js'
import ProjectModal from './components/ProjectModal.vue'

const { projects, addProject } = useProjects()

const modalOpen = ref(false)
const editing = ref(null)

function openAdd() {
  editing.value = null
  modalOpen.value = true
}

function handleSave(fields) {
  addProject(fields)
  modalOpen.value = false
}
</script>

<template>
  <header>
    <h1>Project Roadmap</h1>
    <button @click="openAdd">+ 新增 Project</button>
  </header>

  <ul>
    <li v-for="p in projects" :key="p.id">{{ p.name }} — {{ p.owner }}</li>
  </ul>

  <ProjectModal
    :open="modalOpen"
    :project="editing"
    @save="handleSave"
    @close="modalOpen = false"
  />
</template>

<style scoped>
header { display: flex; align-items: center; gap: 16px; font-family: system-ui, sans-serif; }
</style>
```

- [ ] **Step 3: 瀏覽器手動驗證**

Run: `npm run dev`（若沒開著）
操作與 Expected：
1. 點「+ 新增 Project」→ 跳出表單 modal
2. 名稱留空點「儲存」→ 沒反應（名稱必填）
3. 填「名稱=Alpha、負責人=Zack」→ 點「儲存」→ modal 關閉，清單出現「Alpha — Zack」
4. 重整瀏覽器 → 「Alpha — Zack」仍在（localStorage 生效）
5. 再新增一筆 → 清單兩筆

- [ ] **Step 4: Commit**

```bash
git add src/components/ProjectModal.vue src/App.vue
git commit -m "feat: add ProjectModal for creating projects"
```

---

### Task 5: Timeline 靜態甘特（12 月軸 + 依資料畫橫條）

**學什麼**：`v-for` 迴圈渲染、`:style` 動態綁定行內樣式（用 geometry 算出的 px）、CSS `position: absolute` 定位、`ref` + `onMounted` 量測 DOM 寬度。先不做拖曳，只把資料畫成靜態橫條。

**Files:**
- Create: `src/components/Timeline.vue`, `src/components/ProjectBar.vue`
- Modify: `src/App.vue`

**Interfaces:**
- Consumes: `MONTHS` from constants；`monthToPx`, `durationToPx` from geometry；`Project[]`
- Produces:
  - `Timeline` props: `projects: Project[]`；emits: `edit(project)`（雙擊橫條）、`remove(id)`
  - `ProjectBar` props: `project: Project`, `monthWidth: number`；emits: `edit`, `remove`
  - `Timeline` 對外用 `defineExpose({ trackEl, monthWidth })` 供後續拖曳 task 取得軌道量測（Task 7 會用）

- [ ] **Step 1: 建 ProjectBar.vue**

Create `src/components/ProjectBar.vue`：
```vue
<script setup>
import { computed } from 'vue'
import { monthToPx, durationToPx } from '../composables/geometry.js'

const props = defineProps({
  project: { type: Object, required: true },
  monthWidth: { type: Number, required: true },
})
const emit = defineEmits(['edit', 'remove'])

const style = computed(() => ({
  left: monthToPx(props.project.startMonth ?? 0, props.monthWidth) + 'px',
  width: durationToPx(props.project.duration, props.monthWidth) + 'px',
  top: (props.project.lane ?? 0) * 44 + 'px',
  background: props.project.color || '#4f7cff',
}))
</script>

<template>
  <div class="bar" :style="style" @dblclick="emit('edit', project)">
    <span class="label">{{ project.name }}</span>
    <button class="del" @click.stop="emit('remove', project.id)">✕</button>
  </div>
</template>

<style scoped>
.bar {
  position: absolute; height: 36px; border-radius: 6px;
  color: #fff; display: flex; align-items: center; padding: 0 8px;
  font: 13px system-ui, sans-serif; overflow: hidden; box-sizing: border-box;
  cursor: grab; user-select: none;
}
.label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.del { background: transparent; border: none; color: #fff; cursor: pointer; opacity: 0; }
.bar:hover .del { opacity: 1; }
</style>
```

- [ ] **Step 2: 建 Timeline.vue**

Create `src/components/Timeline.vue`：
```vue
<script setup>
import { ref, computed, onMounted } from 'vue'
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
```

- [ ] **Step 3: App.vue 接上 Timeline + 編輯/刪除**

Overwrite `src/App.vue`：
```vue
<script setup>
import { ref } from 'vue'
import { useProjects } from './composables/useProjects.js'
import ProjectModal from './components/ProjectModal.vue'
import Timeline from './components/Timeline.vue'

const { projects, addProject, updateProject, removeProject } = useProjects()

const modalOpen = ref(false)
const editing = ref(null)

function openAdd() {
  editing.value = null
  modalOpen.value = true
}
function openEdit(project) {
  editing.value = project
  modalOpen.value = true
}
function handleSave(fields) {
  if (editing.value) {
    updateProject(editing.value.id, fields)
  } else {
    // 新增後直接排到第一格方便看到（暫時；Task 7 改成拖曳排程）
    const p = addProject(fields)
    updateProject(p.id, { startMonth: 0, lane: nextFreeLane() })
  }
  modalOpen.value = false
}
function nextFreeLane() {
  const used = projects.value.filter((p) => p.lane !== null).map((p) => p.lane)
  let lane = 0
  while (used.includes(lane)) lane++
  return lane
}
</script>

<template>
  <header>
    <h1>Project Roadmap</h1>
    <button @click="openAdd">+ 新增 Project</button>
  </header>

  <Timeline
    :projects="projects"
    @edit="openEdit"
    @remove="removeProject"
  />

  <ProjectModal
    :open="modalOpen"
    :project="editing"
    @save="handleSave"
    @close="modalOpen = false"
  />
</template>

<style scoped>
header { display: flex; align-items: center; gap: 16px; font-family: system-ui, sans-serif; margin-bottom: 16px; }
</style>
```

- [ ] **Step 4: 瀏覽器手動驗證**

Run: `npm run dev`
操作與 Expected：
1. 看到 12 個月份表頭（Jan~Dec）與淡灰格線
2. 新增「Beta」→ 出現一條藍色橫條在最左（Jan），寬度 1 個月
3. 再新增「Gamma」→ 第二條橫條在下一列（lane 1）
4. hover 橫條 → 右側出現 ✕；點 ✕ → 橫條消失
5. 雙擊橫條 → 開編輯 modal、欄位帶入原值；改名存 → 橫條標題更新
6. 重整 → 橫條仍在

- [ ] **Step 5: Commit**

```bash
git add src/components/Timeline.vue src/components/ProjectBar.vue src/App.vue
git commit -m "feat: render scheduled projects as static gantt bars"
```

---

### Task 6: 拖移橫條改時間

**學什麼**：pointer 事件（`pointerdown/move/up`）、`setPointerCapture`（拖出元件外仍收得到事件）、拖曳狀態機（記起始滑鼠位置與起始值、算 delta）、VueUse `useEventListener`（自動在 unmount 時解除監聽，避免記憶體洩漏）。這是甘特互動精華。

**Files:**
- Create: `src/composables/useDragBar.js`
- Modify: `src/components/ProjectBar.vue`

**Interfaces:**
- Consumes: `pxToMonth`, `clampBar` from geometry；`useEventListener` from `@vueuse/core`
- Produces: `useDragBar({ project, monthWidth, trackLeft, onChange })`
  - 參數皆為 getter 函式或 ref（`monthWidth`/`trackLeft` 為 `() => number`）
  - 回傳 `{ onPointerdownMove }`：綁到橫條主體的 `pointerdown`
  - 拖曳中即時呼叫 `onChange({ startMonth })`

- [ ] **Step 1: 實作 useDragBar.js（移動模式）**

Create `src/composables/useDragBar.js`：
```js
import { ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { pxToMonth, clampBar } from './geometry.js'

// project: () => Project, monthWidth: () => number, trackLeft: () => number
// onChange: (patch) => void
export function useDragBar({ project, monthWidth, trackLeft, onChange }) {
  const dragging = ref(false)
  let grabOffsetMonths = 0  // 滑鼠抓在橫條內第幾個月，維持相對位置

  function onPointerdownMove(e) {
    e.preventDefault()
    dragging.value = true
    const p = project()
    const mouseMonth = pxToMonth(e.clientX, trackLeft(), monthWidth())
    grabOffsetMonths = mouseMonth - p.startMonth
    e.target.setPointerCapture?.(e.pointerId)
  }

  useEventListener(window, 'pointermove', (e) => {
    if (!dragging.value) return
    const p = project()
    const mouseMonth = pxToMonth(e.clientX, trackLeft(), monthWidth())
    const newStart = mouseMonth - grabOffsetMonths
    const clamped = clampBar(newStart, p.duration)
    onChange({ startMonth: clamped.startMonth })
  })

  useEventListener(window, 'pointerup', () => {
    dragging.value = false
  })

  return { onPointerdownMove, dragging }
}
```

- [ ] **Step 2: ProjectBar 接上拖曳**

Overwrite `src/components/ProjectBar.vue`：
```vue
<script setup>
import { computed } from 'vue'
import { monthToPx, durationToPx } from '../composables/geometry.js'
import { useDragBar } from '../composables/useDragBar.js'

const props = defineProps({
  project: { type: Object, required: true },
  monthWidth: { type: Number, required: true },
  trackLeft: { type: Number, required: true },
})
const emit = defineEmits(['edit', 'remove', 'update'])

const style = computed(() => ({
  left: monthToPx(props.project.startMonth ?? 0, props.monthWidth) + 'px',
  width: durationToPx(props.project.duration, props.monthWidth) + 'px',
  top: (props.project.lane ?? 0) * 44 + 'px',
  background: props.project.color || '#4f7cff',
}))

const { onPointerdownMove, dragging } = useDragBar({
  project: () => props.project,
  monthWidth: () => props.monthWidth,
  trackLeft: () => props.trackLeft,
  onChange: (patch) => emit('update', props.project.id, patch),
})
</script>

<template>
  <div
    class="bar"
    :class="{ dragging }"
    :style="style"
    @pointerdown="onPointerdownMove"
    @dblclick="emit('edit', project)"
  >
    <span class="label">{{ project.name }}</span>
    <button class="del" @click.stop="emit('remove', project.id)" @pointerdown.stop>✕</button>
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
.label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.del { background: transparent; border: none; color: #fff; cursor: pointer; opacity: 0; }
.bar:hover .del { opacity: 1; }
</style>
```

- [ ] **Step 3: Timeline 傳 trackLeft、轉發 update**

在 `src/components/Timeline.vue` 修改：

a) `<script setup>` 內，`monthWidth` 之後加軌道左緣量測：
```js
import { useElementBounding } from '@vueuse/core'
// ...existing...
const { left: trackLeft } = useElementBounding(trackEl)
```
並在 emits 加 `'update'`：`const emit = defineEmits(['edit', 'remove', 'update'])`

b) template 的 `<ProjectBar>` 加 `:track-left` 與 `@update`：
```vue
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
```

- [ ] **Step 4: App.vue 接 update → updateProject**

在 `src/App.vue` 的 `<Timeline>` 加 `@update`：
```vue
<Timeline
  :projects="projects"
  @edit="openEdit"
  @remove="removeProject"
  @update="updateProject"
/>
```

- [ ] **Step 5: 瀏覽器手動驗證**

Run: `npm run dev`
操作與 Expected：
1. 新增兩三個 project
2. 按住一條橫條左右拖 → 橫條跟著滑鼠移動，放開時吸附到整月位置
3. 拖到最左超出 → 停在 Jan（不跑出左邊）
4. 拖到最右超出 → 停在最後可容納位置（不跑出右邊）
5. 放開後重整 → 橫條停在新位置（已存 localStorage）
6. 點 ✕ 仍能刪除、雙擊仍能編輯（拖曳沒吃掉這些）

- [ ] **Step 6: Commit**

```bash
git add src/composables/useDragBar.js src/components/ProjectBar.vue src/components/Timeline.vue src/App.vue
git commit -m "feat: drag gantt bar to change start month"
```

---

### Task 7: 兩端拉伸改長度

**學什麼**：同一元件多種拖曳模式（移動 vs 左拉 vs 右拉）用 mode 參數區分、event delegation 到不同 handle、重用既有 geometry。強化拖曳狀態機理解。

**Files:**
- Modify: `src/composables/useDragBar.js`, `src/components/ProjectBar.vue`

**Interfaces:**
- Produces: `useDragBar` 新增回傳 `onPointerdownResizeLeft`, `onPointerdownResizeRight`；沿用同一 `onChange`，可帶 `{ startMonth, duration }`

- [ ] **Step 1: useDragBar 加左右拉伸**

Overwrite `src/composables/useDragBar.js`：
```js
import { ref } from 'vue'
import { useEventListener } from '@vueuse/core'
import { pxToMonth, clampBar } from './geometry.js'

export function useDragBar({ project, monthWidth, trackLeft, onChange }) {
  const dragging = ref(false)
  let mode = null            // 'move' | 'left' | 'right'
  let grabOffsetMonths = 0
  let startSnapshot = null   // { startMonth, duration } 拖曳起始快照

  function begin(m, e) {
    e.preventDefault()
    e.stopPropagation()
    dragging.value = true
    mode = m
    const p = project()
    startSnapshot = { startMonth: p.startMonth, duration: p.duration }
    const mouseMonth = pxToMonth(e.clientX, trackLeft(), monthWidth())
    grabOffsetMonths = mouseMonth - p.startMonth
    e.target.setPointerCapture?.(e.pointerId)
  }

  const onPointerdownMove = (e) => begin('move', e)
  const onPointerdownResizeLeft = (e) => begin('left', e)
  const onPointerdownResizeRight = (e) => begin('right', e)

  useEventListener(window, 'pointermove', (e) => {
    if (!dragging.value) return
    const mouseMonth = pxToMonth(e.clientX, trackLeft(), monthWidth())
    const snap = startSnapshot

    if (mode === 'move') {
      const clamped = clampBar(mouseMonth - grabOffsetMonths, snap.duration)
      onChange({ startMonth: clamped.startMonth })
    } else if (mode === 'right') {
      // 右緣跟滑鼠：duration = 滑鼠月 - 起始月 + 1
      const duration = mouseMonth - snap.startMonth + 1
      const clamped = clampBar(snap.startMonth, duration)
      onChange({ startMonth: clamped.startMonth, duration: clamped.duration })
    } else if (mode === 'left') {
      // 左緣跟滑鼠：右緣（end）固定，start 變、duration 反向變
      const end = snap.startMonth + snap.duration  // exclusive
      const newStart = Math.min(mouseMonth, end - 1)
      const clamped = clampBar(newStart, end - newStart)
      onChange({ startMonth: clamped.startMonth, duration: clamped.duration })
    }
  })

  useEventListener(window, 'pointerup', () => {
    dragging.value = false
    mode = null
  })

  return {
    onPointerdownMove,
    onPointerdownResizeLeft,
    onPointerdownResizeRight,
    dragging,
  }
}
```

- [ ] **Step 2: ProjectBar 加左右 handle**

在 `src/components/ProjectBar.vue`：

a) `<script setup>` 解構加兩個 handler：
```js
const { onPointerdownMove, onPointerdownResizeLeft, onPointerdownResizeRight, dragging } = useDragBar({
  project: () => props.project,
  monthWidth: () => props.monthWidth,
  trackLeft: () => props.trackLeft,
  onChange: (patch) => emit('update', props.project.id, patch),
})
```

b) template 在 `.bar` 內、`.label` 前後加兩個 handle：
```vue
<template>
  <div
    class="bar"
    :class="{ dragging }"
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
```

c) style 加 handle 樣式：
```css
.handle {
  position: absolute; top: 0; bottom: 0; width: 8px;
  cursor: ew-resize; z-index: 2;
}
.handle.left { left: 0; }
.handle.right { right: 0; }
```

- [ ] **Step 3: 瀏覽器手動驗證**

Run: `npm run dev`
操作與 Expected：
1. 橫條左右邊緣游標變雙箭頭（ew-resize）
2. 拖右邊緣往右 → 橫條變長（duration 增），吸附整月
3. 拖右邊緣往左到最小 → 停在 1 個月（不會消失或變負）
4. 拖左邊緣往左 → 橫條往左長、右緣不動
5. 拖左邊緣往右到最小 → 停在 1 個月
6. 中間拖曳仍是整條移動（沒被 handle 干擾）
7. 重整 → 新長度保留

- [ ] **Step 4: Commit**

```bash
git add src/composables/useDragBar.js src/components/ProjectBar.vue
git commit -m "feat: resize gantt bar from either edge to change duration"
```

---

### Task 8: 未排程清單 + 拖進 timeline 排程

**學什麼**：HTML5 原生 drag-and-drop（`draggable`、`dragstart`、`drop`、`dataTransfer`）— 適合「從 A 拖到 B」的跨區塊丟放（與 Task 6 的 pointer 拖曳互補：pointer 適合連續拖動、HTML5 DnD 適合丟放）。計算 drop 位置對應的月與 lane。

**Files:**
- Create: `src/components/ProjectList.vue`
- Modify: `src/App.vue`, `src/components/Timeline.vue`

**Interfaces:**
- Consumes: `pxToMonth` from geometry
- Produces:
  - `ProjectList` props: `projects: Project[]`（只顯示 `startMonth===null` 者）；emits: `edit(project)`, `remove(id)`；每項 `draggable`，`dragstart` 時把 `project.id` 塞進 `dataTransfer`
  - `Timeline` 新增 emits: `schedule(id, { startMonth, lane })`（drop 時算出）

- [ ] **Step 1: 建 ProjectList.vue**

Create `src/components/ProjectList.vue`：
```vue
<script setup>
import { computed } from 'vue'

const props = defineProps({
  projects: { type: Array, required: true },
})
const emit = defineEmits(['edit', 'remove'])

const unscheduled = computed(() =>
  props.projects.filter((p) => p.startMonth === null)
)

function onDragStart(e, id) {
  e.dataTransfer.setData('text/plain', id)
  e.dataTransfer.effectAllowed = 'move'
}
</script>

<template>
  <aside class="list">
    <h3>未排程</h3>
    <p v-if="unscheduled.length === 0" class="empty">全部已排程</p>
    <div
      v-for="p in unscheduled"
      :key="p.id"
      class="item"
      draggable="true"
      @dragstart="onDragStart($event, p.id)"
      @dblclick="emit('edit', p)"
    >
      <span>{{ p.name }}</span>
      <button @click.stop="emit('remove', p.id)">✕</button>
    </div>
  </aside>
</template>

<style scoped>
.list { width: 200px; font-family: system-ui, sans-serif; border-right: 1px solid #e5e5e5; padding-right: 12px; }
h3 { font-size: 14px; margin: 0 0 8px; }
.empty { color: #999; font-size: 13px; }
.item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px; margin-bottom: 6px; background: #eef2ff; border-radius: 6px;
  cursor: grab; font-size: 14px;
}
.item button { border: none; background: transparent; cursor: pointer; }
</style>
```

- [ ] **Step 2: Timeline 加 drop 接收**

在 `src/components/Timeline.vue`：

a) emits 加 `'schedule'`：`const emit = defineEmits(['edit', 'remove', 'update', 'schedule'])`

b) `<script setup>` 加 drop handler（用既有 `trackLeft`、`monthWidth`、`laneCount`）：
```js
import { pxToMonth } from '../composables/geometry.js'

function onDrop(e) {
  const id = e.dataTransfer.getData('text/plain')
  if (!id) return
  const startMonth = pxToMonth(e.clientX, trackLeft.value, monthWidth.value)
  // 用滑鼠 y 相對 track 頂端算 lane（每列 44px）
  const rect = trackEl.value.getBoundingClientRect()
  const lane = Math.max(0, Math.floor((e.clientY - rect.top) / 44))
  emit('schedule', id, { startMonth, lane })
}
```

c) `.track` div 加 `@dragover.prevent` 與 `@drop`：
```vue
<div
  ref="trackEl"
  class="track"
  :style="{ height: laneCount * 44 + 8 + 'px' }"
  @dragover.prevent
  @drop="onDrop"
>
```
（`@dragover.prevent` 必要 — 不 preventDefault 瀏覽器不允許 drop）

- [ ] **Step 3: App.vue 組裝 ProjectList + schedule 處理**

Overwrite `src/App.vue`：
```vue
<script setup>
import { ref } from 'vue'
import { useProjects } from './composables/useProjects.js'
import ProjectModal from './components/ProjectModal.vue'
import Timeline from './components/Timeline.vue'
import ProjectList from './components/ProjectList.vue'

const { projects, addProject, updateProject, removeProject } = useProjects()

const modalOpen = ref(false)
const editing = ref(null)

function openAdd() {
  editing.value = null
  modalOpen.value = true
}
function openEdit(project) {
  editing.value = project
  modalOpen.value = true
}
function handleSave(fields) {
  if (editing.value) {
    updateProject(editing.value.id, fields)
  } else {
    addProject(fields)  // 新增後留在「未排程」，等使用者拖進 timeline
  }
  modalOpen.value = false
}
function schedule(id, patch) {
  updateProject(id, patch)
}
</script>

<template>
  <header>
    <h1>Project Roadmap</h1>
    <button @click="openAdd">+ 新增 Project</button>
  </header>

  <div class="layout">
    <ProjectList
      :projects="projects"
      @edit="openEdit"
      @remove="removeProject"
    />
    <Timeline
      :projects="projects"
      @edit="openEdit"
      @remove="removeProject"
      @update="updateProject"
      @schedule="schedule"
    />
  </div>

  <ProjectModal
    :open="modalOpen"
    :project="editing"
    @save="handleSave"
    @close="modalOpen = false"
  />
</template>

<style scoped>
header { display: flex; align-items: center; gap: 16px; font-family: system-ui, sans-serif; margin-bottom: 16px; }
.layout { display: flex; gap: 16px; }
.layout > :last-child { flex: 1; }
</style>
```

- [ ] **Step 4: 瀏覽器手動驗證**

Run: `npm run dev`
操作與 Expected：
1. 新增一個 project → 出現在左側「未排程」清單，timeline 上還沒有橫條
2. 從清單把該項拖到 timeline 的某月某列 → 放開後變成橫條，落在對應月份與列；清單中該項消失
3. 拖到 Mar 附近 → 橫條起點在 Mar
4. 已排程的橫條仍可拖移、拉伸、刪除、編輯
5. 刪除橫條後該 project 消失（不回到未排程 — removeProject 是整筆刪）
6. 重整 → 狀態保留

- [ ] **Step 5: Commit**

```bash
git add src/components/ProjectList.vue src/components/Timeline.vue src/App.vue
git commit -m "feat: drag unscheduled projects from list onto timeline"
```

---

### Task 9: JSON 匯入/匯出

**學什麼**：`Blob` + `URL.createObjectURL` + 動態 `<a download>` 觸發下載（純前端存檔）、`<input type=file>` + `FileReader` 讀檔、JSON 序列化/反序列化。純本地端「帶著走」的關鍵。

**Files:**
- Modify: `src/composables/useProjects.js`, `src/App.vue`
- Create: `src/components/Toolbar.vue`

**Interfaces:**
- Consumes: `useProjects` 的 `toArray`, `loadFromArray`
- Produces:
  - `useProjects` 新增 `exportJSON()`（觸發下載 `roadmap.json`）、`importJSON(file)`（讀檔取代，回傳 Promise）
  - `Toolbar` props: 無；emits: `add`, `export`, `import`（`import` payload 為 `File`）

- [ ] **Step 1: useProjects 加匯入匯出**

在 `src/composables/useProjects.js` 的 `return` 前加兩個函式，並加進回傳物件：
```js
  function exportJSON() {
    const data = JSON.stringify(toArray(), null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'roadmap.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function importJSON(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const arr = JSON.parse(reader.result)
          if (!Array.isArray(arr)) throw new Error('格式錯誤：不是陣列')
          loadFromArray(arr)
          resolve(arr.length)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })
  }
```
回傳物件改為：
```js
  return {
    projects, addProject, updateProject, removeProject,
    loadFromArray, toArray, exportJSON, importJSON,
  }
```

- [ ] **Step 2: 建 Toolbar.vue**

Create `src/components/Toolbar.vue`：
```vue
<script setup>
import { ref } from 'vue'

const emit = defineEmits(['add', 'export', 'import'])
const fileInput = ref(null)

function pickFile() {
  fileInput.value.click()
}
function onFile(e) {
  const file = e.target.files[0]
  if (file) emit('import', file)
  e.target.value = ''  // 清空才能重選同一檔
}
</script>

<template>
  <div class="toolbar">
    <button @click="emit('add')">+ 新增 Project</button>
    <button @click="emit('export')">匯出 JSON</button>
    <button @click="pickFile">匯入 JSON</button>
    <input
      ref="fileInput"
      type="file"
      accept="application/json,.json"
      hidden
      @change="onFile"
    />
  </div>
</template>

<style scoped>
.toolbar { display: flex; gap: 8px; font-family: system-ui, sans-serif; }
button { padding: 6px 14px; cursor: pointer; }
</style>
```

- [ ] **Step 3: App.vue 換上 Toolbar 並接匯入匯出**

在 `src/App.vue`：

a) `<script setup>` 解構加 `exportJSON, importJSON`：
```js
const { projects, addProject, updateProject, removeProject, exportJSON, importJSON } = useProjects()
```

b) 加匯入處理：
```js
async function handleImport(file) {
  try {
    const count = await importJSON(file)
    alert(`匯入成功：${count} 筆`)
  } catch (err) {
    alert(`匯入失敗：${err.message}`)
  }
}
```
（注意：`alert` 為簡易回饋，本專案為單機工具可接受）

c) template 把 header 裡的按鈕換成 `<Toolbar>`：
```vue
<header>
  <h1>Project Roadmap</h1>
  <Toolbar
    @add="openAdd"
    @export="exportJSON"
    @import="handleImport"
  />
</header>
```
並在 import 區加 `import Toolbar from './components/Toolbar.vue'`。

- [ ] **Step 4: 瀏覽器手動驗證**

Run: `npm run dev`
操作與 Expected：
1. 建立 2~3 個 project 並排程
2. 點「匯出 JSON」→ 瀏覽器下載 `roadmap.json`；打開檔案看到含全部 project 的漂亮縮排 JSON
3. 開發者工具 Application → Local Storage 手動清空（或換個瀏覽器），重整 → 畫面空
4. 點「匯入 JSON」→ 選剛下載的 `roadmap.json` → alert「匯入成功：N 筆」→ 橫條/清單回來
5. 匯入一個亂寫的 `.txt` → alert「匯入失敗：…」，畫面不崩

- [ ] **Step 5: Commit**

```bash
git add src/composables/useProjects.js src/components/Toolbar.vue src/App.vue
git commit -m "feat: JSON import/export for portable roadmap data"
```

---

## 完成後

MVP 八大功能齊：CRUD、localStorage 持久化、甘特渲染、拖移改時間、拉伸改長度、清單拖入排程、JSON 匯入匯出。

**後續擴充（YAGNI，之後想要再開新 plan）**：跨年捲動、週/季縮放、橫條相依箭頭、undo/redo、拖曳動畫、橫條顏色選擇器、重疊 lane 自動避讓。

**驗證全綠**：`npm test`（geometry + useProjects 單測）應全過；八個 task 的瀏覽器手動驗證逐項通過。
