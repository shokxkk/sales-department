import { PrismaClient, TariffPlan } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Starting secure database bootstrap...')

  // 1. Load and validate parameters
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD
  const name = process.env.BOOTSTRAP_ADMIN_NAME || 'Marketing Markazi Admin'

  if (!email || !password) {
    console.error('❌ [Bootstrap Error] BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD must be specified.')
    process.exit(1)
  }

  const cleanEmail = email.toLowerCase().trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    console.error('❌ [Bootstrap Error] Invalid BOOTSTRAP_ADMIN_EMAIL format.')
    process.exit(1)
  }

  // Password strength check: min 8 chars, 1 digit, 1 special char, 1 letter
  if (
    password.length < 8 ||
    !/[a-zA-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[!@#$%^&*(),.?":{}|<>]/.test(password)
  ) {
    console.error(
      '❌ [Bootstrap Error] Password is too weak. It must be at least 8 characters long, contain letters, numbers, and at least one special character.'
    );
    process.exit(1)
  }

  // 2. Idempotent Tariff Seeding
  console.log('Seeding system tariffs...')

  const tariffMin = await prisma.tariff.upsert({
    where: { id: 'tariff-minimum' },
    create: {
      id: 'tariff-minimum',
      name: 'Minimum',
      plan: TariffPlan.MINIMUM,
      priceMonthly: 299000,
      maxUsers: 3,
      maxCrmIntegrations: 1,
      maxTelephony: 1,
      aiMinutesPerMonth: 100,
      features: ['dashboard', 'calls', 'audit', 'rating', 'reports'],
      isActive: true,
    },
    update: {},
  })

  const tariffMed = await prisma.tariff.upsert({
    where: { id: 'tariff-medium' },
    create: {
      id: 'tariff-medium',
      name: 'Medium',
      plan: TariffPlan.MEDIUM,
      priceMonthly: 599000,
      maxUsers: 10,
      maxCrmIntegrations: 1,
      maxTelephony: 1,
      aiMinutesPerMonth: 300,
      features: ['dashboard', 'calls', 'audit', 'rating', 'reports', 'refusals', 'crm_discipline', 'excel_export'],
      isActive: true,
    },
    update: {},
  })

  const tariffMax = await prisma.tariff.upsert({
    where: { id: 'tariff-maximum' },
    create: {
      id: 'tariff-maximum',
      name: 'Maximum',
      plan: TariffPlan.MAXIMUM,
      priceMonthly: 999000,
      maxUsers: 50,
      maxCrmIntegrations: 2,
      maxTelephony: 3,
      aiMinutesPerMonth: 1000,
      features: [
        'dashboard',
        'calls',
        'audit',
        'rating',
        'reports',
        'refusals',
        'crm_discipline',
        'excel_export',
        'pdf_export',
        'priority_support',
      ],
      isActive: true,
    },
    update: {},
  })

  console.log('✓ System tariffs seeded successfully.')

  // 3. Check if SUPER_ADMIN already exists
  // Global SUPER_ADMIN has no company memberships (companyUsers relation is empty)
  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: cleanEmail },
        { companyUsers: { none: {} } },
      ],
    },
  })

  if (existingSuperAdmin) {
    console.log('✓ [Bootstrap Info] SUPER_ADMIN already exists. Skipping administrator creation.')
    process.exit(0)
  }

  // 4. Create SUPER_ADMIN
  console.log('Creating new SUPER_ADMIN...')
  const passwordHash = await argon2.hash(password)

  const newAdmin = await prisma.user.create({
    data: {
      email: cleanEmail,
      name,
      passwordHash,
      isActive: true,
      passwordChangeRequired: true, // Enforce password change upon next login
    },
  })

  // 5. Log bootstrap activity securely
  await prisma.activityLog.create({
    data: {
      companyId: null,
      userId: newAdmin.id,
      action: 'BOOTSTRAP_SUPER_ADMIN',
      entityType: 'User',
      entityId: newAdmin.id,
      meta: {
        email: cleanEmail,
        name,
        initiatedAt: new Date().toISOString(),
      },
    },
  })

  console.log(`🎉 [Bootstrap Success] SUPER_ADMIN created securely: ${cleanEmail}`)
  console.log('⚠️  Password change is required at next login.')
}

main()
  .catch((err) => {
    console.error('❌ [Bootstrap Fatal] Critical bootstrap execution failure:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
