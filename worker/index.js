// Cloudflare Worker 進入點。
// 靜態檔由 Vite / assets 供應,這裡只處理 /api,而且每個 /api 請求都要先通過登入驗證。
import { handleApi } from './api.js'
import { authenticate } from './auth.js'
import { error, HttpError } from './http.js'

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)

    if (pathname !== '/api' && !pathname.startsWith('/api/')) {
      // 正常情況不會走到這裡(靜態檔會先接手)
      return error(404, '找不到資源')
    }

    let user
    try {
      user = await authenticate(request, env)
    } catch (err) {
      // 驗證沒過就在這裡結束,完全不碰 D1
      if (err instanceof HttpError) return error(err.status, err.message)
      console.error('驗證時發生未預期錯誤', err)
      return error(401, '登入驗證失敗')
    }

    return handleApi(request, env, user)
  },
}
