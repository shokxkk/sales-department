// ─────────────────────────────────────────────────────────────────
//  Prisma Seed — Development data
//  Run with: npm run db:seed
// ─────────────────────────────────────────────────────────────────
import { PrismaClient, UserRole, CompanyStatus, AnalysisStatus, CallDirection, CallStatus, TariffPlan } from '@prisma/client'
import * as argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Tariffs ─────────────────────────────────────────────────────
  console.log('Creating tariffs...')

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
      features: ['dashboard', 'calls', 'audit', 'rating', 'reports', 'refusals', 'crm_discipline', 'excel_export', 'pdf_export', 'priority_support'],
      isActive: true,
    },
    update: {},
  })

  // ─── SUPER_ADMIN User creation omitted (handled by db:bootstrap) ───

  // Seeding criteria for both modes
  console.log('Creating checklist criteria...')
  const criteriaData = [
    // Block 1: Greeting
    { code: 'greeting_greeting', section: 'greeting_start', nameUz: 'Саломлашди', nameRu: 'Поприветствовал', maxScore: 5, sort: 1 },
    { code: 'greeting_introduction', section: 'greeting_start', nameUz: 'Ўзини таништирди', nameRu: 'Представился', maxScore: 5, sort: 2 },
    { code: 'greeting_company_name', section: 'greeting_start', nameUz: 'Компания номини айтди', nameRu: 'Назвал компанию', maxScore: 5, sort: 3 },
    { code: 'greeting_readiness', section: 'greeting_start', nameUz: 'Мижознинг тайёрлигини аниқлади', nameRu: 'Уточнил готовность клиента', maxScore: 5, sort: 4 },
    // Block 2: Need identification
    { code: 'need_questions', section: 'need_identification', nameUz: 'Саволлар берди', nameRu: 'Задавал вопросы', maxScore: 8, sort: 10 },
    { code: 'need_problem', section: 'need_identification', nameUz: 'Муаммони аниқлади', nameRu: 'Выявил проблему', maxScore: 6, sort: 11 },
    { code: 'need_budget', section: 'need_identification', nameUz: 'Бюджетни аниқлади', nameRu: 'Уточнил бюджет', maxScore: 6, sort: 12 },
    // Block 3: Presentation
    { code: 'presentation_relevance', section: 'presentation', nameUz: 'Эҳтиёжга мос презентация', nameRu: 'Prezentation pod potrebnost', maxScore: 8, sort: 20 },
    { code: 'presentation_benefits', section: 'presentation', nameUz: 'Фойдаларни тушунтирди', nameRu: 'Объяснил преимущества', maxScore: 7, sort: 21 },
    // Block 4: Objections
    { code: 'objection_listen', section: 'objection_handling', nameUz: 'Эътирозни тинглади', nameRu: 'Выслушал возражение', maxScore: 5, sort: 30 },
    { code: 'objection_handle', section: 'objection_handling', nameUz: 'Эътирозни ишлаб чиқди', nameRu: 'Обработал возражение', maxScore: 8, sort: 31 },
    // Block 5: Closing
    { code: 'closing_agreement', section: 'closing', nameUz: 'Келишув амалга оширилди', nameRu: 'Достигнута договоренность', maxScore: 8, sort: 40 },
    { code: 'closing_next_step', section: 'closing', nameUz: 'Кейинги қадам белгиланди', nameRu: 'Определен следующий шаг', maxScore: 7, sort: 41 },
    // Block 6: Speech & ethics
    { code: 'ethics_no_rudeness', section: 'speech_ethics', nameUz: 'Қўпол муомала йўқ', nameRu: 'Нет грубости', maxScore: 5, isCritical: true, criticalPenalty: 20, sort: 50 },
    { code: 'ethics_no_interruptions', section: 'speech_ethics', nameUz: 'Мижозни бўлмади', nameRu: 'Не перебивал', maxScore: 5, sort: 51 },
    { code: 'ethics_no_false_promises', section: 'speech_ethics', nameUz: 'Ёлғон ваъда йўқ', nameRu: 'Нет ложных обещаний', maxScore: 5, isCritical: true, criticalPenalty: 15, sort: 52 },
    { code: 'ethics_script_compliance', section: 'speech_ethics', nameUz: 'Скриптга амал қилди', nameRu: 'Соблюдал скрипт', maxScore: 6, sort: 53 },
  ]

  for (const c of criteriaData) {
    await prisma.auditCriterion.upsert({
      where: { code: c.code },
      create: {
        code: c.code,
        section: c.section,
        nameUz: c.nameUz,
        nameRu: c.nameRu,
        maxScore: c.maxScore,
        isCritical: c.isCritical || false,
        criticalPenalty: c.criticalPenalty || null,
        sort: c.sort,
        isActive: true,
      },
      update: { nameUz: c.nameUz, nameRu: c.nameRu, maxScore: c.maxScore, isCritical: c.isCritical || false },
    })
  }

  if (process.env.APP_MODE === 'production') {
    console.log('🌱 Production mode active: seeding real Marketing Markazi company.')

    const realCompany = await prisma.company.upsert({
      where: { slug: 'marketing-markazi' },
      create: {
        name: 'Marketing Markazi',
        slug: 'marketing-markazi',
        industry: 'Marketing',
        status: CompanyStatus.ACTIVE,
        timezone: 'Asia/Tashkent',
        language: 'uz',
        sendAiNotesToCrm: true,
        maxUsersAllowed: 10,
      },
      update: {},
    })

    // Subscription
    await prisma.subscription.upsert({
      where: { companyId: realCompany.id },
      create: {
        companyId: realCompany.id,
        tariffId: tariffMed.id,
        startDate: new Date(),
        isActive: true,
      },
      update: {},
    })

    // Balance
    await prisma.usageBalance.upsert({
      where: { companyId: realCompany.id },
      create: {
        companyId: realCompany.id,
        totalMinutes: 500,
        usedMinutes: 0,
        reservedMinutes: 0,
      },
      update: {},
    })

    // Managers will be synchronized strictly from amoCRM integration.

    // Refusal Reasons
    const realRefusalReasons = [
      { crmId: 'ref-real-001', name: 'Нарх қиммат' },
      { crmId: 'ref-real-002', name: 'Вақт йўқ' },
      { crmId: 'ref-real-003', name: 'Рақобатчи танлади' },
      { crmId: 'ref-real-004', name: 'Қарор қабул қила олмади' },
      { crmId: 'ref-real-005', name: 'Ҳозир керак эмас' },
    ]

    for (const r of realRefusalReasons) {
      await prisma.refusalReason.upsert({
        where: { companyId_crmId_crmProvider: { companyId: realCompany.id, crmId: r.crmId, crmProvider: 'amocrm' } },
        create: { companyId: realCompany.id, crmId: r.crmId, crmProvider: 'amocrm', name: r.name },
        update: {},
      })
    }

    console.log('✓ Seeding complete for real Company: Marketing Markazi.')
    return
  }

  // ─── Demo Company 1: Marketing Markazi ───────────────────────────
  console.log('Creating demo company...')

  const company1 = await prisma.company.upsert({
    where: { slug: 'marketing-markazi-demo' },
    create: {
      name: 'Marketing Markazi Demo',
      slug: 'marketing-markazi-demo',
      industry: 'Маркетинг',
      status: CompanyStatus.ACTIVE,
      timezone: 'Asia/Tashkent',
      language: 'uz',
      sendAiNotesToCrm: false,
      maxUsersAllowed: 10,
    },
    update: {},
  })

  // Subscription for company1
  await prisma.subscription.upsert({
    where: { companyId: company1.id },
    create: {
      companyId: company1.id,
      tariffId: tariffMed.id,
      startDate: new Date(),
      isActive: true,
    },
    update: {},
  })

  // Balance
  await prisma.usageBalance.upsert({
    where: { companyId: company1.id },
    create: {
      companyId: company1.id,
      totalMinutes: 300,
      usedMinutes: 47,
      reservedMinutes: 0,
    },
    update: {},
  })

  // ─── Company Users ─────────────────────────────────────────────────

  // Company Admin
  const adminPw = await argon2.hash('Admin123!')
  const companyAdmin = await prisma.user.upsert({
    where: { email: 'admin@demo.uz' },
    create: { email: 'admin@demo.uz', name: 'Администратор', passwordHash: adminPw },
    update: {},
  })
  await prisma.companyUser.upsert({
    where: { userId_companyId: { userId: companyAdmin.id, companyId: company1.id } },
    create: { userId: companyAdmin.id, companyId: company1.id, role: UserRole.COMPANY_ADMIN },
    update: {},
  })
  console.log(`  ✓ COMPANY_ADMIN: admin@demo.uz / Admin123!`)

  // Owner
  const ownerPw = await argon2.hash('Owner123!')
  const owner = await prisma.user.upsert({
    where: { email: 'owner@demo.uz' },
    create: { email: 'owner@demo.uz', name: 'Собственник', passwordHash: ownerPw },
    update: {},
  })
  await prisma.companyUser.upsert({
    where: { userId_companyId: { userId: owner.id, companyId: company1.id } },
    create: { userId: owner.id, companyId: company1.id, role: UserRole.OWNER },
    update: {},
  })

  // Sales Director (ROP)
  const ropPw = await argon2.hash('Rop123!')
  const rop = await prisma.user.upsert({
    where: { email: 'rop@demo.uz' },
    create: { email: 'rop@demo.uz', name: 'Руководитель отдела продаж', passwordHash: ropPw },
    update: {},
  })
  await prisma.companyUser.upsert({
    where: { userId_companyId: { userId: rop.id, companyId: company1.id } },
    create: { userId: rop.id, companyId: company1.id, role: UserRole.SALES_DIRECTOR },
    update: {},
  })
  console.log(`  ✓ SALES_DIRECTOR: rop@demo.uz / Rop123!`)

  // QC
  const qcPw = await argon2.hash('Qc123!')
  const qc = await prisma.user.upsert({
    where: { email: 'qc@demo.uz' },
    create: { email: 'qc@demo.uz', name: 'Контроль качества', passwordHash: qcPw },
    update: {},
  })
  await prisma.companyUser.upsert({
    where: { userId_companyId: { userId: qc.id, companyId: company1.id } },
    create: { userId: qc.id, companyId: company1.id, role: UserRole.QUALITY_CONTROL },
    update: {},
  })

  // ─── Managers (from "CRM") ─────────────────────────────────────────
  console.log('Creating managers...')

  const manager1 = await prisma.manager.upsert({
    where: { companyId_crmId_crmProvider: { companyId: company1.id, crmId: 'mgr-001', crmProvider: 'amocrm' } },
    create: {
      companyId: company1.id,
      crmId: 'mgr-001',
      crmProvider: 'amocrm',
      name: 'Азиза Каримова',
      email: 'aziza@demo.uz',
      phone: '+998901234567',
      position: 'Менежер',
      isActive: true,
    },
    update: {},
  })

  const manager2 = await prisma.manager.upsert({
    where: { companyId_crmId_crmProvider: { companyId: company1.id, crmId: 'mgr-002', crmProvider: 'amocrm' } },
    create: {
      companyId: company1.id,
      crmId: 'mgr-002',
      crmProvider: 'amocrm',
      name: 'Жамшид Тошматов',
      email: 'jamshid@demo.uz',
      phone: '+998901234568',
      position: 'Менежер',
      isActive: true,
    },
    update: {},
  })

  // ─── Pipeline ──────────────────────────────────────────────────────
  const pipeline = await prisma.pipeline.upsert({
    where: { companyId_crmId_crmProvider: { companyId: company1.id, crmId: 'pipe-001', crmProvider: 'amocrm' } },
    create: {
      companyId: company1.id,
      crmId: 'pipe-001',
      crmProvider: 'amocrm',
      name: 'Сотув воронкаси',
      isMain: true,
    },
    update: {},
  })

  const stageNames = [
    { crmId: 'st-001', name: 'Янги лид', sort: 10 },
    { crmId: 'st-002', name: 'Биринчи алоқа', sort: 20 },
    { crmId: 'st-003', name: 'Таклиф юборилди', sort: 30 },
    { crmId: 'st-004', name: 'Музокаралар', sort: 40 },
    { crmId: 'st-005', name: 'Муваффақиятли', sort: 100, isSuccess: true },
    { crmId: 'st-006', name: 'Рад этилди', sort: 110 },
  ]

  for (const s of stageNames) {
    await prisma.pipelineStage.upsert({
      where: { pipelineId_crmId: { pipelineId: pipeline.id, crmId: s.crmId } },
      create: {
        companyId: company1.id,
        pipelineId: pipeline.id,
        crmId: s.crmId,
        name: s.name,
        sort: s.sort,
        isSuccess: s.isSuccess || false,
      },
      update: {},
    })
  }

  // ─── Refusal Reasons ───────────────────────────────────────────────
  const refusalReasons = [
    { crmId: 'ref-001', name: 'Нарх қиммат' },
    { crmId: 'ref-002', name: 'Вақт йўқ' },
    { crmId: 'ref-003', name: 'Рақобатчи танлади' },
    { crmId: 'ref-004', name: 'Қарор қабул қила олмади' },
    { crmId: 'ref-005', name: 'Ҳозир керак эмас' },
  ]

  for (const r of refusalReasons) {
    await prisma.refusalReason.upsert({
      where: { companyId_crmId_crmProvider: { companyId: company1.id, crmId: r.crmId, crmProvider: 'amocrm' } },
      create: { companyId: company1.id, crmId: r.crmId, crmProvider: 'amocrm', name: r.name },
      update: {},
    })
  }

  // ─── Customers ─────────────────────────────────────────────────────
  const customers = [
    { crmId: 'cust-001', name: 'Бобур Рашидов', phone: '+998901111001' },
    { crmId: 'cust-002', name: 'Нилуфар Юсупова', phone: '+998901111002' },
    { crmId: 'cust-003', name: 'Санжар Мирзаев', phone: '+998901111003' },
    { crmId: 'cust-004', name: 'Дилноза Хасанова', phone: '+998901111004' },
    { crmId: 'cust-005', name: 'Шерзод Умаров', phone: '+998901111005' },
  ]

  const createdCustomers = []
  for (const c of customers) {
    const cust = await prisma.customer.upsert({
      where: { companyId_crmId_crmProvider: { companyId: company1.id, crmId: c.crmId, crmProvider: 'amocrm' } },
      create: { companyId: company1.id, crmId: c.crmId, crmProvider: 'amocrm', name: c.name, phone: c.phone },
      update: {},
    })
    createdCustomers.push(cust)
  }

  // ─── Sample Deals ──────────────────────────────────────────────────
  console.log('Creating sample deals...')

  const stages = await prisma.pipelineStage.findMany({
    where: { companyId: company1.id }
  })
  const stageMap = new Map(stages.map(s => [s.crmId, s.id]))

  const sampleDeals = [
    {
      crmId: 'deal-001',
      name: 'Бобур - Офис жиҳозлари',
      budget: 15000000,
      status: 'open',
      stageId: stageMap.get('st-002')!,
      managerId: manager1.id,
      customerId: createdCustomers[0].id,
    },
    {
      crmId: 'deal-002',
      name: 'Нилуфар - Консалтинг хизмати',
      budget: 8000000,
      status: 'won',
      stageId: stageMap.get('st-005')!,
      managerId: manager1.id,
      customerId: createdCustomers[1].id,
    },
    {
      crmId: 'deal-003',
      name: 'Санжар - IT Аутсорсинг',
      budget: 25000000,
      status: 'open',
      stageId: stageMap.get('st-003')!,
      managerId: manager2.id,
      customerId: createdCustomers[2].id,
    },
    {
      crmId: 'deal-004',
      name: 'Дилноза - Корпоратив веб-сайт',
      budget: 12000000,
      status: 'lost',
      stageId: stageMap.get('st-006')!,
      managerId: manager2.id,
      customerId: createdCustomers[3].id,
    }
  ]

  const createdDeals = []
  for (const d of sampleDeals) {
    const deal = await prisma.deal.upsert({
      where: { companyId_crmId_crmProvider: { companyId: company1.id, crmId: d.crmId, crmProvider: 'amocrm' } },
      create: {
        companyId: company1.id,
        crmId: d.crmId,
        crmProvider: 'amocrm',
        name: d.name,
        budget: d.budget,
        status: d.status,
        pipelineId: pipeline.id,
        stageId: d.stageId,
        managerId: d.managerId,
        customerId: d.customerId,
        crmCreatedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000),
        crmUpdatedAt: new Date(),
      },
      update: {},
    })
    createdDeals.push(deal)
  }

  // ─── Sample Calls ──────────────────────────────────────────────────
  console.log('Creating sample calls...')

  const sampleCalls = [
    {
      externalCallId: 'call-demo-001',
      direction: CallDirection.INBOUND,
      customerPhone: '+998901111001',
      managerExtension: '101',
      managerId: manager1.id,
      customerId: createdCustomers[0].id,
      dealId: createdDeals[0].id,
      durationSeconds: 285,
      talkDurationSeconds: 268,
      analysisStatus: AnalysisStatus.NOT_SELECTED,
      startedAt: new Date(Date.now() - 3 * 3600 * 1000),
    },
    {
      externalCallId: 'call-demo-002',
      direction: CallDirection.OUTBOUND,
      customerPhone: '+998901111002',
      managerExtension: '101',
      managerId: manager1.id,
      customerId: createdCustomers[1].id,
      dealId: createdDeals[1].id,
      durationSeconds: 412,
      talkDurationSeconds: 398,
      analysisStatus: AnalysisStatus.NOT_SELECTED,
      startedAt: new Date(Date.now() - 5 * 3600 * 1000),
    },
    {
      externalCallId: 'call-demo-003',
      direction: CallDirection.INBOUND,
      customerPhone: '+998901111003',
      managerExtension: '102',
      managerId: manager2.id,
      customerId: createdCustomers[2].id,
      dealId: createdDeals[2].id,
      durationSeconds: 167,
      talkDurationSeconds: 152,
      analysisStatus: AnalysisStatus.NOT_SELECTED,
      startedAt: new Date(Date.now() - 7 * 3600 * 1000),
    },
  ]

  for (const c of sampleCalls) {
    await prisma.call.upsert({
      where: {
        companyId_telephonyProvider_externalCallId: {
          companyId: company1.id,
          telephonyProvider: 'ONLINEPBX',
          externalCallId: c.externalCallId,
        },
      },
      create: {
        companyId: company1.id,
        telephonyProvider: 'ONLINEPBX',
        externalCallId: c.externalCallId,
        direction: c.direction,
        status: CallStatus.ANSWERED,
        customerPhone: c.customerPhone,
        managerExtension: c.managerExtension,
        managerId: c.managerId,
        customerId: c.customerId,
        dealId: c.dealId,
        startedAt: c.startedAt,
        answeredAt: c.startedAt,
        endedAt: new Date(c.startedAt.getTime() + c.durationSeconds * 1000),
        durationSeconds: c.durationSeconds,
        talkDurationSeconds: c.talkDurationSeconds,
        analysisStatus: c.analysisStatus,
      },
      update: {},
    })
  }

  console.log('\n✅ Seed completed!')
  console.log('\n📋 Test accounts:')
  console.log('  COMPANY_ADMIN: admin@demo.uz / Admin123!')
  console.log('  SALES_DIRECTOR: rop@demo.uz / Rop123!')
  console.log('\n🚀 Run: npm run dev')
  console.log('📊 Open: http://localhost:3000/login')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
