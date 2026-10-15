// 封面圖的存取。bucket 不對外公開,圖片一律經過這裡,跟 /api 其他端點一樣要先通過登入驗證。
import { HttpError } from './http.js'

const MAX_BYTES = 5 * 1024 * 1024

// 只收這四種。刻意不收 SVG:SVG 可以夾帶 script,
// 而瀏覽器開啟圖片網址時會把它當文件渲染。
const ALLOWED = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
])

// key 一律由我們自己產生,長這個樣子。檢查形狀是為了擋下
// 前端塞進來的任意字串被當成 R2 的物件路徑使用。
const KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|gif)$/

export function isValidImageKey(key) {
  return typeof key === 'string' && KEY_PATTERN.test(key)
}

// 用檔頭判斷真正的格式。content-type 是前端說了算,不能單憑它決定存什麼。
export function sniffImageType(bytes) {
  const b = new Uint8Array(bytes)
  if (b.length < 12) return null
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return 'image/gif'
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return 'image/webp'
  return null
}

export async function putImage(bucket, request, userId) {
  const declaredType = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  const extension = ALLOWED.get(declaredType)
  if (!extension) {
    throw new HttpError(415, `不支援的圖片格式:${declaredType || '未指定'}（只收 PNG / JPEG / WebP / GIF）`)
  }

  // content-length 可以造假,先用它擋掉明顯過大的請求,真正的判斷在讀完之後
  const declaredSize = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredSize) && declaredSize > MAX_BYTES) {
    throw new HttpError(413, '圖片超過 5 MB')
  }

  const bytes = await request.arrayBuffer()
  if (bytes.byteLength === 0) throw new HttpError(400, '圖片內容是空的')
  if (bytes.byteLength > MAX_BYTES) throw new HttpError(413, '圖片超過 5 MB')

  const actualType = sniffImageType(bytes)
  if (actualType !== declaredType) {
    throw new HttpError(
      415,
      actualType
        ? `內容其實是 ${actualType},與宣稱的 ${declaredType} 不符`
        : '這個檔案的內容不是支援的圖片格式',
    )
  }

  const key = `${crypto.randomUUID()}.${extension}`
  await bucket.put(key, bytes, {
    httpMetadata: { contentType: declaredType },
    customMetadata: { uploadedBy: userId },
  })

  return { key, contentType: declaredType, size: bytes.byteLength }
}

export async function getImage(bucket, key) {
  if (!isValidImageKey(key)) throw new HttpError(404, '找不到圖片')

  const object = await bucket.get(key)
  if (!object) throw new HttpError(404, '找不到圖片')

  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      // 換圖等於換 key,所以同一個 key 的內容永遠不變,可以長期快取。
      // private:這是登入後才拿得到的內容,不讓中間層共用快取。
      'cache-control': 'private, max-age=31536000, immutable',
      'x-content-type-options': 'nosniff',
      etag: object.httpEtag,
    },
  })
}

// 清掉沒人引用的圖。刪不掉不該讓呼叫端的操作失敗 —— 資料庫那邊已經成功了,
// 留一個孤兒物件比把整個請求判定為失敗好。
export async function deleteImage(bucket, key) {
  if (!bucket || !isValidImageKey(key)) return
  try {
    await bucket.delete(key)
  } catch (err) {
    console.error('刪除圖片失敗', key, err)
  }
}
