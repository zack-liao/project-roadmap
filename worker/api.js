// /api/* 的路由。前端唯一能碰資料的入口，瀏覽器不直接接觸 D1。
import { json, error, HttpError, notFound, readJsonObject } from './http.js'
import {
  buildProjectCreate, buildProjectPatch,
  buildCategoryCreate, buildCategoryPatch,
  parseState, parseIdList,
} from './mapping.js'
import * as repo from './repo.js'

// D1 的 FK 失敗訊息，轉成 400 比讓它冒成 500 有用
function isForeignKeyError(err) {
  return /FOREIGN KEY constraint failed/i.test(err?.message ?? '')
}

async function route(request, db, segments, user) {
  const { method } = request

  // /api/state
  if (segments.length === 1 && segments[0] === 'state') {
    if (method === 'GET') return json(await repo.getState(db))
    if (method === 'PUT') {
      await repo.replaceState(db, parseState(await readJsonObject(request)), user.id)
      return json(await repo.getState(db))
    }
    throw new HttpError(405, `${method} 不支援`)
  }

  // /api/projects
  if (segments[0] === 'projects') {
    if (segments.length === 1) {
      if (method === 'POST') {
        return json(await repo.createProject(db, buildProjectCreate(await readJsonObject(request)), user.id), 201)
      }
      throw new HttpError(405, `${method} 不支援`)
    }
    if (segments.length === 2) {
      const id = segments[1]
      if (method === 'PATCH') {
        const updated = await repo.updateProject(db, id, buildProjectPatch(await readJsonObject(request)))
        if (!updated) throw notFound(`找不到專案 ${id}`)
        return json(updated)
      }
      if (method === 'DELETE') {
        if (!(await repo.deleteProject(db, id))) throw notFound(`找不到專案 ${id}`)
        return new Response(null, { status: 204 })
      }
      throw new HttpError(405, `${method} 不支援`)
    }
  }

  // /api/categories
  if (segments[0] === 'categories') {
    if (segments.length === 1) {
      if (method === 'POST') {
        return json(await repo.createCategory(db, buildCategoryCreate(await readJsonObject(request)), user.id), 201)
      }
      throw new HttpError(405, `${method} 不支援`)
    }
    // /api/categories/order 必須排在 /:id 之前比對，否則會被當成 id 為 "order"
    if (segments.length === 2 && segments[1] === 'order') {
      if (method === 'PUT') {
        await repo.reorderCategories(db, parseIdList(await readJsonObject(request)))
        return json(await repo.getState(db))
      }
      throw new HttpError(405, `${method} 不支援`)
    }
    if (segments.length === 2) {
      const id = segments[1]
      if (method === 'PATCH') {
        const updated = await repo.updateCategory(db, id, buildCategoryPatch(await readJsonObject(request)))
        if (!updated) throw notFound(`找不到分類 ${id}`)
        return json(updated)
      }
      if (method === 'DELETE') {
        if (!(await repo.deleteCategory(db, id))) throw notFound(`找不到分類 ${id}`)
        return new Response(null, { status: 204 })
      }
      throw new HttpError(405, `${method} 不支援`)
    }
  }

  throw notFound(`未知的 API 路徑 /${segments.join('/')}`)
}

// user 是已通過驗證的呼叫者;建立資料時用它的 id 記錄出處
export async function handleApi(request, db, user) {
  const { pathname } = new URL(request.url)
  const segments = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)

  try {
    return await route(request, db, segments, user)
  } catch (err) {
    if (err instanceof HttpError) return error(err.status, err.message)
    if (isForeignKeyError(err)) return error(400, 'categoryId 指向不存在的分類')
    console.error('API 未預期錯誤', err)
    return error(500, '伺服器錯誤')
  }
}
