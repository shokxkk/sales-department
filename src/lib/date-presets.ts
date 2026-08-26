// ─────────────────────────────────────────────────────────────────
//  amoCRM-native Date Preset & Time Range Calculation Helper
//  Matches exact amoCRM UI date presets
// ─────────────────────────────────────────────────────────────────

export type DatePresetKey =
  | 'all_time'
  | 'today'
  | 'yesterday'
  | 'last_30_days'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'custom'

export interface DatePresetItem {
  id: DatePresetKey
  labelRu: string
  labelUz: string
}

export const AMOCRM_DATE_PRESETS: DatePresetItem[] = [
  { id: 'all_time', labelRu: 'За все время', labelUz: 'Barcha vaqt bo‘yicha' },
  { id: 'today', labelRu: 'За сегодня', labelUz: 'Bugun' },
  { id: 'yesterday', labelRu: 'За вчера', labelUz: 'Kecha' },
  { id: 'last_30_days', labelRu: 'За последние 30 дней', labelUz: 'So‘nggi 30 kun' },
  { id: 'this_week', labelRu: 'За эту неделю', labelUz: 'Shu hafta' },
  { id: 'last_week', labelRu: 'За прошлую неделю', labelUz: 'O‘tgan hafta' },
  { id: 'this_month', labelRu: 'За этот месяц', labelUz: 'Shu oy' },
  { id: 'last_month', labelRu: 'За прошлый месяц', labelUz: 'O‘tgan oy' },
  { id: 'this_quarter', labelRu: 'За квартал', labelUz: 'Shu chorak' },
  { id: 'this_year', labelRu: 'За этот год', labelUz: 'Shu yil' },
]

export function getPresetDateRange(preset: DatePresetKey, customFrom?: string, customTo?: string): {
  dateFrom: string | null
  dateTo: string | null
} {
  const now = new Date()

  if (preset === 'all_time') {
    return { dateFrom: null, dateTo: null }
  }

  if (preset === 'custom') {
    return {
      dateFrom: customFrom ? new Date(customFrom).toISOString() : null,
      dateTo: customTo ? new Date(customTo).toISOString() : null,
    }
  }

  if (preset === 'today') {
    const from = new Date(now)
    from.setHours(0, 0, 0, 0)
    const to = new Date(now)
    to.setHours(23, 59, 59, 999)
    return { dateFrom: from.toISOString(), dateTo: to.toISOString() }
  }

  if (preset === 'yesterday') {
    const from = new Date(now)
    from.setDate(now.getDate() - 1)
    from.setHours(0, 0, 0, 0)
    const to = new Date(now)
    to.setDate(now.getDate() - 1)
    to.setHours(23, 59, 59, 999)
    return { dateFrom: from.toISOString(), dateTo: to.toISOString() }
  }

  if (preset === 'last_30_days') {
    const from = new Date(now.getTime() - 30 * 24 * 3600 * 1000)
    return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
  }

  if (preset === 'this_week') {
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
    const from = new Date(now)
    from.setDate(diff)
    from.setHours(0, 0, 0, 0)
    const to = new Date(now)
    to.setHours(23, 59, 59, 999)
    return { dateFrom: from.toISOString(), dateTo: to.toISOString() }
  }

  if (preset === 'last_week') {
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7
    const from = new Date(now)
    from.setDate(diff)
    from.setHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setDate(from.getDate() + 6)
    to.setHours(23, 59, 59, 999)
    return { dateFrom: from.toISOString(), dateTo: to.toISOString() }
  }

  if (preset === 'this_month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return { dateFrom: from.toISOString(), dateTo: to.toISOString() }
  }

  if (preset === 'last_month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0)
    const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    return { dateFrom: from.toISOString(), dateTo: to.toISOString() }
  }

  if (preset === 'this_quarter') {
    const currentQuarter = Math.floor(now.getMonth() / 3)
    const from = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0)
    const to = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999)
    return { dateFrom: from.toISOString(), dateTo: to.toISOString() }
  }

  if (preset === 'this_year') {
    const from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
    const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
    return { dateFrom: from.toISOString(), dateTo: to.toISOString() }
  }

  return { dateFrom: null, dateTo: null }
}
