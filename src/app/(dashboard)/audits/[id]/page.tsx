'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ClipboardList,
  Play,
  ArrowLeft,
  User,
  Calendar,
  Clock,
  BarChart2,
  CheckCircle,
  XCircle,
  Minus,
  Edit2,
  Send,
  Languages,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  History,
  Briefcase,
  TrendingUp,
} from 'lucide-react'
import { cn, formatDateTime, formatDuration, getScoreColor } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────

type CriterionStatus = 'PASS' | 'PARTIAL' | 'FAIL' | 'NOT_APPLICABLE' | null

interface CriterionResult {
  id: string
  criterionId: string
  criterionCode: string
  aiScore: number
  finalScore: number
  maxScore: number
  passed: boolean
  explanationUz?: string
  evidenceTimestamp?: string
  evidenceQuote?: string
  // OKK fields
  status?: CriterionStatus
  strengthsJson?: unknown
  errorsJson?: unknown
  recommendationsJson?: unknown
  criticalFail?: boolean
  isOverridden?: boolean
  criterion?: {
    section: string
    nameUz: string
    nameRu: string
    sort: number
    isCritical: boolean
  }
}

interface ScoreHistoryEntry {
  id: string
  criterionId?: string
  oldScore: number
  newScore: number
  comment?: string
  changedAt: string
  changedByUser?: { id: string; name: string; email: string }
}

interface BusinessAnalysis {
  callContext?: string
  customerRequest?: string
  productDemand?: string
  operations?: string
  logistics?: string
  objections?: string
  refusalReasons?: string
  marketingInsights?: string
  managerPerformance?: string
  customerSentiment?: string
  businessInsights?: string
  managementRecommendations?: string
}

interface TranscriptSegment {
  id: string
  speaker: 'MANAGER' | 'CUSTOMER' | 'AGENT' | 'CALLER'
  text: string
  startSeconds: number
  endSeconds: number
}

interface AuditDetail {
  id: string
  callId: string
  aiScore: number
  finalScore: number
  maxPossibleScore: number
  summary: string
  strengthsJson: string[]
  mistakesJson: string[]
  recommendationsJson: string[]
  customerNeedsJson: string[]
  objectionsJson: unknown[]
  saleProbability: number
  managerTalkRatio: number
  customerTalkRatio: number
  interruptionsCount: number
  longPausesCount: number
  fillerWordsJson: unknown[]
  rudenessDetected: boolean
  falsePromisesDetected: boolean
  scriptComplianceScore: number
  callType: string
  completedAt: string
  // OKK fields
  hasCriticalFails?: boolean
  callResult?: string
  ropRecommendation?: string
  businessAnalysisJson?: BusinessAnalysis
  nextStep?: string
  criterionResults: CriterionResult[]
  scoreHistory?: ScoreHistoryEntry[]
  call: {
    id: string
    customerPhone: string
    talkDurationSeconds: number
    manager?: { name: string }
    customer?: { name: string }
    recording?: { s3Key: string }
    transcript?: {
      rawText: string
      language: string
      segments: TranscriptSegment[]
    }
  }
}

type ActiveTab = 'checklist' | 'business' | 'transcript' | 'analytics' | 'history'

// ─── Status Badge ─────────────────────────────────────────────────

function StatusBadge({ status, isCriticalFail }: { status: CriterionStatus; isCriticalFail?: boolean }) {
  if (isCriticalFail) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 uppercase tracking-wide">
        <AlertTriangle size={8} />
        КРИТИК ХАТО
      </span>
    )
  }
  if (!status) {
    return (
      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-muted/30 border border-border text-muted-foreground uppercase tracking-wide">
        legacy
      </span>
    )
  }
  const map: Record<string, { label: string; cls: string }> = {
    PASS: { label: 'PASS', cls: 'bg-green-500/15 border-green-500/30 text-green-400' },
    PARTIAL: { label: 'PARTIAL', cls: 'bg-amber-500/15 border-amber-500/30 text-amber-400' },
    FAIL: { label: 'FAIL', cls: 'bg-red-500/15 border-red-500/30 text-red-400' },
    NOT_APPLICABLE: { label: 'N/A', cls: 'bg-muted/30 border-border text-muted-foreground' },
  }
  const { label, cls } = map[status] || map.FAIL
  return (
    <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide', cls)}>
      {label}
    </span>
  )
}

// ─── Criterion Accordion Item ─────────────────────────────────────

function CriterionItem({
  cr,
  onEdit,
  onSeek,
}: {
  cr: CriterionResult
  onEdit: (cr: CriterionResult) => void
  onSeek: (sec: number) => void
}) {
  const [open, setOpen] = useState(false)
  const parseArr = (v: unknown): string[] => {
    if (Array.isArray(v)) return v as string[]
    if (typeof v === 'string') {
      try { const p = JSON.parse(v); return Array.isArray(p) ? p : [] } catch { return [] }
    }
    return []
  }
  const strengths = parseArr(cr.strengthsJson)
  const errors = parseArr(cr.errorsJson)
  const recs = parseArr(cr.recommendationsJson)
  const isCritical = cr.criterion?.isCritical
  const isNA = cr.status === 'NOT_APPLICABLE'
  const isCriticalFail = cr.criticalFail

  return (
    <div
      className={cn(
        'border-b border-border/60 last:border-b-0 transition-colors',
        isCriticalFail ? 'bg-red-500/5' : 'hover:bg-muted/5'
      )}
    >
      {/* Collapsed header */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        {/* Status icon */}
        <div className="shrink-0">
          {isNA ? (
            <Minus className="text-muted-foreground/50" size={16} />
          ) : isCriticalFail ? (
            <AlertTriangle className="text-red-500" size={16} />
          ) : cr.status === 'PASS' ? (
            <CheckCircle className="text-green-500" size={16} />
          ) : cr.status === 'PARTIAL' ? (
            <CheckCircle className="text-amber-400" size={16} />
          ) : cr.status === 'FAIL' ? (
            <XCircle className="text-red-500" size={16} />
          ) : cr.passed ? (
            <CheckCircle className="text-green-500" size={16} />
          ) : (
            <XCircle className="text-red-500" size={16} />
          )}
        </div>

        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-xs font-semibold truncate', isNA ? 'text-muted-foreground' : 'text-foreground')}>
              {cr.criterion?.nameUz || cr.criterionCode}
            </span>
            {isCritical && !isNA && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 uppercase tracking-wide shrink-0">
                критик
              </span>
            )}
            {cr.isOverridden && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400 uppercase tracking-wide shrink-0">
                QC
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <StatusBadge status={cr.status ?? null} isCriticalFail={isCriticalFail} />
          </div>
        </div>

        {/* Score */}
        <div className="shrink-0 text-right mr-2">
          <span className={cn('text-sm font-bold', isNA ? 'text-muted-foreground/50' : getScoreColor(cr.finalScore, cr.maxScore))}>
            {isNA ? '—' : `${cr.finalScore}/${cr.maxScore}`}
          </span>
          {cr.isOverridden && cr.aiScore !== cr.finalScore && (
            <span className="block text-[9px] text-muted-foreground line-through">
              AI: {cr.aiScore}
            </span>
          )}
        </div>

        <div className="shrink-0 text-muted-foreground">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
          {/* Explanation */}
          {cr.explanationUz && (
            <p className="text-xs text-foreground/80 leading-relaxed">{cr.explanationUz}</p>
          )}

          {/* NOT_APPLICABLE note */}
          {isNA && (
            <div className="p-2.5 bg-muted/20 rounded-xl text-[11px] text-muted-foreground border border-border/40">
              ⚪ Бу мезон ушбу қўнғироқ туriga тегишли эмас — умумий баллдан чиқарилди.
            </div>
          )}

          {/* Evidence quote + seek */}
          {cr.evidenceQuote && (
            <div className="bg-muted/20 p-2.5 rounded-xl border border-border/40 text-[10px] italic text-muted-foreground relative">
              «{cr.evidenceQuote}»
              {cr.evidenceTimestamp && (
                <button
                  onClick={() => onSeek(parseFloat(cr.evidenceTimestamp!))}
                  className="absolute right-2 bottom-2 text-[9px] text-primary font-semibold flex items-center gap-1 hover:underline"
                >
                  <Play size={8} />
                  {formatDuration(parseFloat(cr.evidenceTimestamp))}
                </button>
              )}
            </div>
          )}

          {/* Per-criterion findings */}
          {(strengths.length > 0 || errors.length > 0 || recs.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {strengths.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-green-400 mb-1">✅ Кучли томонлар</p>
                  <ul className="space-y-0.5">
                    {strengths.map((s, i) => (
                      <li key={i} className="text-[10px] text-foreground/70">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {errors.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-red-400 mb-1">❌ Хатолар</p>
                  <ul className="space-y-0.5">
                    {errors.map((e, i) => (
                      <li key={i} className="text-[10px] text-foreground/70">• {e}</li>
                    ))}
                  </ul>
                </div>
              )}
              {recs.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-violet-400 mb-1">💡 Тавсиялар</p>
                  <ul className="space-y-0.5">
                    {recs.map((r, i) => (
                      <li key={i} className="text-[10px] text-foreground/70">• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Score override button */}
          {!isNA && (
            <div className="flex justify-end pt-1">
              <button
                onClick={() => onEdit(cr)}
                className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground font-semibold px-3 py-1.5 rounded-lg bg-muted/50 border border-border hover:bg-muted transition-all"
              >
                <Edit2 size={10} />
                Баҳони ўзгартириш
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page Component ───────────────────────────────────────────────

export default function AuditDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [audit, setAudit] = useState<AuditDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<ActiveTab>('checklist')
  const [editingCr, setEditingCr] = useState<CriterionResult | null>(null)
  const [overrideScore, setOverrideScore] = useState<number>(0)
  const [overrideComment, setOverrideComment] = useState<string>('')
  const [updatingScore, setUpdatingScore] = useState(false)

  const [sendingCrm, setSendingCrm] = useState(false)
  const [crmStatusMsg, setCrmStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCompanyId(d.user.companyId)
        else { setError('Авторизациядан ўтилмаган'); setLoading(false) }
      })
      .catch(() => { setError('Тизим билан алоқа йўқ'); setLoading(false) })
  }, [])

  const parseJsonArray = (val: unknown): unknown[] => {
    if (Array.isArray(val)) return val
    if (typeof val === 'string') {
      try { const p = JSON.parse(val); return Array.isArray(p) ? p : [] } catch { return [] }
    }
    return []
  }

  const fetchAuditDetail = () => {
    if (!companyId || !params.id) return
    setLoading(true)
    setError(null)
    fetch(`/api/${companyId}/audits/${params.id}`)
      .then((r) => { if (!r.ok) throw new Error('Маълумотларни юклаб бўлмади'); return r.json() })
      .then((d) => {
        if (d.success && d.data) {
          const raw = d.data
          setAudit({
            ...raw,
            strengthsJson: parseJsonArray(raw.strengthsJson) as string[],
            mistakesJson: parseJsonArray(raw.mistakesJson) as string[],
            recommendationsJson: parseJsonArray(raw.recommendationsJson) as string[],
            customerNeedsJson: parseJsonArray(raw.customerNeedsJson) as string[],
            objectionsJson: parseJsonArray(raw.objectionsJson),
            fillerWordsJson: parseJsonArray(raw.fillerWordsJson),
            importantQuotesJson: parseJsonArray(raw.importantQuotesJson),
          })
        } else {
          setError(d.error || 'Аудит топилмади')
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (companyId && params.id) fetchAuditDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, params.id])

  // Audio player seek (PROTECTED — do not modify)
  const playFromSecond = (sec: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = sec
      audioRef.current.play().catch(() => null)
    }
  }

  // Score override (PROTECTED logic — only UI extended)
  const handleScoreOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId || !audit || !editingCr) return
    setUpdatingScore(true)
    try {
      const response = await fetch(`/api/${companyId}/audits/${audit.id}/score`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criterionId: editingCr.criterionId, newScore: overrideScore, comment: overrideComment }),
      })
      const data = await response.json()
      if (data.success) {
        setAudit((prev) => {
          if (!prev) return null
          return {
            ...prev,
            finalScore: data.finalScore,
            criterionResults: prev.criterionResults.map((r) =>
              r.criterionId === editingCr.criterionId
                ? { ...r, finalScore: overrideScore, passed: overrideScore > 0, isOverridden: true }
                : r
            ),
          }
        })
        setEditingCr(null)
        setOverrideComment('')
      } else {
        alert(data.error || 'Хатолик юз берди')
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Тизим билан боғланишда хатолик')
    } finally {
      setUpdatingScore(false)
    }
  }

  // CRM send (PROTECTED)
  const sendToCrm = async () => {
    if (!companyId || !audit) return
    setSendingCrm(true)
    setCrmStatusMsg(null)
    try {
      const res = await fetch(`/api/${companyId}/audits/${audit.id}/send-to-crm`, { method: 'POST' })
      const data = await res.json()
      if (data.success) setCrmStatusMsg({ type: 'success', text: data.message || 'Аудит хулосаси CRM га юборилди!' })
      else setCrmStatusMsg({ type: 'error', text: data.error || 'CRM га юборишда хатолик юз берди' })
    } catch (err: unknown) {
      setCrmStatusMsg({ type: 'error', text: err instanceof Error ? err.message : 'Тизим билан боғланишда хатолик' })
    } finally {
      setSendingCrm(false)
    }
  }

  // ─── Section grouping ──────────────────────────────────────────

  const SECTION_MAP: Record<string, { title: string; order: number }> = {
    'greeting_start': { title: '1. Саломлашиш ва танишув', order: 1 },
    'need_identification': { title: '2. Эҳтиёжни аниқлаш', order: 2 },
    'presentation': { title: '3. Презентация ва таклиф', order: 3 },
    'objection_handling': { title: '4. Эітирозлар билан ишлаш', order: 4 },
    'closing': { title: '5. Келишув ва кейинги қадам', order: 5 },
    'speech_ethics': { title: '6. Мулоқот одоби', order: 6 },
  }

  const groupedCriteria = audit
    ? Object.entries(
        audit.criterionResults.reduce((acc, cr) => {
          const sectionKey =
            cr.criterion?.section ||
            (cr.criterionCode.startsWith('greeting_') ? 'greeting_start'
              : cr.criterionCode.startsWith('need_') ? 'need_identification'
              : cr.criterionCode.startsWith('presentation_') ? 'presentation'
              : cr.criterionCode.startsWith('objection_') ? 'objection_handling'
              : cr.criterionCode.startsWith('closing_') ? 'closing'
              : cr.criterionCode.startsWith('ethics_') ? 'speech_ethics' : 'other')
          if (!acc[sectionKey]) acc[sectionKey] = []
          acc[sectionKey].push(cr)
          return acc
        }, {} as Record<string, CriterionResult[]>)
      )
        .map(([key, results]) => {
          const sorted = [...results].sort((a, b) => (a.criterion?.sort ?? 0) - (b.criterion?.sort ?? 0) || a.criterionCode.localeCompare(b.criterionCode))
          const meta = SECTION_MAP[key] || { title: key, order: 99 }
          const sectionScore = sorted.filter(r => r.status !== 'NOT_APPLICABLE').reduce((s, r) => s + r.finalScore, 0)
          const sectionMax = sorted.filter(r => r.status !== 'NOT_APPLICABLE').reduce((s, r) => s + r.maxScore, 0)
          const hasCritical = sorted.some(r => r.criticalFail)
          return { key, title: meta.title, order: meta.order, results: sorted, sectionScore, sectionMax, hasCritical }
        })
        .sort((a, b) => a.order - b.order)
    : []

  // ─── Tabs config ──────────────────────────────────────────────

  const TABS: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'checklist', label: 'Чек-лист', icon: <ClipboardList size={14} /> },
    { id: 'business', label: 'Бизнес таҳлил', icon: <Briefcase size={14} /> },
    { id: 'transcript', label: 'Стенограмма', icon: <Languages size={14} /> },
    { id: 'analytics', label: 'Аналитика', icon: <BarChart2 size={14} /> },
    { id: 'history', label: 'Тарих', icon: <History size={14} /> },
  ]

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/audits')}
            className="p-2 rounded-xl bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Аудит таҳлили</h1>
            <p className="text-muted-foreground text-xs mt-0.5">OKK — Сифат Назорати стандарти</p>
          </div>
        </div>

        {audit && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open(`/audits/${audit.id}/pdf`, '_blank')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all shadow-md bg-muted hover:bg-muted/80 text-foreground border border-border"
            >
              <FileText size={16} className="text-violet-400" />
              PDF Ҳисобот
            </button>
            <button
              onClick={sendToCrm}
              disabled={sendingCrm}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all shadow-md',
                sendingCrm ? 'bg-muted text-muted-foreground cursor-not-allowed' : 'bg-primary hover:bg-primary/95 text-primary-foreground'
              )}
            >
              <Send size={16} />
              {sendingCrm ? 'Юборилмоқда...' : 'amoCRM га юбориш'}
            </button>
          </div>
        )}
      </div>

      {/* CRM status */}
      {crmStatusMsg && (
        <div className={cn('p-4 rounded-xl border text-sm flex items-center justify-between animate-fade-in', crmStatusMsg.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400')}>
          <span>{crmStatusMsg.text}</span>
          <button onClick={() => setCrmStatusMsg(null)} className="text-xs font-semibold hover:underline">Ёпиш</button>
        </div>
      )}

      {loading ? (
        <div className="skeleton h-80 rounded-2xl animate-pulse" />
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 text-center border-red-500/20">
          <p className="text-red-400 font-medium">{error}</p>
          <button onClick={fetchAuditDetail} className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-all">
            Қайта уриниш
          </button>
        </div>
      ) : !audit ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <ClipboardList className="mx-auto text-muted-foreground/30 mb-3" size={40} />
          <p className="font-medium text-foreground">Аудит топилмади</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Left: Main content ──────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* CRITICAL FAIL ALERT */}
            {audit.hasCriticalFails && (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 animate-fade-in">
                <AlertTriangle size={20} className="shrink-0" />
                <div>
                  <p className="text-sm font-bold">Критик хато аниқланди</p>
                  <p className="text-xs text-red-400/80 mt-0.5">Бу қўнғироқда бир ёки бир нечта критик мезон тўлиқ бузилган. Менежер билан тезда ишлаш тавсия этилади.</p>
                </div>
              </div>
            )}

            {/* Summary + Scores card */}
            <div className="glass-card rounded-2xl p-6 border border-border flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                    {audit.callType || 'NEW_LEAD'}
                  </span>
                  {audit.callResult && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      {audit.callResult}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-foreground text-base">Хулоса</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{audit.summary}</p>
                {audit.nextStep && (
                  <p className="text-xs text-violet-400 font-medium mt-1">🎯 Кейинги қадам: {audit.nextStep}</p>
                )}
              </div>

              {/* Scores block — AI Score vs QC Score */}
              <div className="flex items-center gap-4 self-start md:self-center bg-muted/20 border border-border/50 p-4 rounded-2xl shrink-0">
                <div className="text-center">
                  <span className={cn('text-3xl font-extrabold block', getScoreColor(audit.finalScore, audit.maxPossibleScore))}>
                    {audit.finalScore}
                  </span>
                  <span className="text-[9px] text-muted-foreground block">QC Балл</span>
                </div>
                {audit.aiScore !== audit.finalScore && (
                  <>
                    <div className="h-8 w-px bg-border" />
                    <div className="text-center">
                      <span className="text-lg font-bold block text-muted-foreground line-through">
                        {audit.aiScore}
                      </span>
                      <span className="text-[9px] text-muted-foreground block">AI Балл</span>
                    </div>
                  </>
                )}
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <span className="text-[10px] font-medium text-muted-foreground block">мах</span>
                  <span className="text-lg font-bold block text-foreground">{audit.maxPossibleScore}</span>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <span className="text-xl font-bold block text-violet-400">{audit.saleProbability}%</span>
                  <span className="text-[9px] text-muted-foreground block">Сотув</span>
                </div>
              </div>
            </div>

            {/* Audio player (PROTECTED) */}
            <div className="glass-card rounded-2xl p-4 border border-border space-y-2">
              <p className="text-xs font-semibold text-foreground">Звонок ёзуви</p>
              <audio
                ref={audioRef}
                controls
                src={`/api/${companyId}/calls/${audit.call.recording ? audit.call.id : ''}/audio`}
                className="w-full"
              />
            </div>

            {/* Tab navigation */}
            <div className="flex border-b border-border gap-1 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 pb-3 px-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap',
                    activeTab === tab.id
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ─── Tab: Checklist ──────────────────────────── */}
            {activeTab === 'checklist' && (
              <div className="space-y-4">
                {groupedCriteria.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Чек-лист мезонлари топилмади.</p>
                ) : (
                  groupedCriteria.map((group) => (
                    <div key={group.key} className="glass-card rounded-2xl border border-border overflow-hidden">
                      {/* Section header */}
                      <div className={cn(
                        'flex items-center justify-between px-4 py-3 border-b border-border/50',
                        group.hasCritical ? 'bg-red-500/5' : 'bg-muted/10'
                      )}>
                        <div className="flex items-center gap-2">
                          {group.hasCritical && <AlertTriangle size={13} className="text-red-400 shrink-0" />}
                          <span className="text-sm font-bold text-foreground">{group.title}</span>
                        </div>
                        <div className="text-xs font-bold">
                          <span className={getScoreColor(group.sectionScore, group.sectionMax)}>
                            {group.sectionScore}/{group.sectionMax}
                          </span>
                        </div>
                      </div>
                      {/* Criterion items */}
                      <div className="divide-y divide-border/40">
                        {group.results.map((cr) => (
                          <CriterionItem
                            key={cr.id}
                            cr={cr}
                            onEdit={(c) => { setEditingCr(c); setOverrideScore(c.finalScore) }}
                            onSeek={playFromSecond}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ─── Tab: Business Analysis ───────────────────── */}
            {activeTab === 'business' && (
              <div className="space-y-4">
                {!audit.businessAnalysisJson || Object.keys(audit.businessAnalysisJson).length === 0 ? (
                  <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground border border-border">
                    <Briefcase className="mx-auto mb-3 text-muted-foreground/30" size={40} />
                    <p className="font-medium text-foreground text-sm">Бизнес таҳлил мавжуд эмас</p>
                    <p className="text-xs mt-1">Бу аудит OKK тарзида ишланмаган ёки транскриптда маълумот йўқ.</p>
                  </div>
                ) : (
                  <>
                    {/* ROP recommendation */}
                    {audit.ropRecommendation && (
                      <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 space-y-1">
                        <p className="text-xs font-bold text-violet-400 flex items-center gap-1.5"><TrendingUp size={12} /> РОП учун тавсия</p>
                        <p className="text-xs text-foreground/80 leading-relaxed">{audit.ropRecommendation}</p>
                      </div>
                    )}
                    {/* Business analysis blocks */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(Object.entries(audit.businessAnalysisJson) as [keyof BusinessAnalysis, string][])
                        .filter(([, v]) => v)
                        .map(([key, value]) => {
                          const labels: Record<keyof BusinessAnalysis, string> = {
                            callContext: '📞 Қўнғироқ контекст',
                            customerRequest: '🙋 Мижоз мурожаати',
                            productDemand: '📦 Маҳсулот талаби',
                            operations: '⚙️ Операция масалалар',
                            logistics: '🚚 Логистика',
                            objections: '🛑 Эітирозлар',
                            refusalReasons: '❌ Рад сабаблари',
                            marketingInsights: '📣 Маркетинг',
                            managerPerformance: '👤 Менежер компетенция',
                            customerSentiment: '😊 Мижоз кайфияти',
                            businessInsights: '💡 Бизнес инсайт',
                            managementRecommendations: '📋 Бошқаруव тавсия',
                          }
                          return (
                            <div key={key} className="glass-card rounded-xl p-4 border border-border/60 space-y-1">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{labels[key] || key}</p>
                              <p className="text-xs text-foreground leading-relaxed">{value}</p>
                            </div>
                          )
                        })
                      }
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ─── Tab: Transcript ─────────────────────────── */}
            {activeTab === 'transcript' && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-[11px] leading-relaxed flex items-start gap-2">
                  <span className="shrink-0">⚠️</span>
                  <span>Спикерларни ажратиш автоматик тарзда амалга оширилган ва айрим ҳолатларда хатолик бўлиши мумкин.</span>
                </div>
                {!audit.call.transcript || audit.call.transcript.segments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">Стенограмма мавжуд эмас.</p>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {audit.call.transcript.segments.map((seg) => {
                      const isManager = seg.speaker === 'MANAGER' || seg.speaker === 'AGENT'
                      return (
                        <div
                          key={seg.id}
                          className={cn(
                            'flex flex-col gap-1 max-w-[85%] rounded-2xl p-3 border shadow-sm transition-all',
                            isManager ? 'bg-primary/5 border-primary/10 ml-auto' : 'bg-card border-border'
                          )}
                        >
                          <div className="flex items-center justify-between gap-6">
                            <span className={cn('text-[9px] font-bold uppercase tracking-wider', isManager ? 'text-primary' : 'text-amber-500')}>
                              {isManager ? 'Менежер' : 'Мижоз'}
                            </span>
                            <button
                              onClick={() => playFromSecond(seg.startSeconds)}
                              className="text-[9px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 transition-all"
                            >
                              <Play size={8} />
                              {formatDuration(seg.startSeconds)}
                            </button>
                          </div>
                          <p className="text-xs text-foreground mt-0.5 leading-relaxed">{seg.text}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─── Tab: Analytics ──────────────────────────── */}
            {activeTab === 'analytics' && (
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-[11px] leading-relaxed flex items-start gap-2">
                  <span className="shrink-0">⚠️</span>
                  <span>Мулоқот улуши, бўлишлар ва паузалар кўрсаткичлари фақат маълумот учун ва жарима қўллашга асос бўла олмайди.</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Talk ratio */}
                  <div className="glass-card rounded-2xl p-6 border border-border space-y-4">
                    <h4 className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                      <BarChart2 size={16} className="text-primary" />
                      Мулоқот улуши
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Менежер</span>
                          <span className="font-bold">{audit.managerTalkRatio}%</span>
                        </div>
                        <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                          <div className="bg-primary h-full rounded-full" style={{ width: `${audit.managerTalkRatio}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Мижоз</span>
                          <span className="font-bold">{audit.customerTalkRatio}%</span>
                        </div>
                        <div className="w-full bg-border h-2 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full rounded-full" style={{ width: `${audit.customerTalkRatio}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Parameters */}
                  <div className="glass-card rounded-2xl p-6 border border-border space-y-3 text-xs">
                    <h4 className="font-semibold text-foreground text-sm border-b border-border pb-2">Параметрлар</h4>
                    {[
                      { label: 'Бир-бирини бўлишлар', value: `${audit.interruptionsCount} марта` },
                      { label: 'Узун паузалар', value: `${audit.longPausesCount} та` },
                      { label: 'Скрипт мослик', value: `${audit.scriptComplianceScore}%` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between border-b border-border/50 pb-2">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold">{value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-b border-border/50 pb-2">
                      <span className="text-muted-foreground">Қўполлик</span>
                      <span className={cn('font-semibold', audit.rudenessDetected ? 'text-red-400' : 'text-green-400')}>
                        {audit.rudenessDetected ? 'Аниқланди' : 'Йўқ'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ёлғон ваъдалар</span>
                      <span className={cn('font-semibold', audit.falsePromisesDetected ? 'text-red-400' : 'text-green-400')}>
                        {audit.falsePromisesDetected ? 'Аниқланди' : 'Йўқ'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── Tab: History ────────────────────────────── */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                {!audit.scoreHistory || audit.scoreHistory.length === 0 ? (
                  <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground border border-border">
                    <History className="mx-auto mb-3 text-muted-foreground/30" size={40} />
                    <p className="font-medium text-foreground text-sm">Тарих мавжуд эмас</p>
                    <p className="text-xs mt-1">Ҳали ҳеч қандай балл ўзгартирилмаган.</p>
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl border border-border overflow-hidden">
                    <div className="border-b border-border px-4 py-3 bg-muted/10">
                      <h3 className="text-sm font-bold text-foreground">Балл ўзгартириш тарихи</h3>
                    </div>
                    <div className="divide-y divide-border/50">
                      {audit.scoreHistory.map((entry) => {
                        const relatedCr = audit.criterionResults.find(r => r.criterionId === entry.criterionId)
                        const scoreColor = entry.newScore > entry.oldScore ? 'text-green-400' : 'text-red-400'
                        return (
                          <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
                            <div className="mt-0.5 w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                              <History size={13} className="text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-foreground">
                                  {relatedCr ? (relatedCr.criterion?.nameUz || relatedCr.criterionCode) : 'Умумий балл'}
                                </span>
                                <span className={cn('text-xs font-bold', scoreColor)}>
                                  {entry.oldScore} → {entry.newScore}
                                </span>
                              </div>
                              {entry.comment && (
                                <p className="text-[11px] text-muted-foreground mt-0.5">{entry.comment}</p>
                              )}
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {formatDateTime(entry.changedAt)}
                                {entry.changedByUser && ` · ${entry.changedByUser.name}`}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ─── Right: Sidebar ──────────────────────────────── */}
          <div className="space-y-5">
            {/* Details */}
            <div className="glass-card rounded-2xl p-5 border border-border space-y-4">
              <h3 className="font-bold text-foreground text-sm">Маълумотлар</h3>
              <div className="space-y-3 text-xs">
                {[
                  { icon: <User size={13} />, label: 'Менежер', value: audit.call.manager?.name || 'Номаълум' },
                  { icon: <User size={13} />, label: 'Мижоз', value: audit.call.customer?.name || 'Номаълум' },
                  { icon: <Calendar size={13} />, label: 'Аудит санаси', value: formatDateTime(audit.completedAt) },
                  { icon: <Clock size={13} />, label: 'Давомийлик', value: formatDuration(audit.call.talkDurationSeconds) },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center justify-between text-muted-foreground border-b border-border/50 pb-2">
                    <span className="flex items-center gap-1.5">{icon} {label}</span>
                    <span className="text-foreground font-medium truncate max-w-[120px]" title={value}>{value}</span>
                  </div>
                ))}
                {audit.call.transcript?.language && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Languages size={13} /> Тил</span>
                    <span className="text-foreground font-semibold uppercase">{audit.call.transcript.language}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Global strengths & mistakes */}
            <div className="glass-card rounded-2xl p-5 border border-border space-y-4">
              <h3 className="font-bold text-foreground text-sm border-b border-border pb-2">Умумий хулосалар</h3>
              {audit.strengthsJson.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-400 mb-1.5">Кучли томонлар</p>
                  <ul className="space-y-1 text-[11px] text-foreground/80">
                    {audit.strengthsJson.slice(0, 4).map((s, i) => (
                      <li key={i} className="flex gap-1.5"><span className="text-green-400 shrink-0">•</span><span>{s}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {audit.mistakesJson.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-1.5">Хатоликлар</p>
                  <ul className="space-y-1 text-[11px] text-foreground/80">
                    {audit.mistakesJson.slice(0, 4).map((m, i) => (
                      <li key={i} className="flex gap-1.5"><span className="text-red-400 shrink-0">•</span><span>{m}</span></li>
                    ))}
                  </ul>
                </div>
              )}
              {audit.recommendationsJson.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-violet-400 mb-1.5">Тавсия</p>
                  <p className="text-[11px] text-foreground/80 leading-relaxed">{audit.recommendationsJson[0]}</p>
                </div>
              )}
            </div>

            {/* Customer needs */}
            {audit.customerNeedsJson.length > 0 && (
              <div className="glass-card rounded-2xl p-5 border border-border space-y-2">
                <h3 className="font-bold text-foreground text-sm">Мижоз эҳтиёжлари</h3>
                <ul className="space-y-1 text-[11px] text-foreground/80">
                  {audit.customerNeedsJson.map((n, i) => (
                    <li key={i} className="flex gap-1.5"><span className="text-primary shrink-0">•</span><span>{n as string}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Score Override Modal (PROTECTED logic) ───────── */}
      {editingCr && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 animate-scale-up">
            <div>
              <h3 className="font-bold text-foreground text-base">Баҳони қўлда ўзгартириш</h3>
              <p className="text-xs text-muted-foreground mt-1">{editingCr.criterion?.nameUz || editingCr.criterionCode}</p>
              <p className="text-[10px] text-muted-foreground">Ҳозирги AI баҳо: <span className="font-bold text-foreground">{editingCr.aiScore}/{editingCr.maxScore}</span></p>
            </div>
            <form onSubmit={handleScoreOverride} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Янги балл (0–{editingCr.maxScore})</label>
                <input
                  type="number"
                  min="0"
                  max={editingCr.maxScore}
                  required
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(parseInt(e.target.value, 10))}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Изоҳ / Сабаб</label>
                <textarea
                  required
                  rows={3}
                  value={overrideComment}
                  onChange={(e) => setOverrideComment(e.target.value)}
                  placeholder="Баҳо ўзгариш сабабини ёзинг..."
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setEditingCr(null)} className="px-4 py-2 border border-border hover:bg-muted text-foreground font-semibold rounded-xl">
                  Бекор қилиш
                </button>
                <button type="submit" disabled={updatingScore} className="px-4 py-2 bg-primary text-primary-foreground hover:opacity-90 font-semibold rounded-xl shadow-md">
                  {updatingScore ? 'Сақланмоқда...' : 'Сақлаш'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
