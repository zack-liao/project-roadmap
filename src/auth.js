// Google Identity Services(GIS)的載入與 ID token 解讀。
// 只用 Client ID,不碰 client secret,也沒有重新導向 URI —— 走的是 popup + callback。

const GIS_SRC = 'https://accounts.google.com/gsi/client'

let loading = null

export function loadGoogleIdentity() {
  if (loading) return loading

  loading = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve(window.google)

    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.defer = true
    script.onload = () => {
      if (window.google?.accounts?.id) resolve(window.google)
      else reject(new Error('Google 登入元件載入了但沒有初始化'))
    }
    script.onerror = () => {
      loading = null   // 允許下次重試,例如暫時連不上網
      reject(new Error('載入 Google 登入元件失敗'))
    }
    document.head.appendChild(script)
  })

  return loading
}

// 只解開不驗證 —— 真正的驗證在 Worker。
// 這裡解出來只為了顯示名字頭像、以及判斷 token 是不是已經過期。
export function decodeIdToken(token) {
  try {
    const payload = String(token).split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64)
    // atob 給的是 latin1,中文名字要轉回 UTF-8 才不會變亂碼
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

// 留一點緩衝,免得前端覺得還沒過期、送出去才被 Worker 打回來
export function isExpired(claims, skewSeconds = 30) {
  if (typeof claims?.exp !== 'number') return true
  return claims.exp * 1000 <= Date.now() + skewSeconds * 1000
}
