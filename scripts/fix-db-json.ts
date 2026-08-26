import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

function cleanJson(val: any): any {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      return Array.isArray(parsed) ? parsed : typeof parsed === 'string' ? [parsed] : parsed
    } catch {
      return val ? [val] : []
    }
  }
  return val || []
}

async function fixAllAudits() {
  const audits = await p.audit.findMany()
  console.log(`Found ${audits.length} total audits. Inspecting and cleaning JSON fields...`)

  for (const a of audits) {
    const strengths = cleanJson(a.strengthsJson)
    const mistakes = cleanJson(a.mistakesJson)
    const recs = cleanJson(a.recommendationsJson)
    const needs = cleanJson(a.customerNeedsJson)
    const objections = cleanJson(a.objectionsJson)
    const filler = cleanJson(a.fillerWordsJson)
    const quotes = cleanJson(a.importantQuotesJson)

    await p.audit.update({
      where: { id: a.id },
      data: {
        strengthsJson: strengths,
        mistakesJson: mistakes,
        recommendationsJson: recs,
        customerNeedsJson: needs,
        objectionsJson: objections,
        fillerWordsJson: filler,
        importantQuotesJson: quotes,
      }
    })
  }

  console.log('Successfully cleaned all double-encoded Json fields in Audit records!')
  await p.$disconnect()
}

fixAllAudits().catch(console.error)
