-- Migration number: 0002 	 2026-10-15T03:20:00.000Z
-- 記錄是誰建立的。資料仍然大家看同一份,created_by 只是出處,不是存取控制。
-- 值是 Google ID token 的 sub(穩定的使用者識別碼),不是 email:
-- email 會改、會被回收,sub 不會。

ALTER TABLE projects   ADD COLUMN created_by TEXT;
ALTER TABLE categories ADD COLUMN created_by TEXT;
