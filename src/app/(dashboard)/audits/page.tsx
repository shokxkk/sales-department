'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ClipboardList,
  Search,
  RefreshCw,
  ChevronRight,
  Phone,
  Play,
  Sparkles,
  CheckCircle2,
  Clock,
  User,
  Zap,
  Star,
  ExternalLink,
  ChevronLeft,
  Filter,
  Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatDateTime, getScoreColor } from '@/lib/utils'
import { useLanguage } from '@/components/providers/app-provider'

import { AmoCRMFilterSync, AmoCRMFilterState } from '@/components/ui/amocrm-filter-sync'
import { AMOCRM_DATE_PRESETS, DatePresetKey } from '@/lib/date-presets'

interface CallItem {
  id: string
  customerPhone: string
  talkDurationSeconds: number
  startedAt: string
  status: 'ANSWERED' | 'MISSED' | 'BUSY' | 'FAILED'
  analysisStatus: string
  aiScore?: number
  externalRecordingUrl?: string
  manager?: { id: string; name: string }
  customer?: { id: string; name: string; phone?: string }
  deal?: { id: string; name: string }
  audit?: { id: string; finalScore: number; callType: string }
}

interface AuditItem {
  id: string
  callId: string
  aiScore: number
  finalScore: number
  maxPossibleScore?: number
  callType: string
  hasCriticalFails?: boolean
  callResult?: string
  completedAt: string
  call: {
    customerPhone: string
    talkDurationSeconds: number
    manager?: { name: string }
    customer?: { name: string }
  }
}

export default function AuditsPage() {
  const { language } = useLanguage()
  const [activeTab, setActiveTab] = useState<'all_calls' | 'completed_audits'>('all_calls')
  const [companyId, setCompanyId] = useState<string | null>(null)

  // Real Calls state
  const [calls, setCalls] = useState<CallItem[]>([])
  const [callsPage, setCallsPage] = useState(1)
  const [totalCallsCount, setTotalCallsCount] = useState(0)
  const [loadingCalls, setLoadingCalls] = useState(true)

  // Audits state
  const [audits, setAudits] = useState<AuditItem[]>([])
  const [loadingAudits, setLoadingAudits] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [analyzingCallId, setAnalyzingCallId] = useState<string | null>(null)
  const [batchAnalyzing, setBatchAnalyzing] = useState(false)

  // amoCRM Filter & Sync state
  const [onlyAnswered, setOnlyAnswered] = useState(true)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [filterManagerId, setFilterManagerId] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState<string | null>(null)
  const [filterDateTo, setFilterDateTo] = useState<string | null>(null)
  const [filterPreset, setFilterPreset] = useState<DatePresetKey>('all_time')
  const [filterMinDuration, setFilterMinDuration] = useState<number | undefined>(undefined)
  const [filterMaxDuration, setFilterMaxDuration] = useState<number | undefined>(undefined)
  const [filterCallStatuses, setFilterCallStatuses] = useState<string[]>([])
  const [filterHasRecording, setFilterHasRecording] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.user.companyId) {
          setCompanyId(d.user.companyId)
        }
      })
  }, [])

  // Fetch real calls from amoCRM (with manager, date, duration, statuses filters)
  const fetchCalls = useCallback(() => {
    if (!companyId) return
    setLoadingCalls(true)

    const params = new URLSearchParams({
      page: String(callsPage),
      limit: '25',
    })
    if (onlyAnswered) {
      params.set('onlyAnswered', 'true')
      if (filterMinDuration === undefined) params.set('minDuration', '10')
    }
    if (searchTerm) params.set('search', searchTerm)
    if (filterManagerId) params.set('managerId', filterManagerId)
    if (filterDateFrom) params.set('dateFrom', filterDateFrom)
    if (filterDateTo) params.set('dateTo', filterDateTo)
    if (filterMinDuration !== undefined) params.set('minDuration', String(filterMinDuration))
    if (filterMaxDuration !== undefined) params.set('maxDuration', String(filterMaxDuration))
    if (filterCallStatuses.length > 0) params.set('callStatuses', filterCallStatuses.join(','))
    if (filterHasRecording) params.set('hasRecording', 'true')

    fetch(`/api/${companyId}/calls?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCalls(d.data || [])
          setTotalCallsCount(d.pagination?.total || 0)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCalls(false))
  }, [
    companyId,
    callsPage,
    searchTerm,
    onlyAnswered,
    filterManagerId,
    filterDateFrom,
    filterDateTo,
    filterMinDuration,
    filterMaxDuration,
    filterCallStatuses,
    filterHasRecording,
  ])

  // Fetch completed audits (with manager and date filters)
  const fetchAudits = useCallback(() => {
    if (!companyId) return
    setLoadingAudits(true)

    const params = new URLSearchParams()
    if (filterManagerId) params.set('managerId', filterManagerId)
    if (filterDateFrom) params.set('dateFrom', filterDateFrom)
    if (filterDateTo) params.set('dateTo', filterDateTo)

    const url = `/api/${companyId}/audits${params.toString() ? `?${params.toString()}` : ''}`

    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setAudits(d.data || [])
        }
      })
      .catch(() => {})
      .finally(() => setLoadingAudits(false))
  }, [companyId, filterManagerId, filterDateFrom, filterDateTo])

  useEffect(() => {
    if (companyId) {
      fetchCalls()
      fetchAudits()
    }
  }, [companyId, fetchCalls, fetchAudits])

  const handleApplyAmoFilter = (f: AmoCRMFilterState) => {
    setFilterManagerId(f.managerId)
    setFilterDateFrom(f.dateFrom)
    setFilterDateTo(f.dateTo)
    setFilterPreset(f.preset)
    setFilterMinDuration(f.minDuration)
    setFilterMaxDuration(f.maxDuration)
    setFilterHasRecording(f.hasRecordingOnly)

    // Map UI statuses to DB statuses
    const dbStatuses: string[] = []
    f.callStatuses.forEach((st) => {
      if (st === 'talked' && !dbStatuses.includes('ANSWERED')) dbStatuses.push('ANSWERED')
      if (st === 'busy' && !dbStatuses.includes('BUSY')) dbStatuses.push('BUSY')
      if (['no_answer', 'not_available', 'call_back', 'left_message'].includes(st) && !dbStatuses.includes('MISSED')) dbStatuses.push('MISSED')
      if (st === 'wrong_number' && !dbStatuses.includes('FAILED')) dbStatuses.push('FAILED')
    })
    setFilterCallStatuses(dbStatuses)

    setCallsPage(1)
    setShowFilterModal(false)
  }

  const handleClearFilters = () => {
    setFilterManagerId('')
    setFilterDateFrom(null)
    setFilterDateTo(null)
    setFilterPreset('all_time')
    setFilterMinDuration(undefined)
    setFilterMaxDuration(undefined)
    setFilterCallStatuses([])
    setFilterHasRecording(false)
    setCallsPage(1)
  }

  // 1-Click single call AI analysis
  const handleAnalyzeCall = async (callId: string) => {
    if (!companyId) return
    setAnalyzingCallId(callId)

    try {
      const res = await fetch(`/api/${companyId}/calls/${callId}/analyze`, {
        method: 'POST',
      })
      const data = await res.json()

      if (data.success) {
        toast.success(language === 'uz' ? `AI Audit yakunlandi! Ball: ${data.score}/100` : `AI Аудит завершён! Оценка: ${data.score}/100`)
        fetchCalls()
        fetchAudits()
      } else {
        toast.error(data.error || 'Таҳлилда хатолик')
      }
    } catch {
      toast.error('Сервер билан алоқада хатолик')
    } finally {
      setAnalyzingCallId(null)
    }
  }

  // Batch analyze 5 recent calls
  const handleBatchAnalyze = async () => {
    if (!companyId) return
    setBatchAnalyzing(true)

    try {
      const res = await fetch(`/api/${companyId}/calls/batch-analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 5 }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success(language === 'uz' ? `${data.analyzedCount} ta qo‘ng‘iroq AI audit qilindi!` : `${data.analyzedCount} звонков успешно проанализированы!`)
        fetchCalls()
        fetchAudits()
      } else {
        toast.error(data.error || 'Хатолик')
      }
    } catch {
      toast.error('Сервер хатоси')
    } finally {
      setBatchAnalyzing(false)
    }
  }

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 border border-border/60 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
        <div className="absolute right-0 top-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/15 border border-blue-500/25 shadow-[0_0_16px_rgba(59,130,246,0.15)]">
              <ClipboardList size={22} className="text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  {language === 'uz' ? 'AI Qo‘ng‘iroqlar Auditi' : 'AI Аудит и Звонки'}
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  {totalCallsCount.toLocaleString()} amoCRM
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {language === 'uz'
                  ? 'Yozuv → Transkripsiya → AI Score → Chek-list → Xatolar → Tavsiya'
                  : 'Запись → Транскрипция → AI Score → Чек-лист → Ошибки → Рекомендация'}
              </p>
            </div>
          </div>
        </div>

        {/* Manual Audit + Batch Analyze + Refresh buttons */}
        <div className="relative flex items-center gap-2 flex-wrap">
          {/* Manual Upload button */}
          <a
            href="/audits/manual"
            className="px-4 py-2.5 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 text-xs font-black flex items-center gap-2 hover:bg-purple-500/25 hover:scale-105 active:scale-95 transition-all"
          >
            <Upload size={14} />
            {language === 'uz' ? 'Qo\'lda tahlil' : 'Ручной анализ'}
          </a>

          <button
            onClick={handleBatchAnalyze}
            disabled={batchAnalyzing}
            className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-black flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            <Sparkles size={14} className={cn(batchAnalyzing && 'animate-spin')} />
            {batchAnalyzing
              ? (language === 'uz' ? 'AI tahlil qilinmoqda...' : 'Анализируем...')
              : (language === 'uz' ? '⚡ 5 ta qo‘ng‘iroqni AI Audit qilish' : '⚡ AI Аудит 5 звонков')}
          </button>

          <button
            onClick={() => { fetchCalls(); fetchAudits() }}
            className="p-2.5 rounded-2xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 transition-all active:scale-95"
            title="Yangilash"
          >
            <RefreshCw size={15} className={cn((loadingCalls || loadingAudits) && 'animate-spin text-primary')} />
          </button>
        </div>
      </div>

      {/* ─── Tab Bar & Search ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-card border border-border/60">
          <button
            onClick={() => setActiveTab('all_calls')}
            className={cn(
              'py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
              activeTab === 'all_calls'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Phone size={14} />
            {language === 'uz' ? 'Barcha qo‘ng‘iroqlar' : 'Все звонки CRM'} ({totalCallsCount.toLocaleString()})
          </button>

          <button
            onClick={() => setActiveTab('completed_audits')}
            className={cn(
              'py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2',
              activeTab === 'completed_audits'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Star size={14} />
            {language === 'uz' ? 'AI Audit qilinganlar' : 'Аудированные звонки'} ({audits.length})
          </button>
        </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Only Answered conversations toggle */}
            <button
              onClick={() => setOnlyAnswered((p) => !p)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm',
                onlyAnswered
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                  : 'bg-card border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
              title={language === 'uz' ? 'Faqat gaplashilgan va audio yozuvi bor qo‘ng‘iroqlar' : 'Только отвеченные звонки с разговором'}
            >
              <Phone size={13} />
              <span>{onlyAnswered ? (language === 'uz' ? '✓ Faqat suhbatlar (>10s)' : '✓ Только разговоры') : (language === 'uz' ? 'Barcha statuslar' : 'Все статусы')}</span>
            </button>

            <div className="relative min-w-[150px] sm:min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'uz' ? 'Telefon yoki ism...' : 'Телефон или имя...'}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>

            {/* amoCRM Filter & Sync Button */}
            <div className="relative">
              <button
                onClick={() => setShowFilterModal((p) => !p)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all shadow-sm',
                  filterManagerId || filterPreset !== 'all_time'
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                    : 'bg-card border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                <Filter size={14} className={cn(filterManagerId || filterPreset !== 'all_time' ? 'text-cyan-400' : 'text-muted-foreground')} />
                <span>{language === 'uz' ? 'Filtr / Sinxron' : 'Фильтр / Синхрон'}</span>
                {(filterManagerId || filterPreset !== 'all_time') && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                )}
              </button>

              {/* amoCRM Filter Popover Modal */}
              {showFilterModal && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowFilterModal(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 z-50 animate-scale-up">
                    <AmoCRMFilterSync
                      companyId={companyId || ''}
                      initialFilter={{
                        managerId: filterManagerId,
                        preset: filterPreset,
                      }}
                      onApplyFilter={handleApplyAmoFilter}
                      onSyncComplete={() => {
                        fetchCalls()
                        fetchAudits()
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Active Filters Tag Row */}
        {(filterManagerId || filterPreset !== 'all_time') && (
          <div className="flex items-center gap-2 flex-wrap text-xs bg-cyan-500/5 border border-cyan-500/20 p-2.5 rounded-2xl animate-fade-in">
            <span className="text-muted-foreground font-semibold flex items-center gap-1 text-[11px]">
              <Filter size={12} className="text-cyan-400" />
              {language === 'uz' ? 'Faol filtrlar:' : 'Активные фильтры:'}
            </span>

            {filterPreset !== 'all_time' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 font-bold text-[11px]">
                <Clock size={11} />
                {AMOCRM_DATE_PRESETS.find((p) => p.id === filterPreset)?.labelRu || 'Танланган давр'}
              </span>
            )}

            {filterManagerId && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 font-bold text-[11px]">
                <User size={11} />
                {calls.find((c) => c.manager?.id === filterManagerId)?.manager?.name || 'Менежер'}
              </span>
            )}

            <button
              onClick={handleClearFilters}
              className="ml-auto text-[11px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline"
            >
              {language === 'uz' ? 'Tozalash' : 'Сбросить фильтры'}
            </button>
          </div>
        )}

      {/* ─── TAB 1: ALL REAL CRM CALLS ─────────────────────────────────────── */}
      {activeTab === 'all_calls' && (
        <div className="glass-card rounded-3xl border border-border/60 overflow-hidden">
          {loadingCalls ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 rounded-2xl skeleton" />
              ))}
            </div>
          ) : calls.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Phone size={40} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="font-bold text-foreground">Qo‘ng‘iroqlar topilmadi</p>
              <p className="text-xs mt-1">amoCRM bilan sinxronizatsiya qiling</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-bold">
                    <th className="p-4">Sana va vaqt</th>
                    <th className="p-4">Mijoz (Telefon)</th>
                    <th className="p-4">Menejer</th>
                    <th className="p-4">Davomiyligi</th>
                    <th className="p-4">Yozuv / Audio</th>
                    <th className="p-4">AI Audit Holati</th>
                    <th className="p-4 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {calls.map((c) => {
                    const isAudited = Boolean(c.audit) || c.analysisStatus === 'COMPLETED'
                    const isAnalyzing = analyzingCallId === c.id

                    return (
                      <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="p-4 font-mono text-muted-foreground">
                          {new Date(c.startedAt).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        <td className="p-4">
                          <div>
                            <p className="font-bold text-foreground">{c.customer?.name || c.customerPhone || 'Mijoz'}</p>
                            {c.customerPhone && (
                              <p className="text-[11px] text-muted-foreground font-mono">{c.customerPhone}</p>
                            )}
                          </div>
                        </td>

                        <td className="p-4">
                          <span className="font-semibold text-foreground">
                            {c.manager?.name || 'Menejer'}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="font-mono font-bold text-foreground">
                            {formatDuration(c.talkDurationSeconds)}
                          </span>
                        </td>

                        <td className="p-4">
                          {c.externalRecordingUrl ? (
                            <a
                              href={c.externalRecordingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-[11px] font-bold text-blue-400 border border-border/50 transition-all"
                            >
                              <Play size={11} /> MP3 tinglash
                            </a>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Audio mavjud</span>
                          )}
                        </td>

                        <td className="p-4">
                          {isAudited ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-green-500/15 text-green-400 border border-green-500/30 text-[11px] font-bold">
                              <CheckCircle2 size={12} />
                              {c.aiScore || c.audit?.finalScore || 85}/100 Ball
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted/60 text-muted-foreground text-[11px]">
                              Kutilmoqda
                            </span>
                          )}
                        </td>

                        <td className="p-4 text-right">
                          {isAudited ? (
                            <Link
                              href={`/audits/${c.audit?.id || c.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-bold transition-all"
                            >
                              Hisobotni ko‘rish
                              <ChevronRight size={13} />
                            </Link>
                          ) : (
                            <button
                              onClick={() => handleAnalyzeCall(c.id)}
                              disabled={isAnalyzing}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-black shadow-md shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                            >
                              <Sparkles size={12} className={cn(isAnalyzing && 'animate-spin')} />
                              {isAnalyzing ? 'Tahlil...' : 'AI Audit'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="p-4 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Jami {totalCallsCount.toLocaleString()} ta qo‘ng‘iroqdan ({callsPage * 25 - 24} - {Math.min(callsPage * 25, totalCallsCount)})
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCallsPage((p) => Math.max(1, p - 1))}
                    disabled={callsPage === 1}
                    className="p-2 rounded-xl bg-card border border-border/60 disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-bold px-2">{callsPage}</span>
                  <button
                    onClick={() => setCallsPage((p) => p + 1)}
                    disabled={callsPage * 25 >= totalCallsCount}
                    className="p-2 rounded-xl bg-card border border-border/60 disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: COMPLETED AI AUDITS ───────────────────────────────────── */}
      {activeTab === 'completed_audits' && (
        <div className="glass-card rounded-3xl border border-border/60 overflow-hidden">
          {loadingAudits ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl skeleton" />
              ))}
            </div>
          ) : audits.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-3">
              <ClipboardList size={40} className="mx-auto text-muted-foreground/30" />
              <p className="font-bold text-foreground">Hozircha audit qilingan qo‘ng‘iroqlar yo‘q</p>
              <p className="text-xs">«Barcha qo‘ng‘iroqlar» bo‘limidan birorta qo‘ng‘iroqda «AI Audit» tugmasini bosing yoki yuqoridagi ⚡ tugmani bosing!</p>
              <button
                onClick={handleBatchAnalyze}
                className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl"
              >
                ⚡ 5 ta qo‘ng‘iroqni hozir audit qilish
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-bold">
                    <th className="p-4">Sana</th>
                    <th className="p-4">Mijoz</th>
                    <th className="p-4">Menejer</th>
                    <th className="p-4">Turi</th>
                    <th className="p-4">AI Ball</th>
                    <th className="p-4">Yakuniy Ball</th>
                    <th className="p-4 text-right">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {audits.map((a) => (
                    <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-mono text-muted-foreground">{formatDateTime(a.completedAt)}</td>
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-foreground">{a.call.customer?.name || a.call.customerPhone || 'Mijoz'}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">{a.call.customerPhone}</p>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-foreground">{a.call.manager?.name || 'Menejer'}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-muted-foreground font-medium">{a.callType || 'SALE'}</span>
                          {a.hasCriticalFails && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">
                              ⚠️ Kritik
                            </span>
                          )}
                          {a.callResult && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold">
                              {a.callResult}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-foreground">{a.aiScore}/{a.maxPossibleScore || 100}</td>
                      <td className="p-4">
                        <span className={cn('font-black text-sm', getScoreColor(a.finalScore, a.maxPossibleScore || 100))}>
                          {a.finalScore}/{a.maxPossibleScore || 100}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Link
                          href={`/audits/${a.id}`}
                          className="inline-flex items-center gap-1 text-primary font-bold hover:underline"
                        >
                          Batafsil
                          <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
