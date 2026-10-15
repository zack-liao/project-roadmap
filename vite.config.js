import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
    proxy: {
      // 開發時前端在 5173、Worker 在 8787,靠 proxy 讓 /api 維持同源,
      // 和部署後由同一個 Worker 供應靜態檔與 API 的行為一致
      '/api': {
        target: process.env.WORKER_URL || 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  test: {
    // Vitest 設定:純函式測試跑在 node 環境即可
    environment: 'node',
  },
})
