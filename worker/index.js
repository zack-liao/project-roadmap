// Cloudflare Worker 進入點。
// 靜態檔由 wrangler.jsonc 的 assets 直接供應（run_worker_first 只把 /api/* 導進來），
// 所以這裡只需要處理 API。
import { handleApi } from './api.js'
import { error } from './http.js'

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url)

    if (pathname === '/api' || pathname.startsWith('/api/')) {
      return handleApi(request, env.DB)
    }

    // 正常情況不會走到這裡（assets 會先接手）；真的走到代表路徑設定有問題
    return error(404, '找不到資源')
  },
}
