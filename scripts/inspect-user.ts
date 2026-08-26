import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.stbnsecleuhhqkfucptj:HiEm%5ExdU2_4w%25P%3D@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    }
  }
})

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'admin@demo.uz' },
    include: {
      companyUsers: {
        where: { isActive: true },
        include: {
          company: { select: { id: true, name: true, status: true } }
        }
      }
    }
  })
  console.log('Inspect user:', JSON.stringify(user, null, 2))
}

main().finally(() => prisma.$disconnect())
