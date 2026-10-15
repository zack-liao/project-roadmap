// Worker /api 的 HTTP client。前端唯一的資料出入口,不直接碰資料庫。
const BASE = '/api'

// getToken 提供目前的 Google ID token;onUnauthorized 在 401 時被呼叫,
// 由上層決定要怎麼請使用者重新登入。
export function createApiClient({ getToken = () => null, onUnauthorized = () => {} } = {}) {
  function authHeaders() {
    const token = getToken()
    return token ? { authorization: `Bearer ${token}` } : {}
  }

  async function request(method, path, body) {
    const headers = authHeaders()

    // Blob / File 原樣送出(圖片上傳),其餘序列化成 JSON
    const isBinary = typeof Blob !== 'undefined' && body instanceof Blob
    if (isBinary) headers['content-type'] = body.type
    else if (body !== undefined) headers['content-type'] = 'application/json'

    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : (isBinary ? body : JSON.stringify(body)),
    })

    if (!res.ok) {
      // Worker 的錯誤都是 { error };真的拿不到就退回狀態碼
      let message = `${res.status} ${res.statusText}`
      try {
        const data = await res.json()
        if (data?.error) message = data.error
      } catch { /* 非 JSON 回應,沿用狀態碼 */ }

      // 401 代表通行證過期或無效,要重新登入,不是單純某一筆寫入失敗
      if (res.status === 401) onUnauthorized(message)

      throw new Error(message)
    }

    return res.status === 204 ? null : res.json()
  }

  return {
    getState: () => request('GET', '/state'),
    replaceState: (state) => request('PUT', '/state', state),

    createProject: (project) => request('POST', '/projects', project),
    patchProject: (id, patch) => request('PATCH', `/projects/${encodeURIComponent(id)}`, patch),
    deleteProject: (id) => request('DELETE', `/projects/${encodeURIComponent(id)}`),

    createCategory: (category) => request('POST', '/categories', category),
    patchCategory: (id, patch) => request('PATCH', `/categories/${encodeURIComponent(id)}`, patch),
    deleteCategory: (id) => request('DELETE', `/categories/${encodeURIComponent(id)}`),
    reorderCategories: (ids) => request('PUT', '/categories/order', { ids }),

    // 圖片直接以原始 bytes 送出,content-type 就是檔案本身的型別。
    // 不走 multipart:後端只需要一個檔案,省掉解析表單的那一層。
    uploadImage: (file) => request('POST', '/images', file),

    // 圖片是登入後才拿得到的內容,<img src> 沒辦法帶 Authorization 標頭,
    // 所以得自己 fetch 成 blob 再轉 object URL。
    async imageBlob(key) {
      const res = await fetch(`${BASE}/images/${encodeURIComponent(key)}`, {
        headers: authHeaders(),
      })
      if (!res.ok) {
        if (res.status === 401) onUnauthorized('登入已過期,請重新登入')
        throw new Error(`圖片載入失敗(${res.status})`)
      }
      return res.blob()
    },
  }
}
