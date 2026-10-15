-- Migration number: 0004 	 2026-10-15T04:05:00.000Z
-- duration 本來就可能是小數:時間軸的拖曳粒度是四分之一個月,
-- 2.5、2.25 都是正常長度。原本宣告成 INTEGER 是錯的 —— SQLite 的
-- NUMERIC 親和性讓小數還是以 REAL 存下來沒有損壞,但宣告會誤導後來的人。
--
-- SQLite 不能直接改欄位型別,照標準做法重建資料表。
-- 沒有任何資料表參照 projects,所以重建不會破壞外鍵。

CREATE TABLE projects_new (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL DEFAULT '',
  summary     TEXT    NOT NULL DEFAULT '',
  owner       TEXT    NOT NULL DEFAULT '',
  stakeholder TEXT    NOT NULL DEFAULT '',
  start_abs   REAL,
  duration    REAL    NOT NULL DEFAULT 1,
  lane        INTEGER,
  category_id TEXT    REFERENCES categories(id) ON DELETE SET NULL,
  image_key   TEXT,
  created_by  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO projects_new
  (id, name, summary, owner, stakeholder, start_abs, duration, lane, category_id, image_key, created_by, created_at, updated_at)
SELECT
  id, name, summary, owner, stakeholder, start_abs, duration, lane, category_id, image_key, created_by, created_at, updated_at
FROM projects;

DROP TABLE projects;
ALTER TABLE projects_new RENAME TO projects;

CREATE INDEX idx_projects_category ON projects(category_id);
