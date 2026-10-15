-- Migration number: 0001 	 2026-10-15T02:39:00.000Z
-- roadmap 的兩張核心表。全站共用單一份資料（無 user_id / workspace_id）；
-- 之後接 Google 登入時只擋存取，不改這裡的結構。

CREATE TABLE categories (
  id         TEXT    PRIMARY KEY,
  name       TEXT    NOT NULL DEFAULT '',
  color      TEXT    NOT NULL DEFAULT '#60a5fa',
  -- 泳道順序。前端的 moveCategory 會改這個值，查詢一律 ORDER BY position
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE projects (
  id          TEXT    PRIMARY KEY,
  name        TEXT    NOT NULL DEFAULT '',
  summary     TEXT    NOT NULL DEFAULT '',
  owner       TEXT    NOT NULL DEFAULT '',
  stakeholder TEXT    NOT NULL DEFAULT '',
  -- 絕對月座標（年*12+月+小數），NULL = 尚未排程。
  -- 刻意不存相對於時間軸起點的 startMonth：起點常數改版時已存資料才不會整批平移。
  start_abs   REAL,
  duration    INTEGER NOT NULL DEFAULT 1,
  lane        INTEGER,
  category_id TEXT    REFERENCES categories(id) ON DELETE SET NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_projects_category ON projects(category_id);
CREATE INDEX idx_categories_position ON categories(position);
