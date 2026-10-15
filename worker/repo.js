// 所有 D1 存取集中在這裡。欄位名一律來自 mapping.js 的白名單，值一律走 bind 參數。
import { rowToProject, rowToCategory } from './mapping.js'

function setClause(columns) {
  return Object.keys(columns).map((c) => `${c} = ?`).join(', ')
}

export async function getState(db) {
  const [categories, projects] = await Promise.all([
    db.prepare('SELECT * FROM categories ORDER BY position, created_at').all(),
    db.prepare('SELECT * FROM projects ORDER BY created_at').all(),
  ])
  return {
    categories: categories.results.map(rowToCategory),
    projects: projects.results.map(rowToProject),
  }
}

export async function createProject(db, { id, columns }, userId) {
  const cols = ['id', ...Object.keys(columns), 'created_by']
  const row = await db
    .prepare(
      `INSERT INTO projects (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')}) RETURNING *`,
    )
    .bind(id, ...Object.values(columns), userId)
    .first()
  return rowToProject(row)
}

export async function updateProject(db, id, columns) {
  const row = await db
    .prepare(
      `UPDATE projects SET ${setClause(columns)}, updated_at = datetime('now') WHERE id = ? RETURNING *`,
    )
    .bind(...Object.values(columns), id)
    .first()
  return row ? rowToProject(row) : null
}

export async function deleteProject(db, id) {
  const { meta } = await db.prepare('DELETE FROM projects WHERE id = ?').bind(id).run()
  return meta.changes > 0
}

export async function createCategory(db, { id, columns }, userId) {
  const cols = ['id', ...Object.keys(columns), 'created_by']
  // position 接在現有最大值之後，新分類一律排到最下面
  const row = await db
    .prepare(
      `INSERT INTO categories (${cols.join(', ')}, position)
       VALUES (${cols.map(() => '?').join(', ')}, (SELECT COALESCE(MAX(position) + 1, 0) FROM categories))
       RETURNING *`,
    )
    .bind(id, ...Object.values(columns), userId)
    .first()
  return rowToCategory(row)
}

export async function updateCategory(db, id, columns) {
  const row = await db
    .prepare(
      `UPDATE categories SET ${setClause(columns)}, updated_at = datetime('now') WHERE id = ? RETURNING *`,
    )
    .bind(...Object.values(columns), id)
    .first()
  return row ? rowToCategory(row) : null
}

// FK 的 ON DELETE SET NULL 會把底下專案的 category_id 清成 null，專案本身保留
export async function deleteCategory(db, id) {
  const { meta } = await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run()
  return meta.changes > 0
}

export async function reorderCategories(db, ids) {
  if (ids.length === 0) return
  const stmt = db.prepare('UPDATE categories SET position = ?, updated_at = datetime(\'now\') WHERE id = ?')
  await db.batch(ids.map((id, i) => stmt.bind(i, id)))
}

// 匯入：整包覆寫。batch 在單一交易內執行，中途失敗不會留下半套資料。
export async function replaceState(db, { categories, projects }, userId) {
  const statements = [
    db.prepare('DELETE FROM projects'),
    db.prepare('DELETE FROM categories'),
  ]

  categories.forEach(({ id, columns }, i) => {
    const cols = ['id', ...Object.keys(columns), 'position', 'created_by']
    statements.push(
      db
        .prepare(`INSERT INTO categories (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
        .bind(id, ...Object.values(columns), i, userId),
    )
  })

  for (const { id, columns } of projects) {
    const cols = ['id', ...Object.keys(columns), 'created_by']
    statements.push(
      db
        .prepare(`INSERT INTO projects (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
        .bind(id, ...Object.values(columns), userId),
    )
  }

  await db.batch(statements)
}
