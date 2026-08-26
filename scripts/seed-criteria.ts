import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

// Checklist from the photo: Kirish qo'ng'iroqlar baholash
const NEW_CRITERIA = [
  // ── TANISHUV ──────────────────────────────────────────
  {
    code: 'intro_callback_speed',
    section: 'Tanishuv',
    nameUz: 'Arizaga 30 soniya ichida qayta qo\'ng\'iroq qildi',
    nameRu: 'Перезвонил по заявке в течение 30 секунд',
    maxScore: 1,
    sort: 1,
    isCritical: false,
  },
  {
    code: 'intro_self_introduction',
    section: 'Tanishuv',
    nameUz: 'O\'zini tanishtirdi (kompaniya nomi, F.I.Sh, lavozimi)',
    nameRu: 'Представился (название компании, ФИО, должность)',
    maxScore: 1,
    sort: 2,
    isCritical: true,
  },
  {
    code: 'intro_customer_name',
    section: 'Tanishuv',
    nameUz: 'Suhbatning 20-soniyasidan so\'ng mijozning ismini so\'radi',
    nameRu: 'После 20 секунды разговора спросил имя клиента',
    maxScore: 1,
    sort: 3,
    isCritical: false,
  },

  // ── EHTIYOJNI ANIQLASH ─────────────────────────────────
  {
    code: 'need_questions',
    section: 'Ehtiyojni aniqlash',
    nameUz: 'Mijozni ehtiyojini aniqlovchi savollar berdi',
    nameRu: 'Задал вопросы для выявления потребности клиента',
    maxScore: 1,
    sort: 4,
    isCritical: true,
  },
  {
    code: 'need_purpose',
    section: 'Ehtiyojni aniqlash',
    nameUz: 'Mijozni maqsadini aniqladi',
    nameRu: 'Выявил цель клиента',
    maxScore: 1,
    sort: 5,
    isCritical: false,
  },
  {
    code: 'need_active_listening',
    section: 'Ehtiyojni aniqlash',
    nameUz: 'Mijozni muammolarini aktiv tinglovchi sifatida eshitdi (aha, albatta, to\'g\'ri)',
    nameRu: 'Активно слушал проблемы клиента (ага, конечно, правильно)',
    maxScore: 1,
    sort: 6,
    isCritical: false,
  },

  // ── TAQDIMOT ───────────────────────────────────────────
  {
    code: 'present_features',
    section: 'Taqdimot',
    nameUz: 'Mahsulot yoki xizmat haqida tushuntirdi (Xususiyat)',
    nameRu: 'Рассказал о продукте/услуге (Характеристика)',
    maxScore: 1,
    sort: 7,
    isCritical: false,
  },
  {
    code: 'present_advantages',
    section: 'Taqdimot',
    nameUz: 'Boshqalardan qanday afzalliklari borligini aytib berdi (Afzallik)',
    nameRu: 'Объяснил конкурентные преимущества (Преимущество)',
    maxScore: 1,
    sort: 8,
    isCritical: false,
  },
  {
    code: 'present_benefit',
    section: 'Taqdimot',
    nameUz: 'Maqsad va foyda texnikalarini qo\'lladi (Foyda)',
    nameRu: 'Применил технику цель и выгода (Польза)',
    maxScore: 1,
    sort: 9,
    isCritical: false,
  },

  // ── E'TIROZLAR BILAN ISHLASH ────────────────────────────
  {
    code: 'objection_calm',
    section: 'E\'tirozlar bilan ishlash',
    nameUz: 'Hotirjamlik bilan e\'tirozlar bilan ishladi',
    nameRu: 'Спокойно работал с возражениями',
    maxScore: 1,
    sort: 10,
    isCritical: false,
  },
  {
    code: 'objection_justified',
    section: 'E\'tirozlar bilan ishlash',
    nameUz: 'E\'tirozga javobni asoslab berdi',
    nameRu: 'Обосновал ответ на возражение',
    maxScore: 1,
    sort: 11,
    isCritical: false,
  },

  // ── KELISHUV ───────────────────────────────────────────
  {
    code: 'close_next_meeting',
    section: 'Kelishuv',
    nameUz: 'Keyingi uchrashuv vaqtini kelishib oldi',
    nameRu: 'Договорился о времени следующей встречи',
    maxScore: 1,
    sort: 12,
    isCritical: true,
  },
  {
    code: 'close_telegram_invite',
    section: 'Kelishuv',
    nameUz: 'Mijozning Telegramiga taklif yubordi',
    nameRu: 'Отправил приглашение в Telegram клиента',
    maxScore: 1,
    sort: 13,
    isCritical: false,
  },
  {
    code: 'close_followup_24h',
    section: 'Kelishuv',
    nameUz: 'Sotuvchi 24 soat ichida mijoz bilan qayta aloqaga chiqdi',
    nameRu: 'Продавец связался с клиентом повторно в течение 24 часов',
    maxScore: 1,
    sort: 14,
    isCritical: false,
  },
]

async function main() {
  // Deactivate all old criteria
  const deactivated = await p.auditCriterion.updateMany({
    data: { isActive: false },
  })
  console.log('Deactivated old criteria:', deactivated.count)

  // Upsert new criteria
  let created = 0
  let updated = 0

  for (const c of NEW_CRITERIA) {
    const existing = await p.auditCriterion.findFirst({ where: { code: c.code } })
    if (existing) {
      await p.auditCriterion.update({
        where: { id: existing.id },
        data: { ...c, isActive: true },
      })
      updated++
    } else {
      await p.auditCriterion.create({
        data: { ...c, isActive: true, weight: 1.0 },
      })
      created++
    }
  }

  console.log(`Created: ${created}, Updated: ${updated}`)
  console.log('Total active criteria:', NEW_CRITERIA.length)
  console.log('Max total score:', NEW_CRITERIA.reduce((s, c) => s + c.maxScore, 0))
  console.log('\nScoring guide:')
  console.log('  3-5:  Savdoni oshmaaeligi sababi sizda sotuvchi yo\'q')
  console.log('  6-8:  Sotuvchingiz qoniqarli, lekin texnikalarni bilmaydi')
  console.log('  9-11: Sotuvchingiz yaxshi, bilimni oshiring')
  console.log('  12-14: Sotuvchingiz professional — qo\'yib yubormang!')

  process.exit(0)
}

main().catch(e => { console.error(e.message); process.exit(1) })
