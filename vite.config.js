import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { cloudflare } from '@cloudflare/vite-plugin'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // 第三個參數給空字串 = 不限定 VITE_ 前綴,才讀得到 .env 裡的 GOOGLE_OAUTH_*
  const env = loadEnv(mode, process.cwd(), '')
  const googleClientId = env.GOOGLE_OAUTH_CLIENT_ID || ''

  // 組建時沒有 Client ID 就直接失敗。與其部署一個前端無法登入、後端一律回 401
  // 的站台,不如讓組建停在這裡。
  if (command === 'build' && !googleClientId) {
    throw new Error(
      '缺少 GOOGLE_OAUTH_CLIENT_ID:請在 .env 或組建環境變數提供 Google OAuth Client ID',
    )
  }

  return {
    plugins: [
      vue(),
      // 測試不需要真的起一個 workerd,Worker 的行為由 worker/*.test.js 直接測
      ...(mode === 'test' ? [] : [cloudflare({
        // Client ID 不是機密(它本來就嵌在前端 JS 裡),所以用 vars 不是 secret。
        // 同一個值同時給前端(define)與 Worker(vars),來源都是 .env。
        config: { vars: { GOOGLE_CLIENT_ID: googleClientId } },
      })]),
    ],

    define: {
      __GOOGLE_CLIENT_ID__: JSON.stringify(googleClientId),
    },

    server: {
      port: Number(process.env.PORT) || 5173,
      strictPort: true,
      headers: {
        // Google 對 http://localhost 測試環境的要求。只加在 dev server,
        // 正式站走 https 不需要降級的 referrer 政策。
        'Referrer-Policy': 'no-referrer-when-downgrade',
      },
    },

    test: {
      // Vitest 設定:純函式測試跑在 node 環境即可
      environment: 'node',
    },
  }
})
