# Project Roadmap — 設計文件

**日期**：2026-07-06
**目標**：純本地端 project roadmap 網頁工具，基於時間區間規劃 Project，拖曳到 timeline 排程。同時作為資深後端工程師的前端入門學習專案。

---

## 1. 目的與成功條件

- 使用者能新增/修改任意 Project，欄位：名稱、簡介、負責人、核心利益人
- 能把 Project 拖曳到 timeline（甘特圖）上，規劃哪些 Project 在哪些月份啟動
- 純本地端運行，無後端；資料存 localStorage，並可匯入/匯出 JSON 檔攜帶
- 開發過程逐步教學，讓後端工程師學會前端核心概念

---

## 2. 技術棧

| 項目 | 選擇 | 理由 |
|------|------|------|
| 框架 | Vue 3（Composition API + `<script setup>`） | template 近 HTML，後端轉前端心智負擔低；響應式直覺 |
| 建置 | Vite | 一行起專案，dev server 快 |
| 儲存 | localStorage（自動存）+ JSON 匯入/匯出 | 零依賴、API 簡；JSON 檔可攜帶/備份/版控 |
| 拖曳 | VueUse（pointer 底層）+ 自刻甘特邏輯 | VueUse 為 Vue 生態事實標準；甘特座標/吸附邏輯自刻，為核心學習點 |
| 造型 | Vue SFC scoped CSS | 學前端造型基本功，零 UI 框架依賴（Tailwind 之後可加） |
| 部署 | 無（純本地 dev） | 純本地端目的 |

不用 Next.js：SSR/檔案路由/server component 對純本地端工具是過度設計。
不用 File System API：瀏覽器支援不齊、需權限；改用純下載/上傳，全瀏覽器通。
不用現成甘特庫或 SortableJS：前者學不到前端；後者為清單排序，不適用甘特橫條定位/改長度。

---

## 3. 資料模型

localStorage key：`roadmap.projects`，值為 `Project[]` 的 `JSON.stringify`。

```js
Project = {
  id: string,          // crypto.randomUUID()
  name: string,        // 名稱
  summary: string,     // 簡介
  owner: string,       // 負責人
  stakeholder: string, // 核心利益人
  startMonth: number,  // 0~11 (Jan~Dec) 起始月
  duration: number,    // 橫跨幾個月 (>=1)
  lane: number,        // 第幾列軌道(避免橫條重疊)
  color?: string       // 選配,橫條顏色
}
```

- 年度先固定當前年（橫軸 0~11 月）；跨年為 MVP 後擴充
- 未排程的 Project：`startMonth`/`lane` 可為 null，顯示於左側清單
- 匯出 = 下載該陣列成 `roadmap.json`；匯入 = 讀檔 `JSON.parse` 覆蓋

---

## 4. 元件架構

```
App.vue                  根:載入/儲存 state,協調
├─ Toolbar.vue           「新增 Project」鈕、匯入/匯出 JSON
├─ ProjectList.vue       左側未排程 Project 清單(可拖進 timeline)
├─ Timeline.vue          甘特主體
│   ├─ TimelineHeader    橫軸 12 月刻度
│   └─ ProjectBar.vue    單一橫條(拖移 + 兩端拉伸改長度)
└─ ProjectModal.vue      新增/編輯表單(4 欄位)

composables/
├─ useProjects.js        CRUD + localStorage 同步 + JSON 匯入匯出
└─ useDragBar.js         甘特拖曳邏輯(VueUse pointer + 座標↔月換算)
```

**設計原則**：每元件單一職責，透過 props/emit 溝通。`composables` 抽離邏輯（狀態與 UI 分離）。

- `useProjects` = 資料層（類 repository）
- `useDragBar` = 互動層
- UI 元件只負責畫 + 發事件

---

## 5. 核心互動與資料流

**新增/編輯**：Toolbar「新增」或雙擊橫條 → 開 `ProjectModal` → 填 4 欄 → emit 存 → `useProjects` 寫 localStorage → Vue 響應式自動重繪。

**排程（拖進 timeline）**：從 `ProjectList` 拖 Project 到 `Timeline` → 放下處算出 `startMonth`/`lane` → 顯示為 `ProjectBar`。

**改時間（拖橫條）**：`useDragBar` 聽 `pointermove` → 座標→月換算 → 吸附月初 → 更新 `startMonth`。

**改長度（拉兩端）**：拉右緣改 `duration`；拉左緣同時改 `startMonth` + `duration`。

**刪除**：橫條右鍵或 hover 出現 ✕ → 移除 → 自動存。

**座標數學（核心學習點）**：
```
monthWidth = trackWidth / 12
月 = clamp(round((mouseX - trackLeft) / monthWidth), 0, 11)
橫條 left = startMonth * monthWidth
橫條 width = duration * monthWidth
```

---

## 6. MVP 範圍與學習節奏

**MVP（依序做）**：
1. Vite + Vue 專案骨架，跑起來
2. 資料模型 + `useProjects`（CRUD + localStorage）
3. `ProjectModal` 表單新增/編輯 4 欄
4. `Timeline` 靜態甘特（12 月軸 + 依資料畫橫條，先不拖）
5. `useDragBar` 拖移改時間
6. 兩端拉伸改長度
7. 從清單拖進 timeline 排程
8. JSON 匯入/匯出

**刻意排除（YAGNI）**：跨年捲動、週/季縮放、橫條相依箭頭、多人協作、undo/redo、拖曳動畫美化。

**學習節奏**：每步先講「這步學什麼前端概念」（響應式、元件通訊、composable、事件、生命週期…），對照後端已熟概念，再一起寫。

**測試**：MVP 以手動瀏覽器驗證為主；`useProjects` 座標換算等純函式加 Vitest 單測（順便學前端測試）。
