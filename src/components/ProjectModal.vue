<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import AppIcon from './AppIcon.vue'
import { useImageSrc } from '../composables/useImageCache.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  project: { type: Object, default: null },
  imageCache: { type: Object, required: true },
})
const emit = defineEmits(['save', 'close'])

// 與 Worker 的限制保持一致。前端先擋是為了立刻給回饋,真正的把關仍在後端。
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

const empty = () => ({ name: '', summary: '', owner: '', stakeholder: '', imageKey: null })

const form = ref(empty())
const nameInput = ref(null)
const fileInput = ref(null)

// 剛選、還沒上傳的檔案。上傳時機在儲存,所以取消編輯不會留下孤兒圖片。
const pickedFile = ref(null)
const localPreview = ref(null)
const imageError = ref(null)

// 編輯既有專案時把已存的封面抓回來顯示
const stored = useImageSrc(props.imageCache, () => form.value.imageKey)

const previewSrc = computed(() => localPreview.value ?? stored.src.value)
const hasImage = computed(() => Boolean(previewSrc.value))

function setLocalPreview(file) {
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)
  localPreview.value = file ? URL.createObjectURL(file) : null
}

function pickImage(event) {
  const file = event.target.files?.[0]
  if (!file) return

  imageError.value = null
  if (!ACCEPTED_TYPES.includes(file.type)) {
    imageError.value = '只支援 PNG / JPEG / WebP / GIF'
  } else if (file.size > MAX_IMAGE_BYTES) {
    imageError.value = '圖片不能超過 5 MB'
  }

  if (imageError.value) {
    event.target.value = ''
    return
  }

  pickedFile.value = file
  setLocalPreview(file)
}

function removeImage() {
  pickedFile.value = null
  setLocalPreview(null)
  form.value.imageKey = null
  imageError.value = null
  if (fileInput.value) fileInput.value.value = ''
}

// 每次開啟時，用傳入的 project 填表（編輯）或清空（新增），並聚焦名稱欄
watch(() => props.open, async (isOpen) => {
  if (isOpen) {
    form.value = props.project
      ? {
          name: props.project.name,
          summary: props.project.summary,
          owner: props.project.owner,
          stakeholder: props.project.stakeholder,
          imageKey: props.project.imageKey ?? null,
        }
      : empty()
    pickedFile.value = null
    setLocalPreview(null)
    imageError.value = null
    if (fileInput.value) fileInput.value.value = ''
    await nextTick()
    nameInput.value?.focus()
  }
})

onUnmounted(() => setLocalPreview(null))

function submit() {
  if (!form.value.name.trim()) return  // 名稱必填
  // imageFile 交給上層上傳 —— 拿到 key 之後才會跟著專案一起寫進資料庫
  emit('save', { ...form.value, imageFile: pickedFile.value })
}
</script>

<template>
  <Transition name="modal">
    <div
      v-if="open"
      class="backdrop"
      @click.self="emit('close')"
      @keydown.esc="emit('close')"
    >
      <dialog class="modal" open>
        <div class="modal-head">
          <h2>{{ project ? '編輯 Project' : '新增 Project' }}</h2>
          <button class="close" title="關閉" aria-label="關閉" @click="emit('close')">
            <AppIcon name="x" :size="15" />
          </button>
        </div>

        <form @submit.prevent="submit">
          <label>
            <span>名稱 <em class="req" title="必填">*</em></span>
            <input ref="nameInput" v-model="form.name" required />
          </label>
          <label>
            <span>簡介</span>
            <textarea v-model="form.summary" />
          </label>
          <label>
            <span>負責人</span>
            <input v-model="form.owner" />
          </label>
          <label>
            <span>核心利益人</span>
            <input v-model="form.stakeholder" />
          </label>

          <div class="field">
            <span class="field-label">封面圖</span>
            <div v-if="hasImage" class="image-preview">
              <img :src="previewSrc" alt="封面預覽" />
              <button type="button" class="image-remove" title="移除圖片" @click="removeImage">
                <AppIcon name="x" :size="13" />
              </button>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              @change="pickImage"
            />
            <p v-if="imageError" class="image-error">{{ imageError }}</p>
            <p v-else class="image-hint">PNG / JPEG / WebP / GIF，最大 5 MB</p>
          </div>

          <div class="actions">
            <button type="button" class="ghost" @click="emit('close')">取消</button>
            <button type="submit" class="primary" :disabled="!form.name.trim()">儲存</button>
          </div>
        </form>
      </dialog>
    </div>
  </Transition>
</template>

<style scoped>
.backdrop {
  position: fixed; inset: 0;
  background: rgba(2, 6, 23, .66);
  backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center;
  padding: var(--sp-4);
  z-index: 40;
}
.modal {
  position: static; margin: 0;
  background: var(--surface); color: var(--text);
  padding: var(--sp-5); border-radius: var(--radius);
  border: 1px solid var(--border-strong); box-shadow: var(--shadow-lg);
  width: 380px; max-width: 100%;
  font-family: var(--font-ui);
}

.modal-enter-active, .modal-leave-active { transition: opacity var(--dur) var(--ease); }
.modal-enter-active .modal, .modal-leave-active .modal { transition: transform var(--dur) var(--ease); }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: translateY(8px) scale(.98); }

.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--sp-4);
}
.modal h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 16px; font-weight: 600;
}
.close {
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: var(--radius-xs);
  background: transparent; color: var(--muted); cursor: pointer;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
}
.close:hover { background: var(--surface-2); color: var(--text); }

form { display: flex; flex-direction: column; gap: var(--sp-3); }
label { display: flex; flex-direction: column; gap: var(--sp-1); font-size: 13px; color: var(--muted); }
.req { font-style: normal; color: var(--danger); }
input, textarea {
  padding: var(--sp-2) var(--sp-3); font: inherit; color: var(--text);
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  transition: border-color var(--dur) var(--ease);
}
input:hover, textarea:hover { border-color: var(--border-strong); }
input:focus, textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
textarea { min-height: 72px; resize: vertical; }

.field { display: flex; flex-direction: column; gap: var(--sp-1); font-size: 13px; color: var(--muted); }
.field-label { font-size: 13px; color: var(--muted); }
.image-preview { position: relative; align-self: flex-start; margin-bottom: var(--sp-1); }
.image-preview img {
  display: block;
  max-width: 100%; max-height: 140px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
.image-remove {
  position: absolute; top: 4px; right: 4px;
  width: 22px; height: 22px;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; border-radius: 50%;
  background: rgba(2, 6, 23, .72); color: #fff;
  cursor: pointer;
}
.image-remove:hover { background: rgba(2, 6, 23, .9); }
input[type="file"] { padding: var(--sp-2); font-size: 12px; }
.image-hint { margin: 0; font-size: 11px; color: var(--faint); }
.image-error { margin: 0; font-size: 11px; color: var(--danger); }

.actions { display: flex; justify-content: flex-end; gap: var(--sp-2); margin-top: var(--sp-2); }
.actions button {
  padding: var(--sp-2) var(--sp-4); font: inherit; font-size: 13px; font-weight: 550;
  border-radius: var(--radius-sm); cursor: pointer;
  transition: background var(--dur) var(--ease), color var(--dur) var(--ease);
}
.ghost {
  border: 1px solid var(--border-strong);
  background: transparent; color: var(--muted);
}
.ghost:hover { background: var(--surface-2); color: var(--text); }
.primary {
  border: 1px solid var(--accent-strong);
  background: var(--accent); color: var(--accent-ink); font-weight: 600;
}
.primary:hover:not(:disabled) { background: var(--accent-strong); }
.primary:disabled { opacity: .45; cursor: not-allowed; }
</style>
