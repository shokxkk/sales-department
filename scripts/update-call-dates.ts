import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateCallDatesToToday() {
  console.log('🔄 Updating recent call dates to today (25.08.2026)...')

  // Find all calls
  const calls = await prisma.call.findMany({
    orderBy: { startedAt: 'desc' },
    take: 100,
  })

  console.log(`Found ${calls.length} calls to update dates...`)

  const now = new Date() // Today: 25.08.2026

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i]
    // Spread calls across today and yesterday: i * 25 minutes ago
    const newStartedAt = new Date(now.getTime() - i * 25 * 60 * 1000)
    const newEndedAt = new Date(newStartedAt.getTime() + (call.durationSeconds || 120) * 1000)

    await prisma.call.update({
      where: { id: call.id },
      data: {
        startedAt: newStartedAt,
        answeredAt: newStartedAt,
        endedAt: newEndedAt,
      },
    })
  }

  console.log('✅ Call dates updated to today successfully!')
}

updateCallDatesToToday()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
