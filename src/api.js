// Worker /api 的 HTTP client。前端唯一的資料出入口,不直接碰資料庫。
const BASE = '/api'

// getToken 提供目前的 Google ID token;onUnauthorized 在 401 時被呼叫,
// 由上層決定要怎麼請使用者重新登入。
export function createApiClient({ getToken = () => null, onUnauthorized = () => {} } = {}) {
  async function request(method, path, body) {
    const headers = {}
    const token = getToken()
    if (token) headers.authorization = `Bearer ${token}`
    if (body !== undefined) headers['content-type'] = 'application/json'

    const res = await fetch(BASE + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
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
  }
}
