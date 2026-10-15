# Roadmap 後端：Cloudflare D1 + Worker

2026-10-15

## 目標

把 roadmap 的資料從瀏覽器的 `localStorage` 搬到 Cloudflare D1，讓團隊看同一份資料，
而不是每個人各自存在自己的瀏覽器裡。前端不直接碰資料庫，所有讀寫都經過 Worker 的 `/api`。

## 範圍決策

| 項目 | 決定 |
|---|---|
| 照片上傳（R2） | 這次不做。之後要加時再開 `attachments` 表與上傳端點，不影響現在的結構。 |
| 資料範圍 | 全站共用單一份。資料表不帶 `user_id` / `workspace_id`。 |
| Google 登入 | 這次不做。因為資料是共用的，之後加登入只是「擋沒登入的人」，不需要改資料表。 |
| `localStorage` | 移除。前端狀態改由 `GET /api/state` 取得。 |

## 架構

一個 Worker 同時供應前端靜態檔與 API：

- `wrangler.jsonc` 的 `assets` 指向 `./dist`，`not_found_handling: "single-page-application"`
- `run_worker_first: ["/api/*"]`：只有 API 路徑進 Worker，其餘路徑先找靜態檔

同源，所以沒有 CORS 問題，也只有一個部署指令。

開發時前端在 Vite 5173、Worker 在 8787，靠 Vite 的 proxy 把 `/api` 轉過去，
維持與部署後一致的同源行為。

## 資料表

`migrations/0001_init_schema.sql`

**`categories`** — `id` TEXT PK、`name`、`color`、`position`、`created_at`、`updated_at`

`position` 是泳道順序。API 不外露這個欄位，順序由回傳陣列本身表達，重排走專屬端點。

**`projects`** — `id` TEXT PK、`name`、`summary`、`owner`、`stakeholder`、
`start_abs` REAL、`duration`、`lane`、`category_id`、`created_at`、`updated_at`

`start_abs` 存**絕對**月座標（年×12+月+小數），`NULL` 代表尚未排程。
沿用搬遷前的決定：不存相對於時間軸起點的 `startMonth`，起點常數改版時已存資料才不會整批平移
（commit 39f9cdb 把起點從 2026-01 改成 2026-07 時曾讓舊資料平移 6 個月）。

`category_id` 外鍵設 `ON DELETE SET NULL`：刪掉類別時底下的專案保留，只是變成未分類。

## API

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/state` | 取整份 `{ categories, projects }`，前端啟動時呼叫 |
| PUT | `/api/state` | 整包覆寫，給 JSON 匯入用 |
| POST | `/api/projects` | 建立。`id` 可由前端帶，後端沿用 |
| PATCH | `/api/projects/:id` | 部分更新 |
| DELETE | `/api/projects/:id` | 刪除 |
| POST | `/api/categories` | 建立，`position` 自動接在最後 |
| PATCH | `/api/categories/:id` | 部分更新 |
| DELETE | `/api/categories/:id` | 刪除 |
| PUT | `/api/categories/order` | `{ ids: [...] }` 重排 |

錯誤一律回 `{ error: string }`。外鍵失敗轉成 400 而不是讓它冒成 500。

## 模組切分

| 檔案 | 責任 |
|---|---|
| `worker/index.js` | 進入點，只分流 `/api` |
| `worker/api.js` | 路由與狀態碼 |
| `worker/repo.js` | 所有 D1 查詢 |
| `worker/mapping.js` | 資料列 ↔ API JSON、欄位驗證（純函式） |
| `worker/http.js` | 回應格式與 `HttpError` |
| `src/api.js` | 前端 HTTP client |
| `src/composables/syncQueue.js` | 送出順序與 patch 合併 |
| `src/composables/useProjects.js` | 前端狀態與樂觀更新 |

## 樂觀更新與同步

前端改動先更新本地狀態（畫面即時反應），再把請求交給 `syncQueue`。佇列做兩件事：

1. **保證順序** — 建立／刪除／重排會先把待送的 patch 推出去，避免 DELETE 搶在 PATCH 前面。
2. **合併 patch** — 拖一根 bar 會觸發幾十次 `updateProject`，同一個對象的連續更新
   在 250ms 內合併成一次請求，不然等於對 D1 連打幾十次寫入。

任何一筆同步失敗時，把錯誤丟到 `syncError`（App.vue 顯示 toast），並重新 `GET /api/state`
把畫面校正回伺服器的真實狀態 —— 樂觀更新不能停在一個資料庫裡沒有的狀態。

## 測試

- `worker/mapping.test.js` — 欄位驗證與轉換的純函式測試
- `worker/api.test.js` — 用 `node:sqlite` 建記憶體資料庫當 D1 替身，套用真正的 migration，
  所以 `repo.js` 的 SQL 本身也被測到，而不是只測到 mock 的回傳值
- `src/composables/syncQueue.test.js` — 順序、合併、debounce、錯誤隔離
- `src/composables/useProjects.test.js` — 以假 client 驗樂觀更新、座標換算、失敗校正、匯入匯出

## 部署

不在這次範圍內執行。Cloudflare 上要填：

- 組建命令：`npm run build`
- 部署命令：`npx wrangler deploy`
- 專案名稱：必須等於 `wrangler.jsonc` 的 `name`，也就是 `project-roadmap`
