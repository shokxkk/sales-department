import { PrismaClient } from '@prisma/client'

const supabaseDirectUrl = "postgresql://postgres.stbnsecleuhhqkfucptj:HiEm%5ExdU2_4w%25P%3D@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
const supabasePoolerUrl = "postgresql://postgres.stbnsecleuhhqkfucptj:HiEm%5ExdU2_4w%25P%3D@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

async function testConnection(url: string, name: string) {
  console.log(`Testing ${name}...`)
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  })
  try {
    const userCount = await prisma.user.count()
    console.log(`✅ [${name}] Success! Total users in DB:`, userCount)
    const adminUser = await prisma.user.findFirst({ where: { email: 'admin@demo.uz' } })
    console.log(`✅ [${name}] Found admin@demo.uz:`, adminUser?.email)
  } catch (err: any) {
    console.error(`❌ [${name}] Failed:`, err.message)
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  await testConnection(supabaseDirectUrl, "Direct Connection (Port 5432)")
  await testConnection(supabasePoolerUrl, "Pooler Connection (Port 6543)")
}

main()
