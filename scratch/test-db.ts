import { PrismaClient } from '@prisma/client'

const testPasswords = ['k4password_dev', 'postgres', 'admin', 'root', '12345', '123456', 'password', '1234', '2024', '2025', '2026', 'masterkey', ''];
const testUsers = ['k4user', 'postgres'];

async function test() {
  for (const user of testUsers) {
    for (const pw of testPasswords) {
      const url = `postgresql://${user}:${pw}@localhost:5432/postgres?schema=public`;
      const client = new PrismaClient({ datasources: { db: { url } } });
      try {
        await client.$connect();
        console.log(`>>> SUCCESS! User: ${user}, Password: "${pw}"`);
        await client.$disconnect();
        return;
      } catch (e: any) {
        console.log(`Tested ${user}:${pw} -> ${e.message ? e.message.split('\n')[0] : e}`);
      } finally {
        await client.$disconnect();
      }
    }
  }
}

test();
