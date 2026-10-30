// Run against the deployed app after the benchmark, never during it:
// ISUCON_INTEGRATION_TEST=1 node --test test/login-concurrency.cjs
const { test } = require('node:test')
const assert = require('node:assert/strict')
const mysql = require('mysql2/promise')
const { randomUUID } = require('node:crypto')

test('parallel logins keep exactly one session per user and invalidate old sessions', {
  skip: process.env.ISUCON_INTEGRATION_TEST !== '1',
}, async () => {
  const db = await mysql.createConnection({
    host: process.env.ISUCON_DB_HOST || '127.0.0.1',
    port: Number(process.env.ISUCON_DB_PORT || 3306),
    user: process.env.ISUCON_DB_USER || 'isucon',
    password: process.env.ISUCON_DB_PASSWORD || 'isucon',
    database: process.env.ISUCON_DB_NAME || 'isucon',
  })
  try {
    const [[master]] = await db.query('SELECT master_version FROM version_masters WHERE status=1')
    const headers = { 'Content-Type': 'application/json', 'x-master-version': master.master_version,
      'x-isu-date': '2022-08-26T00:00:00Z' }
    const base = process.env.ISUCON_TEST_URL || 'http://127.0.0.1:8080'
    async function post(path, body) {
      const res = await fetch(base + path, { method: 'POST', headers, body: JSON.stringify(body) })
      const data = await res.json()
      assert.equal(res.status, 200, JSON.stringify(data))
      return data
    }
    const users = []
    for (let i = 0; i < 4; i++) {
      const viewerId = randomUUID()
      const user = await post('/user', { viewerId, platformType: 1 })
      users.push({ userId: user.userId, viewerId, oldSession: user.sessionId })
    }
    await Promise.all(Array.from({ length: 40 }, (_, i) => post('/login', users[i % users.length])))
    for (const user of users) {
      const [[count]] = await db.query(
        'SELECT COUNT(*) AS n FROM user_sessions WHERE user_id=? AND deleted_at IS NULL', [user.userId])
      assert.equal(count.n, 1)
      const response = await fetch(`${base}/user/${user.userId}/home`, {
        headers: { ...headers, 'x-session': user.oldSession },
      })
      assert.equal(response.status, 401)
    }
  } finally {
    await db.end()
  }
})
