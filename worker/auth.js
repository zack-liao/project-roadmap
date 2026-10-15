// 驗證 Google ID token。每個 /api 請求都要先過這一關,沒過就不會碰到 D1。
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { HttpError } from './http.js'

// 建在 fetch 外面:同一個 isolate 的所有請求共用這份 JWKS,
// Google 的金鑰才會被快取,而不是每個請求都去抓一次。
const JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'))

// Google 兩種 iss 都會發,兩種都要接受
const ISSUERS = ['accounts.google.com', 'https://accounts.google.com']

// 只開放公司帳號。hd 是 Google Workspace 的 hosted domain,個人 gmail 不會有這個欄位。
const ALLOWED_DOMAIN = 'hexschool.com'

function unauthorized(message) {
  return new HttpError(401, message)
}

function readBearerToken(request) {
  const header = request.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(\S+)$/.exec(header.trim())
  if (!match) throw unauthorized('缺少 Authorization: Bearer 標頭')
  return match[1]
}

// 回傳通過驗證的使用者;任何一關沒過都丟 401
export async function authenticate(request, env, jwks = JWKS) {
  const clientId = env?.GOOGLE_CLIENT_ID
  // 沒設定 client id 就無從驗證 aud。這種情況要擋下而不是放行,
  // 否則設定掉了會變成整個 API 無人把關。
  if (!clientId) throw unauthorized('伺服器未設定 GOOGLE_CLIENT_ID')

  const token = readBearerToken(request)

  let payload
  try {
    // aud / iss / 過期(exp、nbf)由 jwtVerify 檢查,簽章對 Google 的 JWKS 驗
    ;({ payload } = await jwtVerify(token, jwks, { audience: clientId, issuer: ISSUERS }))
  } catch {
    // 不把 jose 的細節往外吐,對呼叫端來說都是「請重新登入」
    throw unauthorized('登入憑證無效或已過期')
  }

  if (payload.hd !== ALLOWED_DOMAIN) throw unauthorized(`只開放 ${ALLOWED_DOMAIN} 的帳號使用`)
  if (payload.email_verified !== true) throw unauthorized('這個 Google 帳號的 email 尚未驗證')
  if (!payload.sub) throw unauthorized('登入憑證缺少使用者識別碼')

  // 用 sub 當使用者 ID:email 可以改、可以被回收再指派給別人,sub 不會變
  return {
    id: payload.sub,
    email: payload.email ?? '',
    name: payload.name ?? '',
    picture: payload.picture ?? '',
  }
}
