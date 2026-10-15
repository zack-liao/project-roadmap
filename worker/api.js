// /api/* 的路由。前端唯一能碰資料的入口,瀏覽器不直接接觸 D1 或 R2。
import { json, error, HttpError, notFound, readJsonObject } from './http.js'
import {
  buildProjectCreate, buildProjectPatch,
  buildCategoryCreate, buildCategoryPatch,
  parseState, parseIdList,
} from './mapping.js'
import { putImage, getImage, deleteImage } from './images.js'
import * as repo from './repo.js'

// D1 的 FK 失敗訊息,轉成 400 比讓它冒成 500 有用
function isForeignKeyError(err) {
  return /FOREIGN KEY constraint failed/i.test(err?.message ?? '')
}

function methodNotAllowed(method) {
  return new HttpError(405, `${method} 不支援`)
}

async function route(request, env, segments, user) {
  const { method } = request
  const db = env.DB

  // /api/state
  if (segments.length === 1 && segments[0] === 'state') {
    if (method === 'GET') return json(await repo.getState(db))
    if (method === 'PUT') {
      const incoming = parseState(await readJsonObject(request))
      // 整包覆寫會讓原本的圖失去引用,先記下來,寫完再清掉不再被用到的
      const before = await repo.allProjectImageKeys(db)
      await repo.replaceState(db, incoming, user.id)
      const after = new Set(await repo.allProjectImageKeys(db))
      for (const key of before) {
        if (!after.has(key)) await deleteImage(env.IMAGES, key)
      }
      return json(await repo.getState(db))
    }
    throw methodNotAllowed(method)
  }

  // /api/images
  if (segments[0] === 'images') {
    if (segments.length === 1) {
      if (method === 'POST') return json(await putImage(env.IMAGES, request, user.id), 201)
      throw methodNotAllowed(method)
    }
    if (segments.length === 2) {
      if (method === 'GET') return getImage(env.IMAGES, segments[1])
      throw methodNotAllowed(method)
    }
  }

  // /api/projects
  if (segments[0] === 'projects') {
    if (segments.length === 1) {
      if (method === 'POST') {
        return json(await repo.createProject(db, buildProjectCreate(await readJsonObject(request)), user.id), 201)
      }
      throw methodNotAllowed(method)
    }
    if (segments.length === 2) {
      const id = segments[1]
      if (method === 'PATCH') {
        const columns = buildProjectPatch(await readJsonObject(request))
        // 換圖的話先記住舊的那張,更新成功後才清掉
        const replacingImage = Object.prototype.hasOwnProperty.call(columns, 'image_key')
        const previousKey = replacingImage ? await repo.getProjectImageKey(db, id) : null

        const updated = await repo.updateProject(db, id, columns)
        if (!updated) throw notFound(`找不到專案 ${id}`)

        if (previousKey && previousKey !== updated.imageKey) await deleteImage(env.IMAGES, previousKey)
        return json(updated)
      }
      if (method === 'DELETE') {
        const imageKey = await repo.getProjectImageKey(db, id)
        if (!(await repo.deleteProject(db, id))) throw notFound(`找不到專案 ${id}`)
        await deleteImage(env.IMAGES, imageKey)
        return new Response(null, { status: 204 })
      }
      throw methodNotAllowed(method)
    }
  }

  // /api/categories
  if (segments[0] === 'categories') {
    if (segments.length === 1) {
      if (method === 'POST') {
        return json(await repo.createCategory(db, buildCategoryCreate(await readJsonObject(request)), user.id), 201)
      }
      throw methodNotAllowed(method)
    }
    // /api/categories/order 必須排在 /:id 之前比對,否則會被當成 id 為 "order"
    if (segments.length === 2 && segments[1] === 'order') {
      if (method === 'PUT') {
        await repo.reorderCategories(db, parseIdList(await readJsonObject(request)))
        return json(await repo.getState(db))
      }
      throw methodNotAllowed(method)
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
      throw methodNotAllowed(method)
    }
  }

  throw notFound(`未知的 API 路徑 /${segments.join('/')}`)
}

// user 是已通過驗證的呼叫者;建立資料時用它的 id 記錄出處
export async function handleApi(request, env, user) {
  const { pathname } = new URL(request.url)
  const segments = pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean)

  try {
    return await route(request, env, segments, user)
  } catch (err) {
    if (err instanceof HttpError) return error(err.status, err.message)
    if (isForeignKeyError(err)) return error(400, 'categoryId 指向不存在的分類')
    console.error('API 未預期錯誤', err)
    return error(500, '伺服器錯誤')
  }
}
