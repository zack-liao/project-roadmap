import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  test: {
    // Vitest 設定:純函式測試跑在 node 環境即可
    environment: 'node',
  },
})
