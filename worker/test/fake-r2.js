// 測試用的 R2 替身。只實作 Worker 會用到的 put / get / delete。
export function createFakeR2() {
  const store = new Map()

  return {
    async put(key, value, options = {}) {
      store.set(key, {
        bytes: new Uint8Array(value),
        httpMetadata: options.httpMetadata,
        customMetadata: options.customMetadata,
      })
      return { key }
    },

    async get(key) {
      const object = store.get(key)
      if (!object) return null
      return {
        body: object.bytes,
        size: object.bytes.byteLength,
        httpMetadata: object.httpMetadata,
        customMetadata: object.customMetadata,
        httpEtag: `"${key}"`,
      }
    },

    async delete(key) {
      store.delete(key)
    },

    // 測試用:直接看 bucket 裡還有什麼
    keys: () => [...store.keys()],
    count: () => store.size,
  }
}

// 各格式最小可辨識的檔頭(後面補零湊到足夠長度讓 sniff 讀得到)
export function imageBytes(type) {
  const heads = {
    'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'image/jpeg': [0xff, 0xd8, 0xff, 0xe0],
    'image/gif': [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    'image/webp': [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
  }
  const head = heads[type]
  if (!head) throw new Error(`沒有 ${type} 的測試資料`)
  const bytes = new Uint8Array(32)
  bytes.set(head)
  return bytes
}
