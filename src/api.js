// Worker /api 的 HTTP client。前端唯一的資料出入口，不直接碰資料庫。
const BASE = '/api'

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!res.ok) {
    // Worker 的錯誤都是 { error }；真的拿不到就退回狀態碼
    let message = `${res.status} ${res.statusText}`
    try {
      const data = await res.json()
      if (data?.error) message = data.error
    } catch { /* 非 JSON 回應，沿用狀態碼 */ }
    throw new Error(message)
  }

  return res.status === 204 ? null : res.json()
}

export const api = {
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
