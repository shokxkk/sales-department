import { PrismaClient } from '@prisma/client'
import { verifyPassword } from '../src/lib/auth/password'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.stbnsecleuhhqkfucptj:HiEm%5ExdU2_4w%25P%3D@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    }
  }
})

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@demo.uz' } })
  console.log('User found in DB:', user?.email)
  console.log('Stored passwordHash:', user?.passwordHash)

  if (user) {
    const isValid = await verifyPassword(user.passwordHash, 'Admin123!')
    console.log('verifyPassword result:', isValid)
  }
}

main().finally(() => prisma.$disconnect())
