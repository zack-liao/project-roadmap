import { ref, computed } from 'vue'
import { loadGoogleIdentity, decodeIdToken, isExpired } from '../auth.js'

// 重整頁面不用再按一次登入。ID token 本來就只有約一小時壽命,
// 過期的處理一律交給 Worker 回 401,前端不自己續期。
const TOKEN_KEY = 'roadmap.idToken'

function readStoredToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function useAuth(clientId) {
  const token = ref(null)
  const user = ref(null)
  const authError = ref(null)

  function setToken(next) {
    const claims = next ? decodeIdToken(next) : null

    if (!next || !claims || isExpired(claims)) {
      token.value = null
      user.value = null
      try { sessionStorage.removeItem(TOKEN_KEY) } catch { /* 隱私模式下沒有 sessionStorage */ }
      return false
    }

    token.value = next
    user.value = {
      id: claims.sub,
      name: claims.name ?? '',
      email: claims.email ?? '',
      picture: claims.picture ?? '',
    }
    try { sessionStorage.setItem(TOKEN_KEY, next) } catch { /* 存不進去不影響這次登入 */ }
    return true
  }

  setToken(readStoredToken())

  const signedIn = computed(() => token.value !== null)

  // initialize() 整個頁面生命週期只做一次 —— GIS 被重複 initialize 會發出警告,
  // 而且只有最後一次會生效。重畫按鈕(登出後回到登入畫面)只需要 renderButton。
  let initialized = false

  // 把「使用 Google 帳戶登入」按鈕畫進指定的元素。
  // 全程不呼叫 prompt(),所以不會出現 One Tap。
  async function mountButton(el) {
    if (!el) return
    if (!clientId) {
      authError.value = '這個站台沒有設定 Google Client ID,無法登入'
      return
    }

    try {
      const google = await loadGoogleIdentity()

      if (!initialized) {
        google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => {
            if (setToken(credential)) authError.value = null
            else authError.value = '拿到的登入憑證無效,請再試一次'
          },
          auto_select: false,
          ux_mode: 'popup',
        })
        initialized = true
      }

      google.accounts.id.renderButton(el, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        locale: 'zh_TW',
      })
    } catch (err) {
      authError.value = err.message
    }
  }

  function signOut(reason = null) {
    try { window.google?.accounts?.id?.disableAutoSelect() } catch { /* 還沒載入就登出 */ }
    setToken(null)
    authError.value = reason
  }

  return {
    token, user, signedIn, authError,
    mountButton, signOut,
    getToken: () => token.value,
  }
}
