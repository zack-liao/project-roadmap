-- Migration number: 0003 	 2026-10-15T03:45:00.000Z
-- 每個 project 一張封面圖。存的是 R2 的物件 key,不是網址:
-- 圖片要跟著登入一起擋,所以一律由 Worker 的 /api/images/:key 供應,
-- bucket 本身不對外公開,網址不會、也不該出現在資料庫裡。

ALTER TABLE projects ADD COLUMN image_key TEXT;
