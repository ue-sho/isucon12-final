import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groupPresentRewards } from '../src/present-rewards.ts'

test('adds coins/materials by owner and item but preserves separate card instances and input rows', () => {
  const rows = [
    { user_id: 1, item_type: 1, item_id: 1, amount: 10 },
    { user_id: 1, item_type: 1, item_id: 1, amount: 20 },
    { user_id: 1, item_type: 2, item_id: 2, amount: 1 },
    { user_id: 1, item_type: 2, item_id: 2, amount: 1 },
    { user_id: 1, item_type: 3, item_id: 3, amount: 4 },
    { user_id: 1, item_type: 3, item_id: 3, amount: 5 },
    { user_id: 2, item_type: 3, item_id: 3, amount: 6 },
    { user_id: 1, item_type: 4, item_id: 3, amount: 7 },
  ] as any
  const before = JSON.stringify(rows)
  const rewards = groupPresentRewards(rows)
  assert.deepEqual(rewards.map(row => row.amount), [30, 1, 1, 9, 6, 7])
  assert.equal(JSON.stringify(rows), before)
  assert.deepEqual(groupPresentRewards([]), [])
})
