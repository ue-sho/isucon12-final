const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const mysql = require('mysql2/promise')

test('initial present restore resets every column, inserts missing rows and is repeatable', {
  skip: process.env.ISUCON_INTEGRATION_TEST !== '1',
}, async () => {
  const db = await mysql.createConnection({
    host: process.env.ISUCON_DB_HOST || '127.0.0.1', port: Number(process.env.ISUCON_DB_PORT || 3306),
    user: process.env.ISUCON_DB_USER || 'isucon', password: process.env.ISUCON_DB_PASSWORD || 'isucon',
    database: process.env.ISUCON_DB_NAME || 'isucon', multipleStatements: true,
  })
  try {
    await db.query('CREATE TEMPORARY TABLE restore_fixture LIKE user_presents')
    const original = [
      [1, 10, 100, 1, 1, 50, 'original', 100, 100, null],
      [3, 30, 300, 3, 21, 3, 'missing', 300, 300, null],
    ]
    const unrelated = [2, 20, 200, 1, 1, 20, 'leave unchanged', 200, 210, 210]
    await db.query('INSERT INTO restore_fixture VALUES ?', [
      [[1, 99, 999, 4, 999, 0, 'modified', 999, 999, 999], unrelated],
    ])
    const sql = fs.readFileSync(path.join(__dirname, '../../sql/5_restore_user_presents.sql'), 'utf8')
      .replace(/\buser_presents\b/g, 'restore_fixture')
      .replace(/LOAD DATA LOCAL INFILE[\s\S]*?IGNORE 1 LINES;/,
        () => db.format('INSERT INTO initial_user_presents VALUES ?;', [original]))
    for (let run = 0; run < 2; run++) {
      await db.query(sql)
      const [rows] = await db.query('SELECT * FROM restore_fixture ORDER BY id')
      assert.deepEqual(rows.map(row => Object.values(row)), [original[0], unrelated, original[1]])
    }
  } finally {
    await db.end()
  }
})
