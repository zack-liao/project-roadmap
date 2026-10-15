// 把本地的樂觀更新依序送到後端。
// 兩個責任:(1) 保證送出順序,避免 DELETE 搶在 PATCH 前面;
// (2) 合併同一個對象的連續 patch,拖曳一根 bar 會觸發幾十次 updateProject,
//     不合併就等於對 D1 連打幾十次寫入。

export function createSyncQueue({ onError, delay = 250 }) {
  let chain = Promise.resolve()
  const pending = new Map()
  let timer = null

  function run(task) {
    chain = chain.then(task).catch(onError)
    return chain
  }

  // 把等待合併的 patch 全部推進佇列
  function flush() {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    for (const { send, patch } of pending.values()) run(() => send(patch))
    pending.clear()
    return chain
  }

  function schedule() {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(flush, delay)
  }

  return {
    // 建立 / 刪除 / 重排這類不可合併的操作。先 flush 待送的 patch 再排隊,維持先後順序。
    enqueue(task) {
      flush()
      return run(task)
    },

    // 同一個 key 的連續更新只會送出合併後的最後一份
    enqueuePatch(key, patch, send) {
      const prev = pending.get(key)
      pending.set(key, { patch: { ...(prev?.patch ?? {}), ...patch }, send })
      schedule()
    },

    flush,

    // 測試與匯入前用:等到目前排隊的工作全部結束
    settled() {
      return flush()
    },
  }
}
