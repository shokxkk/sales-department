// ─────────────────────────────────────────────────────────────────
//  amoCRM API Client & High-Performance Sync Engine
//  Supports: Direct Long-Lived Token & OAuth2 + Parallel Batch Sync
// ─────────────────────────────────────────────────────────────────
import { prisma } from '@/lib/prisma'
import { encrypt, decrypt, encryptJson, decryptJson } from '@/lib/encryption'
import { IntegrationStatus } from '@prisma/client'

const AMOCRM_CLIENT_ID = process.env.AMOCRM_CLIENT_ID || ''
const AMOCRM_CLIENT_SECRET = process.env.AMOCRM_CLIENT_SECRET || ''
const AMOCRM_REDIRECT_URI = process.env.AMOCRM_REDIRECT_URI || ''

export interface AmoCRMConfig {
  domain: string         // e.g. "mycompany.amocrm.ru"
  accountId?: number
  accountName?: string
  authType?: 'token' | 'oauth'
}

export interface AmoCRMTokens {
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
}

export interface SyncOptions {
  type?: 'fast' | 'full' | 'structure' | 'custom'
  sinceDays?: number
  dateFrom?: string | number | Date
  dateTo?: string | number | Date
  managerId?: string          // Database UUID of manager
  managerCrmId?: string | number // amoCRM user ID
}

export interface SyncCallsParamOptions {
  sinceTimestamp?: number
  toTimestamp?: number
  managerCrmId?: string | number
  maxPages?: number
}

export interface SyncResult {
  leads: number
  contacts: number
  managers: number
  pipelines: number
  calls: number
  durationMs: number
}

// ─── Chunking Helper for High Concurrency ────────────────────────

async function runInChunks<T, R>(
  items: T[],
  chunkSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    const chunkResults = await Promise.all(chunk.map(fn))
    results.push(...chunkResults)
  }
  return results
}

// ─── Test Connection & Account Info ──────────────────────────────

export async function testAmoCRMConnection(domain: string, accessToken: string): Promise<{
  id: number
  name: string
  subdomain: string
  currency: string
}> {
  const targetDomain = domain.includes('.') ? domain : `${domain}.amocrm.ru`
  const res = await fetch(`https://${targetDomain}/api/v4/account`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`amoCRM ulanish xatosi (${res.status}): ${text || 'Token yoki do‘men noto‘g‘ri'}`)
  }

  const data = (await res.json()) as {
    id: number
    name: string
    subdomain: string
    currency: string
  }
  return data
}

// ─── Save Direct Long-Lived Token (Долгосрочный токен) ─────────────

export async function saveAmoCRMLongLivedToken(params: {
  companyId: string
  domain: string
  token: string
}): Promise<{
  id: number
  name: string
  subdomain: string
}> {
  const { companyId, domain, token } = params
  let targetDomain = domain.trim().toLowerCase()
  if (targetDomain.startsWith('http://')) targetDomain = targetDomain.substring(7)
  if (targetDomain.startsWith('https://')) targetDomain = targetDomain.substring(8)
  if (targetDomain.endsWith('/')) targetDomain = targetDomain.slice(0, -1)
  if (!targetDomain.includes('.')) targetDomain = `${targetDomain}.amocrm.ru`

  const cleanToken = token.trim()

  // Test token immediately with amoCRM API
  const account = await testAmoCRMConnection(targetDomain, cleanToken)

  const config: AmoCRMConfig = {
    domain: targetDomain,
    accountId: account.id,
    accountName: account.name,
    authType: 'token',
  }

  // Set long-lived token expiry (5 years)
  const expiresAt = new Date(Date.now() + 5 * 365 * 24 * 3600 * 1000)

  await prisma.cRMIntegration.upsert({
    where: { companyId_provider: { companyId, provider: 'AMOCRM' } },
    create: {
      companyId,
      provider: 'AMOCRM',
      status: IntegrationStatus.CONNECTED,
      accessTokenEnc: encrypt(cleanToken),
      refreshTokenEnc: null,
      tokenExpiresAt: expiresAt,
      configEnc: encryptJson(config),
      lastSyncAt: null,
      lastError: null,
    },
    update: {
      status: IntegrationStatus.CONNECTED,
      accessTokenEnc: encrypt(cleanToken),
      refreshTokenEnc: null,
      tokenExpiresAt: expiresAt,
      configEnc: encryptJson(config),
      lastError: null,
    },
  })

  return account
}

// ─── OAuth2 Flow ─────────────────────────────────────────────────

export function buildAmoCRMAuthUrl(domain: string, state: string): string {
  if (!AMOCRM_CLIENT_ID) {
    throw new Error('AMOCRM_CLIENT_ID .env faylida sozlanmagan')
  }
  const params = new URLSearchParams({
    client_id: AMOCRM_CLIENT_ID,
    redirect_uri: AMOCRM_REDIRECT_URI,
    response_type: 'code',
    state,
  })

  return `https://www.amocrm.ru/oauth?${params}`
}

export async function exchangeAmoCRMCode(params: {
  code: string
  domain: string
  companyId: string
}): Promise<void> {
  const { code, domain, companyId } = params
  const targetDomain = domain.includes('.') ? domain : `${domain}.amocrm.ru`

  const response = await fetch(`https://${targetDomain}/oauth2/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: AMOCRM_CLIENT_ID,
      client_secret: AMOCRM_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: AMOCRM_REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`amoCRM OAuth xatosi: ${error}`)
  }

  const data = (await response.json()) as {
    token_type: string
    expires_in: number
    access_token: string
    refresh_token: string
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000)

  // Fetch account info to save name
  let accountName: string | undefined
  let accountId: number | undefined
  try {
    const account = await testAmoCRMConnection(targetDomain, data.access_token)
    accountName = account.name
    accountId = account.id
  } catch {
    // Non-critical
  }

  const config: AmoCRMConfig = {
    domain: targetDomain,
    accountId,
    accountName,
    authType: 'oauth',
  }

  await prisma.cRMIntegration.upsert({
    where: { companyId_provider: { companyId, provider: 'AMOCRM' } },
    create: {
      companyId,
      provider: 'AMOCRM',
      status: IntegrationStatus.CONNECTED,
      accessTokenEnc: encrypt(data.access_token),
      refreshTokenEnc: encrypt(data.refresh_token),
      tokenExpiresAt: expiresAt,
      configEnc: encryptJson(config),
      lastSyncAt: null,
      lastError: null,
    },
    update: {
      status: IntegrationStatus.CONNECTED,
      accessTokenEnc: encrypt(data.access_token),
      refreshTokenEnc: encrypt(data.refresh_token),
      tokenExpiresAt: expiresAt,
      configEnc: encryptJson(config),
      lastError: null,
    },
  })
}

// ─── Token Manager ───────────────────────────────────────────────

export async function getAmoCRMAccessToken(companyId: string): Promise<{
  accessToken: string
  domain: string
}> {
  const integration = await prisma.cRMIntegration.findUnique({
    where: { companyId_provider: { companyId, provider: 'AMOCRM' } },
  })

  if (!integration || !integration.accessTokenEnc) {
    throw new Error('amoCRM интеграцияси уланмаган')
  }

  const config = decryptJson<AmoCRMConfig>(integration.configEnc!)
  const domain = config.domain

  // If using Long-Lived Token or no refresh token present, return directly
  if (config.authType === 'token' || !integration.refreshTokenEnc) {
    return {
      accessToken: decrypt(integration.accessTokenEnc),
      domain,
    }
  }

  // Check if OAuth token needs refresh (5 min buffer)
  const needsRefresh =
    !integration.tokenExpiresAt ||
    integration.tokenExpiresAt.getTime() < Date.now() + 5 * 60 * 1000

  if (!needsRefresh) {
    return {
      accessToken: decrypt(integration.accessTokenEnc),
      domain,
    }
  }

  // Refresh OAuth token
  const refreshToken = decrypt(integration.refreshTokenEnc)

  const response = await fetch(`https://${domain}/oauth2/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: AMOCRM_CLIENT_ID,
      client_secret: AMOCRM_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      redirect_uri: AMOCRM_REDIRECT_URI,
    }),
  })

  if (!response.ok) {
    await prisma.cRMIntegration.update({
      where: { id: integration.id },
      data: {
        status: IntegrationStatus.ERROR,
        lastError: `Token refresh failed: ${response.status}`,
      },
    })
    throw new Error(`amoCRM token refresh failed: ${response.status}`)
  }

  const data = (await response.json()) as {
    expires_in: number
    access_token: string
    refresh_token: string
  }

  const expiresAt = new Date(Date.now() + data.expires_in * 1000)

  await prisma.cRMIntegration.update({
    where: { id: integration.id },
    data: {
      accessTokenEnc: encrypt(data.access_token),
      refreshTokenEnc: encrypt(data.refresh_token),
      tokenExpiresAt: expiresAt,
      status: IntegrationStatus.CONNECTED,
      lastError: null,
    },
  })

  return { accessToken: data.access_token, domain }
}

// ─── API Request Helper ──────────────────────────────────────────

export async function amoCRMRequest<T>(
  companyId: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { accessToken, domain } = await getAmoCRMAccessToken(companyId)

  const url = `https://${domain}${path}`

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`amoCRM API error ${response.status}: ${path}`)
  }

  return response.json() as T
}

// ─── Data Interfaces ─────────────────────────────────────────────

interface AmoCRMDealsResponse {
  _embedded?: {
    leads?: AmoCRMLead[]
  }
  _links?: { next?: { href: string } }
}

interface AmoCRMLead {
  id: number
  name: string
  price: number
  status_id: number
  pipeline_id: number
  responsible_user_id: number
  created_at: number
  updated_at: number
  closed_at?: number
  loss_reason_id?: number
  _embedded?: {
    contacts?: Array<{ id: number }>
    tags?: Array<{ id: number; name: string }>
  }
}

interface AmoCRMContact {
  id: number
  name: string
  created_at: number
  custom_fields_values?: Array<{
    field_code: string
    values: Array<{ value: string }>
  }>
  responsible_user_id: number
}

interface AmoCRMUser {
  id: number
  name: string
  email: string
  lang: string
  rights: { is_active: boolean }
}

interface AmoCRMPipeline {
  id: number
  name: string
  is_main: boolean
  is_deleted: boolean
  _embedded?: {
    statuses?: Array<{
      id: number
      name: string
      color: string
      sort: number
      type: number // 0=open, 1=success, 2=fail
    }>
  }
}

interface AmoCRMCallNote {
  id: number
  entity_id: number
  created_by: number
  created_at: number
  note_type: 'call_in' | 'call_out'
  params: {
    uniq?: string
    duration?: number
    source?: string
    link?: string
    phone?: string
    call_result?: string | null
    call_status?: number
  }
}

interface AmoCRMNotesResponse {
  _embedded?: { notes?: AmoCRMCallNote[] }
  _links?: { next?: { href: string } }
}

// ─── Fast Batch Sync Functions ───────────────────────────────────

export async function syncAmoCRMManagers(companyId: string): Promise<number> {
  const data = await amoCRMRequest<{ _embedded?: { users?: AmoCRMUser[] } }>(
    companyId,
    '/api/v4/users?limit=250'
  ).catch(() => ({ _embedded: { users: [] } }))

  const users = data._embedded?.users || []
  if (!users.length) return 0

  await runInChunks(users, 50, async (u) => {
    return prisma.manager.upsert({
      where: {
        companyId_crmId_crmProvider: {
          companyId,
          crmId: String(u.id),
          crmProvider: 'amocrm',
        },
      },
      create: {
        companyId,
        crmId: String(u.id),
        crmProvider: 'amocrm',
        name: u.name,
        email: u.email,
        isActive: u.rights?.is_active !== false,
      },
      update: {
        name: u.name,
        email: u.email,
        isActive: u.rights?.is_active !== false,
      },
    })
  })

  return users.length
}

export async function syncAmoCRMPipelines(companyId: string): Promise<number> {
  const data = await amoCRMRequest<{ _embedded?: { pipelines?: AmoCRMPipeline[] } }>(
    companyId,
    '/api/v4/leads/pipelines?with=statuses&limit=250'
  ).catch(() => ({ _embedded: { pipelines: [] } }))

  const pipelines = data._embedded?.pipelines || []

  for (const p of pipelines) {
    const pipeline = await prisma.pipeline.upsert({
      where: {
        companyId_crmId_crmProvider: {
          companyId,
          crmId: String(p.id),
          crmProvider: 'amocrm',
        },
      },
      create: {
        companyId,
        crmId: String(p.id),
        crmProvider: 'amocrm',
        name: p.name,
        isMain: p.is_main,
        isDeleted: p.is_deleted,
      },
      update: {
        name: p.name,
        isMain: p.is_main,
        isDeleted: p.is_deleted,
      },
    })

    const statuses = p._embedded?.statuses || []
    await runInChunks(statuses, 50, async (s) => {
      return prisma.pipelineStage.upsert({
        where: {
          pipelineId_crmId: {
            pipelineId: pipeline.id,
            crmId: String(s.id),
          },
        },
        create: {
          companyId,
          pipelineId: pipeline.id,
          crmId: String(s.id),
          name: s.name,
          color: s.color,
          sort: s.sort,
          isSuccess: s.type === 1,
          isUnsorted: false,
        },
        update: {
          name: s.name,
          color: s.color,
          sort: s.sort,
          isSuccess: s.type === 1,
        },
      })
    })
  }

  return pipelines.length
}

export async function syncAmoCRMContacts(companyId: string, maxPages = 20): Promise<number> {
  let page = 1
  let count = 0

  while (page <= maxPages) {
    const data = await amoCRMRequest<{ _embedded?: { contacts?: AmoCRMContact[] } }>(
      companyId,
      `/api/v4/contacts?limit=250&page=${page}`
    ).catch(() => null)

    const contacts = data?._embedded?.contacts || []
    if (!contacts.length) break

    await runInChunks(contacts, 50, async (c) => {
      const phone = c.custom_fields_values
        ?.find((f) => f.field_code === 'PHONE')
        ?.values[0]?.value

      const email = c.custom_fields_values
        ?.find((f) => f.field_code === 'EMAIL')
        ?.values[0]?.value

      return prisma.customer.upsert({
        where: {
          companyId_crmId_crmProvider: {
            companyId,
            crmId: String(c.id),
            crmProvider: 'amocrm',
          },
        },
        create: {
          companyId,
          crmId: String(c.id),
          crmProvider: 'amocrm',
          name: c.name || `Контакт #${c.id}`,
          phone,
          email,
        },
        update: {
          name: c.name || `Контакт #${c.id}`,
          phone,
          email,
        },
      })
    })

    count += contacts.length
    if (contacts.length < 250) break
    page++
  }

  return count
}

export async function syncAmoCRMDeals(
  companyId: string,
  options: { maxPages?: number; sinceTimestamp?: number } = {}
): Promise<number> {
  const { maxPages = 20, sinceTimestamp } = options
  let page = 1
  let count = 0

  // Preload pipelines and stages in-memory
  const pipelines = await prisma.pipeline.findMany({
    where: { companyId, crmProvider: 'amocrm' },
    include: { stages: true },
  })

  const stageByPipelineAndCrmId = new Map<string, string>()
  const pipelineByStageId = new Map<string, string>()
  const stageSuccessMap = new Map<string, boolean>()

  for (const p of pipelines) {
    for (const s of p.stages) {
      if (s.crmId) {
        stageByPipelineAndCrmId.set(`${p.crmId}:${s.crmId}`, s.id)
        pipelineByStageId.set(s.crmId, p.id)
        stageSuccessMap.set(s.crmId, s.isSuccess)
      }
    }
  }

  // Preload managers in-memory
  const managers = await prisma.manager.findMany({
    where: { companyId, crmProvider: 'amocrm' },
    select: { id: true, crmId: true },
  })
  const managersByCrmId = new Map<string, string>()
  for (const m of managers) {
    if (m.crmId) managersByCrmId.set(m.crmId, m.id)
  }

  while (page <= maxPages) {
    let url = `/api/v4/leads?limit=250&page=${page}&with=contacts,tags,loss_reason`
    if (sinceTimestamp) {
      url += `&filter[updated_at][from]=${sinceTimestamp}`
    }

    const data = await amoCRMRequest<AmoCRMDealsResponse>(companyId, url).catch(() => null)
    const leads = data?._embedded?.leads || []
    if (!leads.length) break

    await runInChunks(leads, 50, async (lead) => {
      const stageId = stageByPipelineAndCrmId.get(`${lead.pipeline_id}:${lead.status_id}`)
      const pipelineId = pipelineByStageId.get(String(lead.status_id))
      const managerId = managersByCrmId.get(String(lead.responsible_user_id))

      let status = 'open'
      const isSuccess = stageSuccessMap.get(String(lead.status_id))
      if (isSuccess) status = 'won'
      else if (lead.closed_at) status = 'lost'

      return prisma.deal.upsert({
        where: {
          companyId_crmId_crmProvider: {
            companyId,
            crmId: String(lead.id),
            crmProvider: 'amocrm',
          },
        },
        create: {
          companyId,
          crmId: String(lead.id),
          crmProvider: 'amocrm',
          name: lead.name || `Сделка #${lead.id}`,
          budget: lead.price || 0,
          pipelineId: pipelineId || null,
          stageId: stageId || null,
          managerId: managerId || null,
          status,
          crmCreatedAt: new Date(lead.created_at * 1000),
          crmUpdatedAt: new Date(lead.updated_at * 1000),
          closedAt: lead.closed_at ? new Date(lead.closed_at * 1000) : null,
          tags: lead._embedded?.tags?.map((t) => t.name) || [],
        },
        update: {
          name: lead.name || `Сделка #${lead.id}`,
          budget: lead.price || 0,
          pipelineId: pipelineId || null,
          stageId: stageId || null,
          managerId: managerId || null,
          status,
          crmUpdatedAt: new Date(lead.updated_at * 1000),
          closedAt: lead.closed_at ? new Date(lead.closed_at * 1000) : null,
          tags: lead._embedded?.tags?.map((t) => t.name) || [],
        },
      })
    })

    count += leads.length
    if (leads.length < 250) break
    page++
  }

  return count
}

export async function syncAmoCRMCalls(
  companyId: string,
  optionsOrSince?: number | SyncCallsParamOptions,
  legacyMaxPages = 15
): Promise<number> {
  const options: SyncCallsParamOptions =
    typeof optionsOrSince === 'number'
      ? { sinceTimestamp: optionsOrSince, maxPages: legacyMaxPages }
      : optionsOrSince || {}

  const since =
    options.sinceTimestamp ?? Math.floor((Date.now() - 30 * 24 * 3600 * 1000) / 1000)
  const to = options.toTimestamp
  const managerCrmId = options.managerCrmId
  const maxPages = options.maxPages ?? 15

  const managers = await prisma.manager.findMany({
    where: { companyId, crmProvider: 'amocrm' },
    select: { id: true, crmId: true },
  })
  const managerMap = new Map(managers.map((m) => [String(m.crmId), m.id]))

  const deals = await prisma.deal.findMany({
    where: { companyId, crmProvider: 'amocrm' },
    select: { id: true, crmId: true },
  })
  const dealMap = new Map(deals.map((d) => [String(d.crmId), d.id]))

  const customers = await prisma.customer.findMany({
    where: { companyId, crmProvider: 'amocrm' },
    select: { id: true, crmId: true },
  })
  const customerMap = new Map(customers.map((c) => [String(c.crmId), c.id]))

  let totalCallsCount = 0

  // Helper to sync from a specific notes endpoint (leads, contacts, companies, customers)
  const fetchNotesFromEndpoint = async (endpoint: string, entityType: 'lead' | 'contact' | 'company' | 'customer') => {
    let page = 1
    let localCount = 0

    while (page <= maxPages) {
      const queryParts = [
        'filter[note_type][]=call_in',
        'filter[note_type][]=call_out',
        `filter[created_at][from]=${since}`,
        'limit=250',
        `page=${page}`,
      ]

      if (to) {
        queryParts.push(`filter[created_at][to]=${to}`)
      }

      if (managerCrmId) {
        queryParts.push(`filter[created_by][]=${managerCrmId}`)
      }

      const data = await amoCRMRequest<AmoCRMNotesResponse>(
        companyId,
        `${endpoint}?${queryParts.join('&')}`
      ).catch(() => null)

      const notes = data?._embedded?.notes ?? []
      if (!notes.length) break

      await runInChunks(notes, 50, async (note) => {
        const direction = note.note_type === 'call_in' ? 'INBOUND' : 'OUTBOUND'
        const callStatus = note.params?.call_status ?? 0
        
        let status: string = 'MISSED'
        if (callStatus === 4) {
          status = 'ANSWERED'
        } else if (callStatus === 7) {
          status = 'BUSY'
        } else if (callStatus === 5) {
          status = 'FAILED'
        }

        const phone = note.params?.phone ?? null
        const recordingUrl = note.params?.link ?? null
        const durationSeconds = note.params?.duration ?? 0
        const talkDuration = status === 'ANSWERED' ? durationSeconds : 0
        const createdAt = new Date(note.created_at * 1000)
        const managerId = managerMap.get(String(note.created_by)) ?? null
        
        const dealId = entityType === 'lead' ? (dealMap.get(String(note.entity_id)) ?? null) : null
        const customerId = entityType === 'contact' ? (customerMap.get(String(note.entity_id)) ?? null) : null
        
        const externalCallId = String(note.id)
        const analysisStatus = recordingUrl ? 'NOT_SELECTED' : 'NO_RECORDING'

        try {
          await prisma.call.upsert({
            where: {
              companyId_telephonyProvider_externalCallId: {
                companyId,
                telephonyProvider: 'AMOCRM',
                externalCallId,
              },
            },
            create: {
              companyId,
              telephonyProvider: 'AMOCRM',
              externalCallId,
              direction: direction as any,
              status: status as any,
              customerPhone: phone,
              managerId,
              dealId,
              customerId,
              startedAt: createdAt,
              answeredAt: status === 'ANSWERED' ? createdAt : null,
              endedAt: new Date(createdAt.getTime() + durationSeconds * 1000),
              durationSeconds,
              talkDurationSeconds: talkDuration,
              externalRecordingUrl: recordingUrl,
              analysisStatus: analysisStatus as any,
            },
            update: {
              managerId,
              ...(dealId ? { dealId } : {}),
              ...(customerId ? { customerId } : {}),
              externalRecordingUrl: recordingUrl,
              talkDurationSeconds: talkDuration,
              status: status as any,
            },
          })
        } catch {
          // Skip duplicate or constraint errors
        }
      })

      localCount += notes.length
      if (notes.length < 250) break
      page++
    }

    return localCount
  }

  // Fetch all 4 amoCRM entity notes endpoints in parallel
  const [leadsCount, contactsCount, companiesCount, customersCount] = await Promise.all([
    fetchNotesFromEndpoint('/api/v4/leads/notes', 'lead'),
    fetchNotesFromEndpoint('/api/v4/contacts/notes', 'contact'),
    fetchNotesFromEndpoint('/api/v4/companies/notes', 'company'),
    fetchNotesFromEndpoint('/api/v4/customers/notes', 'customer'),
  ])

  totalCallsCount = leadsCount + contactsCount + companiesCount + customersCount
  return totalCallsCount
}

// ─── High-Level Optimized Full & Fast Sync ───────────────────────

export async function syncAmoCRMOptimized(
  companyId: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const startTime = Date.now()
  const syncType = options.type || 'fast'

  // Resolve manager CRM ID if managerId is passed
  let targetManagerCrmId: string | number | undefined = options.managerCrmId
  if (!targetManagerCrmId && options.managerId) {
    const mgr = await prisma.manager.findUnique({
      where: { id: options.managerId },
      select: { crmId: true },
    })
    if (mgr?.crmId) {
      targetManagerCrmId = mgr.crmId
    }
  }

  // Calculate timestamp bounds
  let sinceTimestamp: number | undefined
  let toTimestamp: number | undefined

  if (options.dateFrom) {
    const dFrom = new Date(options.dateFrom)
    if (!isNaN(dFrom.getTime())) {
      sinceTimestamp = Math.floor(dFrom.getTime() / 1000)
    }
  }

  if (options.dateTo) {
    const dTo = new Date(options.dateTo)
    if (!isNaN(dTo.getTime())) {
      toTimestamp = Math.floor(dTo.getTime() / 1000)
    }
  }

  if (!sinceTimestamp) {
    const sinceDays = options.sinceDays ?? (syncType === 'fast' ? 7 : 30)
    sinceTimestamp = Math.floor((Date.now() - sinceDays * 24 * 3600 * 1000) / 1000)
  }

  const syncLog = await prisma.syncLog.create({
    data: {
      companyId,
      provider: 'amocrm',
      syncType: syncType,
      status: 'pending',
      startedAt: new Date(),
    },
  })

  const counts: SyncResult = {
    leads: 0,
    contacts: 0,
    managers: 0,
    pipelines: 0,
    calls: 0,
    durationMs: 0,
  }

  try {
    if (syncType === 'custom') {
      // Lightning-fast targeted sync: directly fetch calls for the selected manager and period
      counts.calls = await syncAmoCRMCalls(companyId, {
        sinceTimestamp,
        toTimestamp,
        managerCrmId: targetManagerCrmId,
        maxPages: 10,
      })
    } else {
      // 1. Structure: Managers and Pipelines in parallel
      const [mgrCount, pipeCount] = await Promise.all([
        syncAmoCRMManagers(companyId),
        syncAmoCRMPipelines(companyId),
      ])
      counts.managers = mgrCount
      counts.pipelines = pipeCount

      if (syncType !== 'structure') {
        const isFast = syncType === 'fast'
        const maxPagesContacts = isFast ? 3 : 50
        const maxPagesDeals = isFast ? 5 : 50
        const maxPagesCalls = isFast ? 10 : 50

        // Execute Contacts, Deals, and Calls concurrently in parallel!
        const [contactsCount, dealsCount, callsCount] = await Promise.all([
          syncAmoCRMContacts(companyId, maxPagesContacts),
          syncAmoCRMDeals(companyId, { maxPages: maxPagesDeals, sinceTimestamp }),
          syncAmoCRMCalls(companyId, {
            sinceTimestamp,
            toTimestamp,
            managerCrmId: targetManagerCrmId,
            maxPages: maxPagesCalls,
          }),
        ])

        counts.contacts = contactsCount
        counts.leads = dealsCount
        counts.calls = callsCount
      }
    }

    counts.durationMs = Date.now() - startTime

    // Update lastSyncAt on integration
    await prisma.cRMIntegration.updateMany({
      where: { companyId, provider: 'AMOCRM' },
      data: { lastSyncAt: new Date(), lastError: null },
    })

    const totalSynced =
      counts.leads + counts.contacts + counts.managers + counts.pipelines + counts.calls

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'success',
        completedAt: new Date(),
        itemsSynced: totalSynced,
        itemsCreated: totalSynced,
        itemsUpdated: 0,
      },
    })

    return counts
  } catch (err: any) {
    const errorMsg = String(err.message || err)
    await prisma.cRMIntegration.updateMany({
      where: { companyId, provider: 'AMOCRM' },
      data: { lastError: errorMsg },
    }).catch(() => null)

    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: errorMsg,
      },
    }).catch(() => null)

    throw err
  }
}

// Backward-compatibility export
export async function syncAmoCRMFull(companyId: string): Promise<SyncResult> {
  return syncAmoCRMOptimized(companyId, { type: 'full' })
}

// ─── Send AI Audit Note to amoCRM Deal ───────────────────────────

export async function sendAuditNoteToAmoCRM(params: {
  companyId: string
  dealCrmId: string
  noteText: string
}): Promise<void> {
  const { companyId, dealCrmId, noteText } = params

  await amoCRMRequest(companyId, `/api/v4/leads/${dealCrmId}/notes`, {
    method: 'POST',
    body: JSON.stringify([
      {
        note_type: 'common',
        params: { text: noteText },
      },
    ]),
  })
}