import { describe, it, expect, vi } from 'vitest'
import { createSyncQueue } from './syncQueue.js'

const noop = () => {}

describe('createSyncQueue', () => {
  it('依排入順序送出,不會因為某個請求比較慢就超車', async () => {
    const order = []
    const queue = createSyncQueue({ onError: noop })

    queue.enqueue(async () => { await new Promise((r) => setTimeout(r, 20)); order.push('慢的') })
    queue.enqueue(async () => { order.push('快的') })
    await queue.settled()

    expect(order).toEqual(['慢的', '快的'])
  })

  it('同一個 key 的連續 patch 合併成一次,後面的欄位蓋前面的', async () => {
    const sent = []
    const queue = createSyncQueue({ onError: noop })

    queue.enqueuePatch('p1', { a: 1 }, (patch) => sent.push(patch))
    queue.enqueuePatch('p1', { b: 2 }, (patch) => sent.push(patch))
    queue.enqueuePatch('p1', { a: 3 }, (patch) => sent.push(patch))
    await queue.settled()

    expect(sent).toEqual([{ a: 3, b: 2 }])
  })

  it('不同 key 各送各的', async () => {
    const sent = []
    const queue = createSyncQueue({ onError: noop })

    queue.enqueuePatch('p1', { a: 1 }, (patch) => sent.push(['p1', patch]))
    queue.enqueuePatch('p2', { a: 2 }, (patch) => sent.push(['p2', patch]))
    await queue.settled()

    expect(sent).toEqual([['p1', { a: 1 }], ['p2', { a: 2 }]])
  })

  it('enqueue 會先把待合併的 patch 推出去,維持 patch 在前、刪除在後', async () => {
    const order = []
    const queue = createSyncQueue({ onError: noop })

    queue.enqueuePatch('p1', { a: 1 }, () => order.push('patch'))
    queue.enqueue(() => order.push('delete'))
    await queue.settled()

    expect(order).toEqual(['patch', 'delete'])
  })

  it('等 delay 過了會自己送出,不必有人呼叫 flush', async () => {
    vi.useFakeTimers()
    try {
      const sent = []
      const queue = createSyncQueue({ onError: noop, delay: 250 })

      queue.enqueuePatch('p1', { a: 1 }, (patch) => sent.push(patch))
      expect(sent).toEqual([])

      await vi.advanceTimersByTimeAsync(250)
      expect(sent).toEqual([{ a: 1 }])
    } finally {
      vi.useRealTimers()
    }
  })

  it('delay 內持續更新會延後送出,拖曳過程不會一直打後端', async () => {
    vi.useFakeTimers()
    try {
      const sent = []
      const queue = createSyncQueue({ onError: noop, delay: 250 })

      for (let i = 0; i < 5; i++) {
        queue.enqueuePatch('p1', { a: i }, (patch) => sent.push(patch))
        await vi.advanceTimersByTimeAsync(100)
      }
      expect(sent).toEqual([])

      await vi.advanceTimersByTimeAsync(250)
      expect(sent).toEqual([{ a: 4 }])
    } finally {
      vi.useRealTimers()
    }
  })

  it('單一工作失敗交給 onError,後面的工作照跑', async () => {
    const errors = []
    const order = []
    const queue = createSyncQueue({ onError: (err) => errors.push(err.message) })

    queue.enqueue(() => { throw new Error('炸了') })
    queue.enqueue(() => order.push('下一個'))
    await queue.settled()

    expect(errors).toEqual(['炸了'])
    expect(order).toEqual(['下一個'])
  })
})
