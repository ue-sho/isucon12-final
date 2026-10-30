import type mysql from 'mysql2/promise'
import type { OkPacket } from 'mysql2/promise'

const generators = new WeakMap<mysql.Pool, ReturnType<typeof createGenerator>>()

function createGenerator(db: mysql.Pool) {
  const batchSize = 512
  let next = 0
  let end = -1
  let pending: Promise<void> | undefined

  async function reserve(): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      try {
        // insertId comes from this UPDATE's OK packet, so no second connection is used.
        const [result] = await db.query<OkPacket>(
          `UPDATE id_generator SET id=LAST_INSERT_ID(GREATEST(id,100000000000)+${batchSize})`
        )
        if (result.affectedRows !== 1 || !Number.isSafeInteger(result.insertId) || result.insertId < batchSize) {
          throw new Error('invalid ID range reservation')
        }
        end = result.insertId
        next = end - batchSize + 1
        return
      } catch (error: any) {
        if (error.errno !== 1213 || attempt >= 4) throw error
      }
    }
  }

  async function generateId(): Promise<number> {
    for (;;) {
      if (next <= end) return next++
      if (!pending) {
        pending = reserve().finally(() => { pending = undefined })
      }
      await pending
    }
  }

  async function resetGenerateId(): Promise<void> {
    await pending
    next = 0
    end = -1
  }

  return { generateId, resetGenerateId }
}

// main and admin share the same allocator when they use the same pool.
export function useGenerateId(db: mysql.Pool) {
  let generator = generators.get(db)
  if (!generator) {
    generator = createGenerator(db)
    generators.set(db, generator)
  }
  return generator
}
