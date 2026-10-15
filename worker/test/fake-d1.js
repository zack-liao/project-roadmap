// 測試用的 D1 替身：用 node:sqlite 的記憶體資料庫跑真正的 SQL，
// 介面比照 D1（prepare / bind / first / all / run / batch），
// 所以 repo.js 的 SQL 本身也會被測到，而不是只測到 mock 的回傳值。
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

// Vite 的 node builtin 清單還沒收錄 node:sqlite，直接 import 會在解析階段失敗，
// 繞過 Vite 的模組解析用 require 取得
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite')

const MIGRATIONS_DIR = fileURLToPath(new URL('../../migrations/', import.meta.url))

// 套用全部 migration 而不是只套第一個,之後新增的 migration 會自動納入測試
function migrationFiles() {
  return readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
}

class FakeStatement {
  constructor(db, sql, params = []) {
    this.db = db
    this.sql = sql
    this.params = params
  }

  // D1 的 bind 回傳新的 statement 而不是改原本那個，替身也要一樣，
  // 否則像 reorderCategories 那種重複 bind 同一個 stmt 的寫法會全部指到最後一組參數
  bind(...params) {
    return new FakeStatement(this.db, this.sql, params)
  }

  first() {
    return this.db.prepare(this.sql).get(...this.params) ?? null
  }

  all() {
    return { results: this.db.prepare(this.sql).all(...this.params), success: true }
  }

  run() {
    const info = this.db.prepare(this.sql).run(...this.params)
    return { success: true, meta: { changes: Number(info.changes) } }
  }
}

export function createFakeD1() {
  const db = new DatabaseSync(':memory:')
  // D1 預設開啟外鍵約束，SQLite 預設關閉，這裡補上才能測到 ON DELETE SET NULL
  db.exec('PRAGMA foreign_keys = ON')
  for (const file of migrationFiles()) db.exec(readFileSync(MIGRATIONS_DIR + file, 'utf8'))

  return {
    prepare: (sql) => new FakeStatement(db, sql),
    batch: (statements) => {
      db.exec('BEGIN')
      try {
        const out = statements.map((s) => s.run())
        db.exec('COMMIT')
        return out
      } catch (err) {
        db.exec('ROLLBACK')
        throw err
      }
    },
    // 測試直接查資料庫狀態用
    raw: db,
  }
}
