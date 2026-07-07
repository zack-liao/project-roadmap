export const STORAGE_KEY = 'roadmap.projects'

export const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export const MONTH_COUNT = 12

// 每月細分段數（4 = 每段約一週）。拖曳/拉伸吸附到 1/SUBDIVISIONS 月。
export const SUBDIVISIONS = 4
export const SNAP = 1 / SUBDIVISIONS   // 0.25 月
export const MIN_DURATION = SNAP        // 橫條最短長度
