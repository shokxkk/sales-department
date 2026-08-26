import { PrismaClient } from '@prisma/client'

async function setup() {
  const adminUrl = 'postgresql://postgres@localhost:5432/postgres?schema=public'
  const prismaAdmin = new PrismaClient({ datasources: { db: { url: adminUrl } } })
  
  try {
    console.log('Re-creating k4_aicontroller with UTF8 encoding using template0...')
    await prismaAdmin.$connect()
    
    // Terminate existing connections to k4_aicontroller
    await prismaAdmin.$executeRawUnsafe(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'k4_aicontroller'
        AND pid <> pg_backend_pid();
    `)
    
    await prismaAdmin.$executeRawUnsafe(`DROP DATABASE IF EXISTS k4_aicontroller;`)
    await prismaAdmin.$executeRawUnsafe(`CREATE DATABASE k4_aicontroller WITH OWNER = k4user ENCODING = 'UTF8' TEMPLATE = template0;`)
    await prismaAdmin.$executeRawUnsafe(`GRANT ALL PRIVILEGES ON DATABASE k4_aicontroller TO k4user;`)
    
    console.log('Database k4_aicontroller recreated with UTF8 successfully!')
  } catch (err) {
    console.error('Setup error:', err)
  } finally {
    await prismaAdmin.$disconnect()
  }
}

setup()
