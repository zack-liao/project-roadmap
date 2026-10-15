// 一致的 JSON 回應格式：成功直接回資料，失敗回 { error: string }。

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // API 回應永遠即時，不讓 CDN / 瀏覽器快取舊的 roadmap
      'cache-control': 'no-store',
    },
  })
}

export function error(status, message) {
  return json({ error: message }, status)
}

// 由 handler 丟出，被 api.js 轉成對應狀態碼的 JSON 回應
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function badRequest(message) {
  return new HttpError(400, message)
}

export function notFound(message = '找不到資源') {
  return new HttpError(404, message)
}

// body 不是合法 JSON 物件時一律視為 400，而不是讓 JSON.parse 的 SyntaxError 冒成 500
export async function readJsonObject(request) {
  let body
  try {
    body = await request.json()
  } catch {
    throw badRequest('request body 必須是合法 JSON')
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('request body 必須是 JSON 物件')
  }
  return body
}
