import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.stbnsecleuhhqkfucptj:HiEm%5ExdU2_4w%25P%3D@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
    }
  }
})

async function main() {
  console.log('Updating user password hashes to bcrypt...')

  const adminPw = await bcrypt.hash('Admin123!', 10)
  const ropPw = await bcrypt.hash('Rop123!', 10)
  const ownerPw = await bcrypt.hash('Owner123!', 10)
  const superAdminPw = await bcrypt.hash('AdminPassword2026!', 10)

  const usersToUpdate = [
    { email: 'admin@demo.uz', hash: adminPw, name: 'Администратор' },
    { email: 'rop@demo.uz', hash: ropPw, name: 'Руководитель отдела продаж' },
    { email: 'owner@demo.uz', hash: ownerPw, name: 'Собственник' },
    { email: 'admin@marketingmarkazi.uz', hash: superAdminPw, name: 'Marketing Markazi Admin' },
  ]

  for (const u of usersToUpdate) {
    const res = await prisma.user.upsert({
      where: { email: u.email },
      create: { email: u.email, name: u.name, passwordHash: u.hash },
      update: { passwordHash: u.hash, isActive: true },
    })
    console.log(`✅ Updated ${u.email} -> hash starts with:`, res.passwordHash.substring(0, 10))
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
