// ─────────────────────────────────────────────────────────────────
//  Prisma Client singleton — prevents connection pool exhaustion
//  in Next.js dev (HMR creates new instances on each hot reload)
// ─────────────────────────────────────────────────────────────────
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
