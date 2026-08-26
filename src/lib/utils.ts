import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format score color class based on score value
 */
export function getScoreColor(score: number, maxScore: number = 100): string {
  // If score <= 14 and maxScore is default 100, likely out of 14 criteria
  const actualMax = maxScore === 100 && score <= 14 ? 14 : maxScore
  const pct = actualMax > 0 ? (score / actualMax) * 100 : score
  if (pct >= 80) return 'score-high'
  if (pct >= 60) return 'score-medium'
  return 'score-low'
}

/**
 * Format duration in seconds to MM:SS
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/**
 * Calculate required AI minutes from duration (ceil to full minute, min 1)
 */
export function calcRequiredMinutes(durationSeconds: number): number {
  return Math.max(1, Math.ceil(durationSeconds / 60))
}

/**
 * Format number with thousands separator
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('uz-UZ').format(n)
}

/**
 * Format currency in UZS
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uz-UZ', {
    style: 'currency',
    currency: 'UZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format date to localized string
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  }).format(d)
}

/**
 * Format date + time
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/**
 * Analysis status label in Uzbek
 */
export const ANALYSIS_STATUS_LABELS: Record<string, string> = {
  NOT_SELECTED: 'Танланмаган',
  QUEUED: 'Навбатда',
  DOWNLOADING: 'Юкланяпти',
  TRANSCRIBING: 'Расшифровка',
  ANALYZING: 'Таҳлил',
  COMPLETED: 'Тайёр',
  ERROR: 'Хато',
  INSUFFICIENT_BALANCE: 'Баланс етарли эмас',
  NO_RECORDING: 'Запись йўқ',
}

/**
 * Call direction labels
 */
export const CALL_DIRECTION_LABELS: Record<string, string> = {
  INBOUND: 'Кирувчи',
  OUTBOUND: 'Чиқувчи',
}

/**
 * Call type labels
 */
export const CALL_TYPE_LABELS: Record<string, string> = {
  NEW_LEAD: 'Янги лид',
  REPEAT_CALL: 'Қайта қўнғироқ',
  SALE: 'Сотув қўнғироғи',
  SERVICE: 'Сервис',
  COMPLAINT: 'Шикоят',
  WRONG_NUMBER: 'Нотўғри мурожаат',
}

/**
 * Role labels in Uzbek
 */
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Бош администратор',
  COMPANY_ADMIN: 'Компания администратори',
  OWNER: 'Собственник',
  SALES_DIRECTOR: 'Сотув бўлими бошлиғи',
  QUALITY_CONTROL: 'Сифат назорати',
}
