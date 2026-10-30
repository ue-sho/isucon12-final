import { test } from 'node:test'
import assert from 'node:assert/strict'
import { useGenerateId } from '../src/id-generator.ts'

test('parallel callers, separate processes/pools, restart and initialize never reuse a reserved ID', async () => {
  let high = 100000000000
  let calls = 0
  function pool() {
    return { query: async () => {
      calls++
      await new Promise(resolve => setTimeout(resolve, 1))
      high += 512
      return [{ insertId: high, affectedRows: 1 }, []]
    } } as any
  }
  const db = pool()
  const a = useGenerateId(db)
  assert.equal(a, useGenerateId(db))
  const b = useGenerateId(pool())
  const first = await Promise.all(Array.from({ length: 4000 }, (_, i) => (i % 2 ? a : b).generateId()))
  assert.equal(new Set(first).size, 4000)
  assert.ok(first.every(id => id > 100000000000 && Number.isSafeInteger(id)))
  assert.equal(calls, 8)
  await a.resetGenerateId()
  const reset = await a.generateId()
  const restart = await useGenerateId(pool()).generateId()
  assert.ok(!first.includes(reset) && !first.includes(restart) && reset !== restart)
})

test('reservation failure is propagated and a later call can recover', async () => {
  let fail = true
  const a = useGenerateId({ query: async () => {
    if (fail) throw new Error('database unavailable')
    return [{ insertId: 512, affectedRows: 1 }, []]
  } } as any)
  await assert.rejects(a.generateId(), /database unavailable/)
  fail = false
  assert.equal(await a.generateId(), 1)
})

test('unsafe bounds and missing generator rows are rejected', async () => {
  for (const result of [{ insertId: Number.MAX_SAFE_INTEGER + 1, affectedRows: 1 }, { insertId: 0, affectedRows: 0 }]) {
    const a = useGenerateId({ query: async () => [result, []] } as any)
    await assert.rejects(a.generateId(), /invalid ID range/)
  }
})
