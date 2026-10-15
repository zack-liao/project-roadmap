<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useProjects } from './composables/useProjects.js'
import { useAuth } from './composables/useAuth.js'
import { createApiClient } from './api.js'
import { createImageCache } from './composables/useImageCache.js'
import ProjectModal from './components/ProjectModal.vue'
import Timeline from './components/Timeline.vue'
import ProjectList from './components/ProjectList.vue'
import Toolbar from './components/Toolbar.vue'
import DetailPanel from './components/DetailPanel.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'
import CategoryModal from './components/CategoryModal.vue'
import ToastStack from './components/ToastStack.vue'

// Client ID 由 vite.config 的 define 在組建時填入,沒有它就無法登入
const auth = useAuth(__GOOGLE_CLIENT_ID__)

const api = createApiClient({
  getToken: auth.getToken,
  // 401 = 通行證過期或無效,不是單一筆寫入失敗,要請使用者重新登入
  onUnauthorized: (message) => {
    auth.signOut(message)
    store.reset()
  },
})

const store = useProjects(api)
const imageCache = createImageCache(api)
const {
  projects, addProject, updateProject, removeProject,
  categories, addCategory, updateCategory, removeCategory, moveCategory,
  exportJSON, importJSON, syncError,
  legacy, migrateLegacy, dismissLegacy,
} = store

const signInEl = ref(null)

// 登入後才去讀資料;登出就把畫面清掉
watch(auth.signedIn, (yes) => {
  if (yes) {
    store.start()
  } else {
    store.reset()
    // 不把上一個人的圖留在記憶體裡
    imageCache.clear()
  }
}, { immediate: true })

// 登出後登入畫面是重新建立的,按鈕要再畫一次。
// 首次載入交給 onMounted,這裡刻意不用 immediate,免得同一次載入掛兩遍。
watch(auth.signedIn, (yes) => {
  if (!yes) nextTick(() => auth.mountButton(signInEl.value))
})

onMounted(() => {
  if (!auth.signedIn.value) auth.mountButton(signInEl.value)
})

watch(auth.authError, (message) => {
  if (message) toast('error', message)
})

const modalOpen = ref(false)
const editing = ref(null)
const selectedId = ref(null)

const selectedProject = computed(() =>
  projects.value.find((p) => p.id === selectedId.value) || null
)

const toasts = ref([])
let toastSeq = 0
function toast(type, text) {
  const id = ++toastSeq
  toasts.value.push({ id, type, text })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 3200)
}

// 與 Worker 同步失敗時 useProjects 已經把畫面校正回伺服器狀態,這裡只負責告知
watch(syncError, (message) => {
  if (message) toast('error', message)
})

function openAdd() {
  editing.value = null
  modalOpen.value = true
}
function openEdit(project) {
  editing.value = project
  modalOpen.value = true
}
async function handleSave(fields) {
  const { imageFile, ...rest } = fields

  // 圖片在這裡才上傳。取消編輯不會送出任何東西,也就不會在 R2 留下沒人引用的檔案。
  if (imageFile) {
    try {
      const { key } = await api.uploadImage(imageFile)
      rest.imageKey = key
    } catch (err) {
      toast('error', `圖片上傳失敗：${err.message}`)
      return
    }
  }

  if (editing.value) {
    updateProject(editing.value.id, rest)
    toast('success', '已更新')
  } else {
    addProject(rest)  // 新增後留在「未排程」，等使用者拖進 timeline
    toast('success', '已新增，拖曳卡片到時間軸排程')
  }
  modalOpen.value = false
}
function schedule(id, patch) {
  updateProject(id, patch)
}
const removeTarget = ref(null)  // 待確認刪除的 project

// 類別管理：catModalOpen 開表單（editingCategory null = 新增），刪除走確認框
const catModalOpen = ref(false)
const editingCategory = ref(null)
const removeCategoryTarget = ref(null)

function openAddCategory() {
  editingCategory.value = null
  catModalOpen.value = true
}
function openEditCategory(category) {
  editingCategory.value = category
  catModalOpen.value = true
}
function handleCategorySave(fields) {
  if (editingCategory.value) {
    updateCategory(editingCategory.value.id, fields)
    toast('success', '類別已更新')
  } else {
    addCategory(fields)
    toast('success', '類別已新增')
  }
  catModalOpen.value = false
}
function handleCategoryRemoveRequest(category) {
  catModalOpen.value = false
  removeCategoryTarget.value = category
}
function confirmCategoryRemove() {
  const target = removeCategoryTarget.value
  if (!target) return
  removeCategory(target.id)
  removeCategoryTarget.value = null
  toast('success', '類別已刪除，原專案移到未分類')
}

function handleRemove(id) {
  removeTarget.value = projects.value.find((p) => p.id === id) || null
}
function confirmRemove() {
  const target = removeTarget.value
  if (!target) return
  removeProject(target.id)
  if (selectedId.value === target.id) selectedId.value = null
  removeTarget.value = null
  toast('success', '已刪除')
}
async function handleMigrateLegacy() {
  try {
    const count = await migrateLegacy()
    toast('success', `已搬移 ${count} 筆舊資料到資料庫`)
  } catch (err) {
    toast('error', `搬移失敗：${err.message}`)
  }
}

function handleExport() {
  exportJSON()
  toast('success', '已匯出 JSON')
}
async function handleImport(file) {
  try {
    const count = await importJSON(file)
    toast('success', `匯入成功：${count} 筆`)
  } catch (err) {
    toast('error', `匯入失敗：${err.message}`)
  }
}
</script>

<template>
  <div v-if="!auth.signedIn.value" class="signin">
    <div class="signin-card">
      <span class="mark" aria-hidden="true" />
      <h1>Roadmap</h1>
      <p class="signin-hint">請用 @hexschool.com 的公司帳號登入</p>
      <!-- GIS 的按鈕由 renderButton 畫進這個容器 -->
      <div ref="signInEl" class="signin-button" />
      <p v-if="auth.authError.value" class="signin-error">{{ auth.authError.value }}</p>
    </div>
  </div>

  <div v-else class="app">
    <header class="topbar">
      <div class="brand">
        <span class="mark" aria-hidden="true" />
        <h1>Roadmap</h1>
        <span class="tally">{{ projects.length }} projects</span>
      </div>
      <div class="topbar-right">
        <Toolbar
          @add="openAdd"
          @export="handleExport"
          @import="handleImport"
        />
        <div class="account">
          <img
            v-if="auth.user.value?.picture"
            class="avatar"
            :src="auth.user.value.picture"
            :alt="auth.user.value.name"
            referrerpolicy="no-referrer"
          />
          <span class="account-name" :title="auth.user.value?.email">{{ auth.user.value?.name }}</span>
          <button class="signout" @click="auth.signOut()">登出</button>
        </div>
      </div>
    </header>

    <!-- 搬家前的資料還留在這台瀏覽器裡。只在資料庫是空的時候出現,搬完就不再出現。 -->
    <div v-if="legacy" class="legacy-banner">
      <span class="legacy-text">
        偵測到這個瀏覽器裡還有舊的 roadmap（{{ legacy.projects.length }} 個 project、{{ legacy.categories.length }} 個類別），要搬進資料庫嗎？
      </span>
      <div class="legacy-actions">
        <button class="legacy-primary" @click="handleMigrateLegacy">搬進資料庫</button>
        <button class="legacy-ghost" @click="dismissLegacy">先不要</button>
      </div>
    </div>

    <div class="body">
      <ProjectList
        :projects="projects"
        @add="openAdd"
        @edit="openEdit"
        @remove="handleRemove"
      />
      <main class="main">
        <Timeline
          class="timeline-fill"
          :projects="projects"
          :categories="categories"
          :selected-id="selectedId"
          @add-category="openAddCategory"
          @edit-category="openEditCategory"
          @edit="openEdit"
          @remove="handleRemove"
          @update="updateProject"
          @schedule="schedule"
          @select="selectedId = $event"
          @reorder-category="moveCategory"
        />
        <DetailPanel
          :project="selectedProject"
          :image-cache="imageCache"
          @edit="openEdit"
          @remove="handleRemove"
          @close="selectedId = null"
        />
      </main>
    </div>
  </div>

  <ProjectModal
    :open="modalOpen"
    :project="editing"
    :image-cache="imageCache"
    @save="handleSave"
    @close="modalOpen = false"
  />
  <CategoryModal
    :open="catModalOpen"
    :category="editingCategory"
    @save="handleCategorySave"
    @remove="handleCategoryRemoveRequest"
    @close="catModalOpen = false"
  />
  <ConfirmDialog
    :open="removeCategoryTarget !== null"
    title="刪除類別"
    :message="removeCategoryTarget ? `確定要刪除類別「${removeCategoryTarget.name}」？其中的專案會移到未分類。` : ''"
    @confirm="confirmCategoryRemove"
    @close="removeCategoryTarget = null"
  />
  <ConfirmDialog
    :open="removeTarget !== null"
    title="刪除 Project"
    :message="removeTarget ? `確定要刪除「${removeTarget.name}」？此動作無法復原。` : ''"
    @confirm="confirmRemove"
    @close="removeTarget = null"
  />
  <ToastStack :toasts="toasts" />
</template>

<style scoped>
.app {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.topbar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: var(--sp-3) var(--sp-5);
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
.brand { display: flex; align-items: baseline; gap: var(--sp-3); }
.mark {
  align-self: center;
  width: 12px; height: 12px; border-radius: 3px;
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent-soft), 0 0 0 4px var(--accent-soft);
}
.topbar h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  letter-spacing: .01em;
}
.tally {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--faint);
  letter-spacing: .03em;
}
.signin {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-5);
}
.signin-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-6, 32px) var(--sp-5);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
}
.signin-card h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
}
.signin-hint { margin: 0; font-size: 13px; color: var(--faint); }
.signin-button { min-height: 40px; }
.signin-error { margin: 0; font-size: 12px; color: var(--danger, #e5484d); max-width: 280px; text-align: center; }

.topbar-right { display: flex; align-items: center; gap: var(--sp-4); }
.account { display: flex; align-items: center; gap: var(--sp-2); }
.avatar {
  width: 26px; height: 26px;
  border-radius: 50%;
  border: 1px solid var(--border);
}
.account-name {
  font-size: 12px;
  color: var(--faint);
  max-width: 140px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.signout {
  padding: var(--sp-1, 4px) var(--sp-2);
  font-size: 12px;
  color: var(--faint);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
}
.signout:hover { color: var(--text); }

.legacy-banner {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: var(--sp-3) var(--sp-5);
  background: var(--accent-soft);
  border-bottom: 1px solid var(--border);
}
.legacy-text { font-size: 13px; }
.legacy-actions { display: flex; gap: var(--sp-2); flex: none; }
.legacy-banner button {
  padding: var(--sp-2) var(--sp-3);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid var(--border);
}
.legacy-primary { background: var(--accent); color: #fff; border-color: transparent; }
.legacy-ghost { background: transparent; color: var(--faint); }
.body {
  flex: 1;
  min-height: 0;              /* 讓內部 pane 能各自捲動 */
  display: flex;
}
.main {
  flex: 1;
  min-width: 0;              /* 允許 timeline 橫向捲動不撐破版面 */
  padding: var(--sp-5);
  display: flex; flex-direction: column;
  overflow: hidden;          /* 高度交給 timeline 內部捲動 */
  position: relative;        /* 詳情卡浮動定位基準 */
}
.timeline-fill { flex: 1; min-height: 0; }
/* 詳情卡改浮動 overlay：時間軸滿高，卡片永遠看得到 */
.main > :deep(.detail) {
  position: absolute;
  right: var(--sp-5); bottom: var(--sp-5);
  width: 380px; max-width: calc(100% - 2 * var(--sp-5));
  max-height: 55%;
  overflow: auto;
  margin: 0;
  box-shadow: var(--shadow-lg);
  z-index: 20;
}
</style>
