import { ref, watch } from 'vue'

// 封面圖要帶 Authorization 才拿得到,<img src> 做不到這件事,
// 所以得先 fetch 成 blob 再轉 object URL。
// 同一張圖在一個 session 內只抓一次,快取 key -> Promise<objectURL>。
export function createImageCache(api) {
  const cache = new Map()

  function get(key) {
    if (!key) return Promise.resolve(null)

    if (!cache.has(key)) {
      const pending = api.imageBlob(key)
        .then((blob) => URL.createObjectURL(blob))
        .catch((err) => {
          // 失敗就不要卡在快取裡,下次還有機會重試
          cache.delete(key)
          throw err
        })
      cache.set(key, pending)
    }

    return cache.get(key)
  }

  // 登出時連同畫面一起清掉,不把上一個人的圖留在記憶體
  function clear() {
    for (const pending of cache.values()) {
      pending.then((url) => url && URL.revokeObjectURL(url)).catch(() => {})
    }
    cache.clear()
  }

  return { get, clear }
}

// 把「一個會變動的 image key」變成可以直接綁到 <img :src> 的 ref
export function useImageSrc(cache, keyGetter) {
  const src = ref(null)
  const loading = ref(false)
  const error = ref(null)

  watch(keyGetter, async (key) => {
    src.value = null
    error.value = null
    if (!key) return

    loading.value = true
    try {
      const url = await cache.get(key)
      // 載入期間使用者可能已經換看別張,慢的回應不該蓋掉現在這張
      if (keyGetter() === key) src.value = url
    } catch (err) {
      if (keyGetter() === key) error.value = err.message
    } finally {
      if (keyGetter() === key) loading.value = false
    }
  }, { immediate: true })

  return { src, loading, error }
}
