// Run only against an idle deployed test server; the next benchmark initializes its data.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const mysql = require('mysql2/promise')
const { randomUUID } = require('node:crypto')

test('present pagination boundaries, grouped grants and concurrent receipt preserve balances', {
  skip: process.env.ISUCON_INTEGRATION_TEST !== '1',
}, async () => {
  const db = await mysql.createConnection({
    host: process.env.ISUCON_DB_HOST || '127.0.0.1', port: Number(process.env.ISUCON_DB_PORT || 3306),
    user: process.env.ISUCON_DB_USER || 'isucon', password: process.env.ISUCON_DB_PASSWORD || 'isucon',
    database: process.env.ISUCON_DB_NAME || 'isucon',
  })
  let userId
  try {
    const [[master]] = await db.query('SELECT master_version FROM version_masters WHERE status=1')
    const headers = { 'Content-Type': 'application/json', 'x-master-version': master.master_version,
      'x-isu-date': '2022-08-26T00:00:00Z' }
    const base = process.env.ISUCON_TEST_URL || 'http://127.0.0.1:8080'
    async function request(path, body, expected = 200) {
      const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers,
        body: body ? JSON.stringify(body) : undefined })
      const data = await response.json()
      assert.equal(response.status, expected, JSON.stringify(data))
      return data
    }
    const viewerId = randomUUID()
    const user = await request('/user', { viewerId, platformType: 1 })
    userId = user.userId
    headers['x-session'] = user.sessionId
    const idBase = -Date.now() * 100
    const now = 1661472000
    async function fill(count) {
      await db.query('DELETE FROM user_presents WHERE user_id=?', [userId])
      const rows = Array.from({ length: count }, (_, i) =>
        [idBase + i, userId, now, 1, 1, 1, 'integration test', now + (i % 3), now])
      if (rows.length) await db.query(
        'INSERT INTO user_presents(id,user_id,sent_at,item_type,item_id,amount,present_message,created_at,updated_at) VALUES ?', [rows])
      return rows.sort((a, b) => b[7] - a[7] || a[0] - b[0]).map(row => row[0])
    }
    for (const count of [0, 99, 100, 101, 200, 201]) {
      const ids = await fill(count)
      for (let page = 1; page <= 3; page++) {
        const data = await request(`/user/${userId}/present/index/${page}`)
        const offset = (page - 1) * 100
        assert.deepEqual(data.presents.map(p => p.id), ids.slice(offset, offset + 100))
        assert.equal(data.isNext, count > offset + 100)
      }
    }
    const ids = await fill(7)
    // Three coin gifts, two separate cards and two gifts of the same material.
    const [[material]] = await db.query('SELECT id,item_type FROM item_masters WHERE item_type IN (3,4) LIMIT 1')
    await db.query('UPDATE user_presents SET item_type=2,item_id=2 WHERE id IN (?)', [ids.slice(3, 5)])
    await db.query('UPDATE user_presents SET item_type=?,item_id=?,amount=4 WHERE id IN (?)',
      [material.item_type, material.id, ids.slice(5)])
    const [[before]] = await db.query('SELECT isu_coin FROM users WHERE id=?', [userId])
    const [[cardsBefore]] = await db.query('SELECT COUNT(*) n FROM user_cards WHERE user_id=?', [userId])
    const [[itemBefore]] = await db.query('SELECT COALESCE(SUM(amount),0) amount FROM user_items WHERE user_id=? AND item_id=?',
      [userId, material.id])
    const received = await Promise.all([1, 2].map(() => request(`/user/${userId}/present/receive`, { viewerId, presentIds: ids })))
    assert.equal(received.reduce((n, r) => n + r.updatedResources.userPresents.length, 0), 7)
    const [[after]] = await db.query('SELECT isu_coin FROM users WHERE id=?', [userId])
    const [[cardsAfter]] = await db.query('SELECT COUNT(*) n FROM user_cards WHERE user_id=?', [userId])
    const [[itemAfter]] = await db.query('SELECT COALESCE(SUM(amount),0) amount FROM user_items WHERE user_id=? AND item_id=?',
      [userId, material.id])
    assert.equal(after.isu_coin - before.isu_coin, 3)
    assert.equal(cardsAfter.n - cardsBefore.n, 2)
    assert.equal(Number(itemAfter.amount) - Number(itemBefore.amount), 8)
    assert.equal((await request(`/user/${userId}/present/index/1`)).presents.length, 0)

    // A failure after a valid coin grant must roll back both balances and gift deletion.
    const badIds = await fill(2)
    await db.query('UPDATE user_presents SET item_type=99 WHERE id=?', [badIds[1]])
    await request(`/user/${userId}/present/receive`, { viewerId, presentIds: badIds }, 500)
    const [[remaining]] = await db.query(
      'SELECT COUNT(*) n FROM user_presents WHERE user_id=? AND deleted_at IS NULL', [userId])
    const [[afterRollback]] = await db.query('SELECT isu_coin FROM users WHERE id=?', [userId])
    assert.equal(remaining.n, 2)
    assert.equal(afterRollback.isu_coin, after.isu_coin)

    // Two requests racing to consume one token must not both pass token validation.
    const gacha = await request(`/user/${userId}/gacha/index`)
    assert.ok(gacha.gachas.length)
    await db.query('UPDATE users SET isu_coin=0 WHERE id=?', [userId])
    const statuses = await Promise.all([1, 2].map(async () => {
      const res = await fetch(`${base}/user/${userId}/gacha/draw/${gacha.gachas[0].gacha.id}/1`, {
        method: 'POST', headers, body: JSON.stringify({ viewerId, oneTimeToken: gacha.oneTimeToken }),
      })
      await res.arrayBuffer()
      return res.status
    }))
    assert.deepEqual(statuses.sort(), [400, 409])
  } finally {
    if (userId) await db.query('DELETE FROM user_presents WHERE user_id=?', [userId])
    await db.end()
  }
})
