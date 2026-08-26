// ─────────────────────────────────────────────────────────────────
//  Redis singleton for BullMQ and caching
// ─────────────────────────────────────────────────────────────────
import IORedis from 'ioredis'

let redis: IORedis | null = null

export function getRedis(): IORedis {
  if (!redis) {
    const url = process.env.REDIS_URL
    if (!url) {
      throw new Error('REDIS_URL environment variable is not set')
    }

    redis = new IORedis(url, {
      maxRetriesPerRequest: null, // Required by BullMQ
      enableReadyCheck: false,
      lazyConnect: false,
    })

    redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message)
    })

    redis.on('connect', () => {
      console.log('[Redis] Connected')
    })
  }

  return redis
}

export default getRedis
