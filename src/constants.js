export const STORAGE_KEY = 'roadmap.projects'

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// 時間軸起點與跨度。startMonth 為距此起點的月偏移（0 = 起點那月）。
export const TIMELINE_START_YEAR = 2026
export const TIMELINE_START_MONTH = 6   // 0-indexed：6 = Jul
export const MONTH_COUNT = 18            // 跨度月數：2026-07 ~ 2027-12

// 每月固定像素寬（固寬 → 超出畫面橫向捲動，保持可讀）
export const MONTH_WIDTH = 72

// 每月細分段數（4 = 每段約一週）。拖曳/拉伸吸附到 1/SUBDIVISIONS 月。
export const SUBDIVISIONS = 4
export const SNAP = 1 / SUBDIVISIONS   // 0.25 月
export const MIN_DURATION = SNAP        // 橫條最短長度

// 每條軌道（lane）的高度，橫條上下拖曳吸附到整數 lane
export const LANE_HEIGHT = 44

// 每個 swimlane 帶頂部的標題列高度（放類別名 chip，bar 不會進入這區）
export const BAND_HEADER = 40
