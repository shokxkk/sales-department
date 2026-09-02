'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Upload,
  X,
  Mic,
  CheckCircle2,
  AlertCircle,
  Star,
  ChevronDown,
  ChevronUp,
  FileAudio,
  Clock,
  User,
  Building2,
  Loader2,
  Download,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Zap,
  Target,
  MessageSquare,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  Pencil,
  Save,
  PlusCircle,
  Trash2,
  Sparkles,
  GraduationCap,
} from 'lucide-react'
import { MARKETING_MARKAZI_LOGO_BASE64 } from '@/lib/constants/marketing-markazi-logo'
import { AmoCRMFilterSync, AmoCRMFilterState } from '@/components/ui/amocrm-filter-sync'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Types ─────────────────────────────────────────────────────────

interface CriterionResult {
  code: string
  nameUz: string
  score: number
  maxScore: number
  status: 'PASS' | 'PARTIAL' | 'FAIL' | 'NOT_APPLICABLE'
  passed: boolean
  isCritical: boolean
  criticalFail: boolean
  explanation: string
  strengths: string[]
  errors: string[]
  recommendations: string[]
  evidenceTimestamp?: string
  evidenceQuote?: string
}

interface ManualAuditReport {
  companyName: string
  managerName: string
  managerPosition: string
  customerName: string
  audioFileName: string
  audioDurationSeconds: number
  analyzedAt: string
  totalScore: number
  maxScore: number
  criteria: CriterionResult[]
  summary: string
  strengths: string[]
  mistakes: string[]
  recommendations: string[]
  ropRecommendation: string
  nextStep: string
  callResult: string
  hasCriticalFails: boolean
  businessAnalysis?: {
    callContext?: string
    customerRequest?: string
    productDemand?: string
    operations?: string
    objections?: string
    refusalReasons?: string
    marketingInsights?: string
    managerPerformance?: string
    customerSentiment?: string
    businessInsights?: string
    managementRecommendations?: string
  } | null
  managerTalkRatio: number
  customerTalkRatio: number
  interruptions: number
  saleProbability: number
  fillerWords: Array<{ word: string; count: number }>
  rudenessDetected: boolean
  transcript?: string
  callType: string
  importantQuotes: Array<{ speaker: string; timestamp: string; text: string }>
  customerNeeds: string[]
  objections: Array<{ category: string; quote: string; timestamp: string; handled: boolean }>
  ropTrainingPlan?: {
    weak_skill: string
    recommended_training: string
    task_for_manager: string
  } | null
  idealScriptSuggestions?: Array<{
    customer_objection: string
    manager_answer: string
    ideal_ai_script: string
    conversion_boost?: string
  }>
}

// ─── Helpers ───────────────────────────────────────────────────────

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function getScoreColor(score: number, max: number) {
  const pct = (score / max) * 100
  if (pct >= 80) return 'text-emerald-400'
  if (pct >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

function getScoreBg(score: number, max: number) {
  const pct = (score / max) * 100
  if (pct >= 80) return 'bg-emerald-500/15 border-emerald-500/30'
  if (pct >= 60) return 'bg-yellow-500/15 border-yellow-500/30'
  return 'bg-red-500/15 border-red-500/30'
}

function getStatusIcon(status: string, isCritical: boolean, criticalFail: boolean) {
  if (status === 'PASS') return <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
  if (status === 'NOT_APPLICABLE') return <Minus size={14} className="text-muted-foreground flex-shrink-0" />
  if (criticalFail) return <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
  if (status === 'PARTIAL') return <AlertTriangle size={14} className="text-yellow-400 flex-shrink-0" />
  return <X size={14} className="text-red-400 flex-shrink-0" />
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'PASS': return 'Bajarildi'
    case 'PARTIAL': return 'Qisman'
    case 'FAIL': return 'Bajarilmadi'
    case 'NOT_APPLICABLE': return 'Tegishli emas'
    default: return status
  }
}

// ─── Criterion Card Component ──────────────────────────────────────

function CriterionCard({
  c, index, editMode, onChange,
}: {
  c: CriterionResult
  index: number
  editMode: boolean
  onChange: (updated: CriterionResult) => void
}) {
  const [open, setOpen] = useState(false)
  const pct = c.maxScore > 0 ? Math.round((c.score / c.maxScore) * 100) : 0

  const inputCls = 'w-full px-2 py-1.5 rounded-lg bg-muted/40 border border-amber-500/40 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-amber-500/60 resize-none'

  const updateList = (field: 'errors' | 'strengths' | 'recommendations', idx: number, val: string) => {
    const arr = [...c[field]]
    arr[idx] = val
    onChange({ ...c, [field]: arr })
  }
  const removeFromList = (field: 'errors' | 'strengths' | 'recommendations', idx: number) => {
    onChange({ ...c, [field]: c[field].filter((_, i) => i !== idx) })
  }
  const addToList = (field: 'errors' | 'strengths' | 'recommendations') => {
    onChange({ ...c, [field]: [...c[field], ''] })
  }

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-200',
      editMode ? 'border-amber-500/30 bg-amber-500/3' :
      c.criticalFail
        ? 'border-red-500/40 bg-red-500/5'
        : c.status === 'NOT_APPLICABLE'
        ? 'border-border/30 bg-muted/20 opacity-60'
        : 'border-border/40 bg-card/60 hover:border-border/60'
    )}>
      {/* Header row */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 text-left"
      >
        {/* Section number */}
        <span className="w-6 h-6 rounded-lg bg-muted/60 flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0">
          {index}
        </span>

        {/* Status icon */}
        {getStatusIcon(c.status, c.isCritical, c.criticalFail)}

        {/* Name */}
        <span className="flex-1 text-sm font-semibold text-foreground truncate">
          {String(c.nameUz || '').replace(/greeting_hello/gi, 'Саломлашиш ва идентификация')}
        </span>

        {/* Critical badge */}
        {c.criticalFail && (
          <span className="text-[10px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-full flex-shrink-0">
            KRITIK
          </span>
        )}

        {/* Score — editable in edit mode */}
        {c.status !== 'NOT_APPLICABLE' && (
          editMode ? (
            <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
              <input
                type="number"
                min={0}
                max={c.maxScore}
                value={c.score}
                onChange={e => onChange({ ...c, score: Math.min(c.maxScore, Math.max(0, Number(e.target.value))) })}
                className="w-10 text-center px-1 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span className="text-xs text-muted-foreground">/ {c.maxScore}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className={cn('text-sm font-bold', getScoreColor(c.score, c.maxScore))}>
                {c.score}
              </span>
              <span className="text-xs text-muted-foreground">/ {c.maxScore}</span>
            </div>
          )
        )}

        {/* Expand */}
        {open ? (
          <ChevronUp size={14} className="text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Progress bar */}
      {c.status !== 'NOT_APPLICABLE' && (
        <div className="px-3 pb-1">
          <div className="h-1 rounded-full bg-muted/50 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                c.criticalFail ? 'bg-red-500' :
                pct >= 80 ? 'bg-emerald-500' :
                pct >= 60 ? 'bg-yellow-500' : 'bg-red-400'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Expanded details */}
      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/30 pt-3 mt-1">

          {/* Status selector in edit mode */}
          {editMode && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-amber-400 font-bold uppercase">Статус:</span>
              <select
                value={c.status}
                onChange={e => onChange({ ...c, status: e.target.value as CriterionResult['status'], passed: e.target.value === 'PASS', criticalFail: e.target.value === 'FAIL' && c.isCritical })}
                className="text-xs px-2 py-1 rounded-lg bg-muted/40 border border-amber-500/40 text-foreground focus:outline-none"
              >
                <option value="PASS">Бажарилди ✓</option>
                <option value="PARTIAL">Қисман</option>
                <option value="FAIL">Бажарилмади ✗</option>
                <option value="NOT_APPLICABLE">Тегишли эмас</option>
              </select>
            </div>
          )}

          {/* Explanation */}
          {editMode ? (
            <textarea
              rows={2}
              value={c.explanation}
              onChange={e => onChange({ ...c, explanation: e.target.value })}
              placeholder="Тушунтириш..."
              className={inputCls}
            />
          ) : c.explanation ? (
            <p className="text-xs text-muted-foreground leading-relaxed">{c.explanation}</p>
          ) : null}

          {/* Evidence quote */}
          {c.evidenceQuote && !editMode && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
              <MessageSquare size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                {c.evidenceTimestamp && (
                  <span className="text-[10px] text-blue-400 font-mono">[{c.evidenceTimestamp}] </span>
                )}
                <span className="text-xs text-foreground italic">«{c.evidenceQuote}»</span>
              </div>
            </div>
          )}

          {/* Errors */}
          <div>
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              Хатолар
              {editMode && (
                <button onClick={() => addToList('errors')} className="ml-1 text-red-400/70 hover:text-red-400">
                  <PlusCircle size={11} />
                </button>
              )}
            </p>
            {c.errors.length > 0 ? (
              <ul className="space-y-1.5">
                {c.errors.map((e, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    {editMode ? (
                      <>
                        <X size={10} className="text-red-400 mt-1.5 flex-shrink-0" />
                        <input
                          value={e}
                          onChange={ev => updateList('errors', i, ev.target.value)}
                          className="flex-1 text-xs px-2 py-1 rounded-lg bg-muted/40 border border-red-500/30 text-foreground focus:outline-none focus:ring-1 focus:ring-red-500/40"
                        />
                        <button onClick={() => removeFromList('errors', i)} className="text-muted-foreground hover:text-red-400 mt-1">
                          <Trash2 size={11} />
                        </button>
                      </>
                    ) : (
                      <>
                        <X size={10} className="text-red-400 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{e}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : editMode ? (
              <p className="text-xs text-muted-foreground/40 italic">Хатолар йўқ. + ни босиб қўшинг</p>
            ) : null}
          </div>

          {/* Strengths */}
          <div>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              Кучли томонлар
              {editMode && (
                <button onClick={() => addToList('strengths')} className="ml-1 text-emerald-400/70 hover:text-emerald-400">
                  <PlusCircle size={11} />
                </button>
              )}
            </p>
            {c.strengths.length > 0 ? (
              <ul className="space-y-1.5">
                {c.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    {editMode ? (
                      <>
                        <CheckCircle2 size={10} className="text-emerald-400 mt-1.5 flex-shrink-0" />
                        <input
                          value={s}
                          onChange={ev => updateList('strengths', i, ev.target.value)}
                          className="flex-1 text-xs px-2 py-1 rounded-lg bg-muted/40 border border-emerald-500/30 text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
                        />
                        <button onClick={() => removeFromList('strengths', i)} className="text-muted-foreground hover:text-red-400 mt-1">
                          <Trash2 size={11} />
                        </button>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={10} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{s}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : editMode ? (
              <p className="text-xs text-muted-foreground/40 italic">Кучли томонлар йўқ. + ни босиб қўшинг</p>
            ) : null}
          </div>

          {/* Recommendations */}
          <div>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              Тавсиялар
              {editMode && (
                <button onClick={() => addToList('recommendations')} className="ml-1 text-blue-400/70 hover:text-blue-400">
                  <PlusCircle size={11} />
                </button>
              )}
            </p>
            {c.recommendations.length > 0 ? (
              <ul className="space-y-1.5">
                {c.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    {editMode ? (
                      <>
                        <TrendingUp size={10} className="text-blue-400 mt-1.5 flex-shrink-0" />
                        <input
                          value={r}
                          onChange={ev => updateList('recommendations', i, ev.target.value)}
                          className="flex-1 text-xs px-2 py-1 rounded-lg bg-muted/40 border border-blue-500/30 text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/40"
                        />
                        <button onClick={() => removeFromList('recommendations', i)} className="text-muted-foreground hover:text-red-400 mt-1">
                          <Trash2 size={11} />
                        </button>
                      </>
                    ) : (
                      <>
                        <TrendingUp size={10} className="text-blue-400 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{r}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : editMode ? (
              <p className="text-xs text-muted-foreground/40 italic">Тавсиялар йўқ. + ни босиб қўшинг</p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────

export default function ManualAuditPage() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [managerName, setManagerName] = useState('')
  const [managerPosition, setManagerPosition] = useState('Sotuv menejeri')
  const [companyName, setCompanyName] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [okkOfficer, setOkkOfficer] = useState('') // Mas'ul Sifat nazorati hodimi
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<'idle' | 'uploading' | 'transcribing' | 'analyzing' | 'done'>('idle')
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [report, setReport] = useState<ManualAuditReport | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [editingTranscript, setEditingTranscript] = useState('')
  const [editingNextStep, setEditingNextStep] = useState('')
  const [isEditingNextStepInline, setIsEditingNextStepInline] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          if (d.user.companyId) {
            setCompanyId(d.user.companyId)
          } else if (d.user.role === 'SUPER_ADMIN') {
            fetch('/api/admin/companies')
              .then(res => res.json())
              .then(cData => {
                if (cData.success && cData.data?.length > 0) {
                  setCompanyId(cData.data[0].id)
                }
              })
          }
        }
      })
  }, [])

  const handleFile = (file: File) => {
    const allowed = /\.(mp3|wav|m4a|ogg|webm|mp4)$/i.test(file.name)
    if (!allowed) {
      toast.error('Faqat MP3, WAV, M4A formatlar qo\'llab-quvvatlanadi')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Fayl 50 MB dan katta bo\'lmasligi kerak')
      return
    }
    setAudioFile(file)
    setReport(null)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => setDragging(false)

  const handleAnalyze = async () => {
    if (!audioFile) return toast.error('Audio fayl tanlang')
    if (!managerName.trim()) return toast.error('Xodim ismini kiriting')
    if (!companyId) return toast.error('Kompaniya topilmadi')

    setLoading(true)
    setProgress('uploading')
    setElapsedSeconds(0)
    setReport(null)

    // Start elapsed timer
    timerRef.current = setInterval(() => setElapsedSeconds(s => s + 1), 1000)

    // 10-minute timeout — Aisha AI async polling can take up to 3 minutes
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000)

    try {
      const form = new FormData()
      form.append('audio', audioFile)
      form.append('managerName', managerName)
      form.append('managerPosition', managerPosition)
      form.append('companyName', companyName)
      form.append('customerName', customerName)

      // Switch to transcribing stage — this is where Aisha does async polling
      setProgress('transcribing')

      const res = await fetch(`/api/${companyId}/audits/manual`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      })

      // Switch to analyzing stage once we get the response
      setProgress('analyzing')

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || 'Tahlil muvaffaqiyatsiz yakunlandi')
      }

      setReport(data.data)
      setEditingTranscript(data.data.transcript || '')
      setEditingNextStep(data.data.nextStep || '')
      setProgress('done')
      toast.success('Tahlil muvaffaqiyatli yakunlandi! ✓')

      setTimeout(() => reportRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.error('Tahlil vaqti tugadi (10 daqiqa). Aisha AI server bilan bog\'lanishda muammo bo\'lishi mumkin.')
      } else {
        toast.error(err.message || 'Xatolik yuz berdi')
      }
      setProgress('idle')
    } finally {
      clearTimeout(timeoutId)
      if (timerRef.current) clearInterval(timerRef.current)
      setLoading(false)
    }
  }

  const handleReset = () => {
    setAudioFile(null)
    setReport(null)
    setProgress('idle')
    setManagerName('')
    setCustomerName('')
    setOkkOfficer('')
    setShowTranscript(false)
    setEditingTranscript('')
    setEditingNextStep('')
    setIsEditingNextStepInline(false)
  }

  // ── Radar Chart SVG Generator (Image 3 style) ──────────────────
  const generateRadarChartSVG = (
    criteria: Array<any>,
    audioDurationStr: string = '5:19'
  ) => {
    const axes = [
      { label: 'Саломлашиш', keywords: ['greeting_hello', 'greeting', 'саломлашиш', 'идентификация', '1.'] },
      { label: 'Эҳтиёж', keywords: ['эҳтиёж', 'савол', 'need', '2.'] },
      { label: 'Маҳсулот', keywords: ['маҳсулот', 'тақдимот', 'product', '3.'] },
      { label: 'Эътироз', keywords: ['эътироз', 'нарх', 'objection', '4.'] },
      { label: 'Босим', keywords: ['битим', 'якунлаш', 'қадам', 'close', '5.', '6.', 'босим'] },
      { label: 'Кайфият', keywords: ['кайфият', 'мулоқот', 'эмпатия', 'mood', '7.'] },
      { label: 'Фаоллик', keywords: ['фаоллик', 'диққат', 'узилиш', 'active', '8.', '9.'] }
    ]

    const scores = axes.map(axis => {
      const matched = (criteria || []).filter(c => {
        const name = String(c.nameUz || c.name || c.criterionCode || c.code || '').toLowerCase()
        return axis.keywords.some(k => name.includes(k.toLowerCase()))
      })
      if (matched.length > 0) {
        const sumScore = matched.reduce((acc, c) => acc + (c.score || 0), 0)
        const sumMax = matched.reduce((acc, c) => acc + (c.maxScore || 10), 0)
        return sumMax > 0 ? Math.min(1.0, Math.max(0.25, sumScore / sumMax)) : 0.75
      }
      return 0.75
    })

    const cx = 150, cy = 150, r = 85
    const n = axes.length
    const angleStep = (Math.PI * 2) / n

    const gridRings = [0.2, 0.4, 0.6, 0.8, 1.0].map(level => {
      const pts = axes.map((_, i) => {
        const angle = -Math.PI / 2 + i * angleStep
        const x = cx + r * level * Math.cos(angle)
        const y = cy + r * level * Math.sin(angle)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
      return `<polygon points="${pts}" fill="none" stroke="#cbd5e1" stroke-width="1.2" stroke-dasharray="${level === 1 ? 'none' : '2,2'}" />`
    }).join('')

    let axisLines = ''
    let labelTags = ''
    axes.forEach((axis, i) => {
      const angle = -Math.PI / 2 + i * angleStep
      const xEnd = cx + r * Math.cos(angle)
      const yEnd = cy + r * Math.sin(angle)
      axisLines += `<line x1="${cx}" y1="${cy}" x2="${xEnd.toFixed(1)}" y2="${yEnd.toFixed(1)}" stroke="#cbd5e1" stroke-width="1.2" />`

      const xLbl = cx + (r + 26) * Math.cos(angle)
      const yLbl = cy + (r + 14) * Math.sin(angle)
      const anchor = Math.abs(xLbl - cx) < 15 ? 'middle' : xLbl > cx ? 'start' : 'end'
      labelTags += `<text x="${xLbl.toFixed(1)}" y="${yLbl.toFixed(1)}" text-anchor="${anchor}" font-size="11" font-weight="700" fill="#475569" font-family="sans-serif">${axis.label}</text>`
    })

    const valPoints = scores.map((val, i) => {
      const angle = -Math.PI / 2 + i * angleStep
      const x = cx + r * val * Math.cos(angle)
      const y = cy + r * val * Math.sin(angle)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')

    const dots = scores.map((val, i) => {
      const angle = -Math.PI / 2 + i * angleStep
      const x = cx + r * val * Math.cos(angle)
      const y = cy + r * val * Math.sin(angle)
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="#4f46e5" stroke="#ffffff" stroke-width="2" />`
    }).join('')

    return `
      <div style="border:1.5px solid #cbd5e1; border-radius:22px; padding:28px 24px; background:#ffffff; max-width:540px; margin:40px auto; text-align:center; box-shadow:0 6px 20px rgba(0,0,0,0.06); font-family:sans-serif; page-break-inside:avoid; break-inside:avoid;">
        <div style="font-size:18px; font-weight:900; color:#0f172a; text-transform:uppercase; letter-spacing:1.2px; margin-bottom:4px;">MEZONLAR BO'YICHA</div>
        <div style="font-size:13px; font-weight:600; color:#64748b; margin-bottom:20px;">Tahlil audio: sdelka • ${audioDurationStr}</div>
        <svg width="440" height="440" viewBox="0 0 300 300" style="overflow:visible; display:block; margin:0 auto;">
          ${gridRings}
          ${axisLines}
          <polygon points="${valPoints}" fill="rgba(79, 70, 229, 0.3)" stroke="#4f46e5" stroke-width="2.5" stroke-linejoin="round" />
          ${dots}
          ${labelTags}
        </svg>
      </div>
    `
  }

  // ── Professional PDF generator (kotib.ai style) ──────────────────
  const generatePDF = () => {
    if (!report) return

    const dateStr = new Date(report.analyzedAt).toLocaleDateString('uz-UZ', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    const scorePct = Math.round((report.totalScore / report.maxScore) * 100)
    const scoreColor = scorePct >= 80 ? '#16a34a' : scorePct >= 60 ? '#ca8a04' : '#dc2626'

    const criterionHtml = (report.criteria || []).map((c, i) => {
      const pct = c.maxScore > 0 ? Math.round((c.score / c.maxScore) * 100) : 0
      const color = pct >= 80 ? '#16a34a' : pct >= 60 ? '#ca8a04' : '#dc2626'
      const statusLabel = c.status === 'PASS' ? 'Бажарилди ✓'
        : c.status === 'PARTIAL' ? 'Қисман'
        : c.status === 'NOT_APPLICABLE' ? 'Тегишли эмас'
        : 'Бажарилмади ✗'

      const errorsHtml = c.errors?.length
        ? `<div class="section-block errors-block">
            <div class="block-title">❌ Хатоликлар</div>
            ${c.errors.map(e => `<p class="block-item">• ${e}</p>`).join('')}
          </div>`
        : `<div class="section-block"><div class="block-title">Хатолар</div><p class="muted">Хатолар аниқланмади.</p></div>`

      const strengthsHtml = c.strengths?.length
        ? `<div class="section-block strengths-block">
            <div class="block-title">✅ Кучли томонлар</div>
            ${c.strengths.map(s => `<p class="block-item">• ${s}</p>`).join('')}
          </div>`
        : ''

      const recsHtml = c.recommendations?.length
        ? `<div class="section-block recs-block">
            <div class="block-title">💡 Тавсиялар</div>
            ${c.recommendations.map(r => `<p class="block-item">• ${r}</p>`).join('')}
          </div>`
        : ''

      const quoteHtml = c.evidenceQuote
        ? `<div class="quote-block">"${c.evidenceQuote}"${c.evidenceTimestamp ? ` <span class="timestamp">[${c.evidenceTimestamp}]</span>` : ''}</div>`
        : ''

      return `
        <div class="criterion-page ${c.criticalFail ? 'critical' : ''}">
          <div class="criterion-header">
            <div class="criterion-title">${i + 1}. ${c.nameUz}</div>
            <div class="criterion-score" style="color:${color}">${c.score} / ${c.maxScore}</div>
          </div>
          <div class="criterion-bar-bg">
            <div class="criterion-bar-fill" style="width:${pct}%;background:${color}"></div>
          </div>
          <div class="criterion-status" style="color:${color}">${statusLabel}${c.criticalFail ? ' — КРИТИК ХАТО' : ''}</div>
          ${c.explanation ? `<p class="criterion-explanation">${c.explanation}</p>` : ''}
          ${quoteHtml}
          ${errorsHtml}
          ${strengthsHtml}
          ${recsHtml}
        </div>
      `
    }).join('')

    const businessHtml = report.businessAnalysis ? Object.entries(report.businessAnalysis)
      .filter(([k, v]) => v && k !== 'callContext')
      .map(([k, v]) => {
        const labels: Record<string, string> = {
          customerRequest: 'Мурожаат мазмуни',
          productDemand: 'Талаб ва ассортимент',
          objections: 'Эътирозлар',
          refusalReasons: 'Рад этиш сабаблари',
          marketingInsights: 'Маркетинг инсайт',
          managerPerformance: 'Оператор компетенцияси',
          customerSentiment: 'Мижоз кайфияти',
          businessInsights: 'Бизнес инсайт',
          managementRecommendations: 'Бошқарув тавсиялари',
        }
        return `<div class="biz-item"><div class="biz-label">${labels[k] || k}</div><p>${v}</p></div>`
      }).join('') : ''

    const html = `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>OKK Hisoboti — ${report.managerName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; color: #1a1a2e; background: #fff; line-height: 1.6; }
  @page { size: A4; margin: 15mm 12mm; }
  @media print { .no-print { display:none; } }

  /* ── Cover page ── */
  .cover { min-height: 240px; background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%); color:#fff; padding: 32px 36px 24px; border-radius: 0 0 24px 24px; margin-bottom: 32px; }
  .cover-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
  .brand-logo-container { display:flex; align-items:center; gap:20px; }
  .mm-logo-box { display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.95); padding:8px 16px; border-radius:12px; box-shadow:0 4px 12px rgba(0,0,0,0.15); }
  .brand { font-size:26px; font-weight:900; letter-spacing:2px; color:#60a5fa; line-height:1; }
  .brand-sub { font-size:11px; letter-spacing:3px; color:#94a3b8; margin-top:4px; }
  .cover-badge { background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); border-radius:10px; padding:8px 18px; font-size:14px; font-weight:800; letter-spacing:2px; }
  .cover-title { font-size:24px; font-weight:900; letter-spacing:1px; text-align:center; margin:16px 0 8px; }
  .cover-subtitle { text-align:center; font-size:13px; color:#94a3b8; letter-spacing:2px; font-weight:600; }

  /* ── Score circle ── */
  .score-section { display:flex; flex-direction:column; align-items:center; margin: 28px 0; }
  .score-circle { width:130px; height:130px; border-radius:50%; border: 6px solid ${scoreColor}; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow: 0 0 28px ${scoreColor}55; }
  .score-num { font-size:42px; font-weight:900; color:${scoreColor}; line-height:1; }
  .score-max { font-size:13px; color:#64748b; margin-top:2px; font-weight:700; }
  .score-label { font-size:12px; color:#64748b; letter-spacing:2px; text-transform:uppercase; margin-top:10px; font-weight:800; }
  ${report.hasCriticalFails ? '.critical-badge { background:#fee2e2; border:2px solid #ef4444; color:#dc2626; border-radius:20px; padding:6px 20px; font-size:13px; font-weight:800; margin-top:12px; }' : ''}

  /* ── Info table ── */
  .info-table { width:100%; border-collapse:collapse; margin-bottom:32px; }
  .info-table td { padding:10px 14px; border:1px solid #cbd5e1; font-size:15px; vertical-align:middle; }
  .info-table .label { background:#f8fafc; font-weight:700; color:#334155; width:38%; font-size:14px; }
  .info-table .value { color:#0f172a; font-weight:600; }

  /* ── Stats row ── */
  .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:32px; }
  .stat-card { border:1px solid #cbd5e1; border-radius:10px; padding:12px; text-align:center; background:#f8fafc; }
  .stat-card .st-label { font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:1px; font-weight:700; }
  .stat-card .st-val { font-size:24px; font-weight:900; color:#0f172a; margin-top:4px; }

  /* ── Section title ── */
  .section-title { font-size:18px; font-weight:900; color:#0f172a; padding:12px 0 8px; border-bottom:2.5px solid #0f172a; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; }

  /* ── Criterion block ── */
  .criterion-page { page-break-inside:avoid; margin-bottom:24px; border:1.5px solid #cbd5e1; border-radius:12px; overflow:hidden; }
  .criterion-page.critical { border-color:#ef4444; border-width:2px; }
  .criterion-header { display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:12px 18px; border-bottom:1px solid #e2e8f0; }
  .criterion-title { font-size:17px; font-weight:800; color:#0f172a; }
  .criterion-score { font-size:22px; font-weight:900; }
  .criterion-bar-bg { height:6px; background:#e2e8f0; }
  .criterion-bar-fill { height:6px; transition:width .3s; }
  .criterion-status { font-size:14px; font-weight:800; padding:6px 18px; }
  .criterion-explanation { font-size:15px; color:#334155; padding:8px 18px 4px; line-height:1.6; font-weight:500; }
  .quote-block { background:#eff6ff; border-left:4px solid #3b82f6; margin:10px 18px; padding:10px 14px; font-size:15px; font-style:italic; color:#1e40af; border-radius:0 8px 8px 0; font-weight:500; }
  .timestamp { font-size:12px; font-weight:700; font-style:normal; }
  .section-block { padding:10px 18px; }
  .errors-block { background:#fff5f5; border-top:1px solid #fee2e2; }
  .strengths-block { background:#f0fdf4; border-top:1px solid #dcfce7; }
  .recs-block { background:#eff6ff; border-top:1px solid #dbeafe; }
  .block-title { font-size:14px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:6px; color:#1e293b; }
  .block-item { font-size:15px; color:#1e293b; line-height:1.6; padding-left:4px; font-weight:500; }
  .muted { color:#94a3b8; font-size:13px; font-style:italic; }

  /* ── Summary sections ── */
  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:24px; }
  .summary-block { border-radius:12px; padding:18px; }
  .summary-block.green { background:#f0fdf4; border:1.5px solid #86efac; }
  .summary-block.red { background:#fff5f5; border:1.5px solid #fca5a5; }
  .summary-block.blue { background:#eff6ff; border:1.5px solid #93c5fd; }
  .summary-block.purple { background:#faf5ff; border:1.5px solid #c4b5fd; }
  .summary-block h4 { font-size:16px; font-weight:900; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; }
  .summary-block p, .summary-block li { font-size:15px; color:#1e293b; line-height:1.6; font-weight:500; }
  .summary-block ul { padding-left:18px; }

  /* ── Business analysis ── */
  .biz-item { margin-bottom:14px; border:1.5px solid #cbd5e1; border-radius:8px; overflow:hidden; }
  .biz-label { background:#f1f5f9; font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:1px; padding:7px 14px; color:#334155; border-bottom:1px solid #cbd5e1; }
  .biz-item p { font-size:15px; color:#1e293b; padding:10px 14px; line-height:1.6; font-weight:500; }

  /* ── Analytics Box ── */
  .analytics-box { border:1.5px solid #cbd5e1; border-radius:12px; padding:18px; margin-top:24px; margin-bottom:24px; background:#f8fafc; page-break-inside:auto; break-inside:auto; }
  .analytics-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:10px; margin:14px 0; text-align:center; }
  .analytics-card { border:1px solid #cbd5e1; border-radius:10px; padding:10px 4px; background:#fff; }
  .analytics-card .val { font-size:18px; font-weight:900; color:#0f172a; }
  .analytics-card .lbl { font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; margin-top:2px; }
  .bar-row { display:flex; align-items:center; gap:8px; margin-bottom:6px; font-size:13px; }
  .bar-name { flex:1; font-weight:600; color:#334155; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .bar-bg { width:120px; height:8px; background:#e2e8f0; border-radius:4px; overflow:hidden; }
  .bar-fill { height:100%; border-radius:4px; }
  .bar-pct { width:36px; text-align:right; font-weight:800; font-size:12px; }

  /* ── Copyright Section ── */
  .copyright-section { margin-top:36px; padding:22px 24px; background:#f8fafc; border:1.5px solid #cbd5e1; border-radius:14px; page-break-inside:avoid; }
  .copyright-title { font-size:17px; font-weight:900; color:#0f172a; margin-bottom:8px; border-bottom:2px solid #cbd5e1; padding-bottom:6px; }
  .copyright-sub { font-size:14px; font-weight:800; color:#1e293b; margin-bottom:12px; }
  .copyright-p { font-size:13px; color:#334155; line-height:1.6; margin-bottom:10px; font-weight:500; }
  .copyright-list { font-size:13px; color:#334155; line-height:1.6; padding-left:24px; margin-bottom:10px; list-style-type:disc; font-weight:500; }
  .copyright-prohibited { font-size:13px; font-weight:800; color:#dc2626; margin-bottom:10px; }

  /* ── Footer ── */
  .footer { text-align:center; font-size:12px; color:#64748b; margin-top:28px; padding-top:14px; border-top:1.5px solid #e2e8f0; font-weight:600; }

  /* ── Print button ── */
  .print-btn { position:fixed; top:16px; right:16px; background:#2563eb; color:#fff; border:none; border-radius:10px; padding:12px 26px; font-size:15px; font-weight:800; cursor:pointer; z-index:999; box-shadow:0 4px 16px rgba(37,99,235,.3); }
  .print-btn:hover { background:#1d4ed8; }
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">📥 PDF yuklash</button>

<div class="cover">
  <div class="cover-top">
    <div class="brand-logo-container">
      <!-- Marketing Markazi Official 1:1 Logo -->
      <img src="${MARKETING_MARKAZI_LOGO_BASE64}" alt="Marketing Markazi" style="height: 68px; width: auto; object-fit: contain; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));" />

      <div style="height:36px; width:1.5px; background:rgba(255,255,255,0.25);"></div>


      <!-- Fraganus AI -->
      <div>
        <div class="brand">Fraganus <span style="color:#d8ff38;">AI</span></div>
        <div class="brand-sub">AI SALES INTELLIGENCE</div>
      </div>
    </div>

    <div class="cover-badge">ОКК ҲИСОБОТИ</div>
  </div>
  <div class="cover-title">«СИФАТ НАЗОРАТИ» ТИЗИМИ</div>
  <div class="cover-subtitle">ҚЎНҒИРОҚ ТАҲЛИЛ ҲИСОБОТИ · ${dateStr}</div>
</div>

<div class="score-section">
  <div class="score-label">УМУМИЙ БАЛЛ</div>
  <div class="score-circle">
    <div class="score-num">${report.totalScore}</div>
    <div class="score-max">/ ${report.maxScore}</div>
  </div>
  ${report.hasCriticalFails ? '<div class="critical-badge">⚠ КРИТИК ХАТОЛАР МАВЖУД</div>' : ''}
</div>

<table class="info-table">
  <tr><td class="label">Компания номи</td><td class="value">${report.companyName || '—'}</td>
      <td class="label">Сана ва вақт</td><td class="value">${dateStr}</td></tr>
  <tr><td class="label">Ходим (Менежер)</td><td class="value">${report.managerName}</td>
      <td class="label">Лавозими</td><td class="value">${report.managerPosition}</td></tr>
  <tr><td class="label">Мижоз</td><td class="value">${report.customerName || 'Номаълум'}</td>
      <td class="label">Аудио файл</td><td class="value">${report.audioFileName}</td></tr>
  <tr><td class="label">ОКК ходими</td><td class="value" colspan="3">${okkOfficer || '—'}</td></tr>
  <tr><td class="label">Қўнғироқ натижаси</td><td class="value">${report.callResult || '—'}</td>
      <td class="label">Давомийлиги</td><td class="value">${report.audioDurationSeconds > 0 ? `${Math.floor(report.audioDurationSeconds/60)}:${String(Math.floor(report.audioDurationSeconds%60)).padStart(2,'0')}` : '—'}</td></tr>
</table>

<div class="stats-row">
  <div class="stat-card"><div class="st-label">Менежер гапирди</div><div class="st-val">${report.managerTalkRatio}%</div></div>
  <div class="stat-card"><div class="st-label">Сотиш эҳтимоли</div><div class="st-val" style="color:${scoreColor}">${report.saleProbability}%</div></div>
  <div class="stat-card"><div class="st-label">Узилишлар</div><div class="st-val">${report.interruptions}</div></div>
  <div class="stat-card"><div class="st-label">Умумий балл</div><div class="st-val" style="color:${scoreColor}">${report.totalScore}/${report.maxScore}</div></div>
</div>

<div class="section-title">📋 ОКК МЕЗОНЛАРИ БЎЙИЧА БАТАФСИЛ ТАҲЛИЛ <span style="font-size:13px;font-weight:700;color:#64748b">${report.criteria?.length || 0} та мезон</span></div>

${criterionHtml}

${report.strengths?.length || report.mistakes?.length ? `
<div class="two-col" style="margin-top:20px">
  ${report.strengths?.length ? `
  <div class="summary-block green">
    <h4 style="color:#16a34a">✅ Кучли томонлар</h4>
    <ul>${report.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
  </div>` : ''}
  ${report.mistakes?.length ? `
  <div class="summary-block red">
    <h4 style="color:#dc2626">❌ Асосий хатолар</h4>
    <ul>${report.mistakes.map(m => `<li>${m}</li>`).join('')}</ul>
  </div>` : ''}
</div>` : ''}

${report.ropRecommendation ? `
<div class="summary-block blue" style="margin-bottom:16px">
  <h4 style="color:#1d4ed8">Тавсия</h4>
  <p>${report.ropRecommendation}</p>
</div>` : ''}

${report.nextStep ? `
<div class="summary-block purple" style="margin-bottom:16px">
  <h4 style="color:#7c3aed">⚡ Кейинги қадам</h4>
  <p>${report.nextStep}</p>
</div>` : ''}

${report.idealScriptSuggestions?.length ? `
<div class="summary-block green" style="margin-bottom:16px;border-color:#16a34a">
  <h4 style="color:#16a34a">✨ Сўзлашув варианти</h4>
  ${report.idealScriptSuggestions.map(s => `
    <div style="margin-top:8px;padding:8px 12px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0">
      <div style="font-size:12px;color:#dc2626"><b>Мижоз эътирози:</b> «${s.customer_objection}»</div>
      <div style="font-size:12px;color:#d97706"><b>Менежер жавоби:</b> «${s.manager_answer}»</div>
      <div style="font-size:13px;color:#15803d;font-weight:700;margin-top:4px"><b>✨ AI Сўзлашув варианти:</b> ${s.ideal_ai_script}</div>
    </div>
  `).join('')}
</div>` : ''}

${report.ropTrainingPlan ? `
<div class="summary-block purple" style="margin-bottom:16px;border-color:#7c3aed">
  <h4 style="color:#7c3aed">🎓 Менежерга тавсия</h4>
  <p style="margin-bottom:4px"><b>Паст кўникма:</b> ${report.ropTrainingPlan.weak_skill}</p>
  <p style="margin-bottom:4px"><b>Рекомендуемый тренинг:</b> ${report.ropTrainingPlan.recommended_training}</p>
  <p><b>Ходимга топшириқ:</b> ${report.ropTrainingPlan.task_for_manager}</p>
</div>` : ''}

${businessHtml ? `
<div class="section-title" style="margin-top:24px">📊 БИЗНЕС ТАҲЛИЛ ВА ТУШУНЧАЛАР</div>
${businessHtml}` : ''}

<div class="analytics-box">
  <div class="section-title" style="border-bottom:none;padding:0;margin-bottom:14px">📊 АНАЛИТИКА <span style="font-size:13px;font-weight:700;color:#64748b">${scorePct}% умумий натижа</span></div>

  <div style="margin-bottom:16px">
    <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Мезонлар бўйича баҳо</div>
    ${(report.criteria || []).filter(c => c && c.status !== 'NOT_APPLICABLE').map((c, i) => {
      const cMax = (typeof c.maxScore === 'number' && c.maxScore > 0) ? c.maxScore : 10
      const cScore = typeof c.score === 'number' ? c.score : 0
      const pct = Math.round((cScore / cMax) * 100)
      const color = pct >= 80 ? '#16a34a' : pct >= 60 ? '#ca8a04' : '#dc2626'
      const rawName = c.nameUz || (c as any).name || (c as any).criterionCode || (c as any).code || `Mezon ${i+1}`
      const name = String(rawName).replace(/greeting_hello/gi, 'Саломлашиш ва идентификация').replace(/^\d+\.\s*/, '')
      return `
        <div class="bar-row">
          <span style="color:#94a3b8;width:16px">${i + 1}.</span>
          <span class="bar-name">${name}</span>
          <div class="bar-bg"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
          <span class="bar-pct" style="color:${color}">${pct}%</span>
        </div>
      `
    }).join('')}
  </div>

  <div style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:1px">Асосий кўрсаткичлар</div>
  <div class="analytics-grid">
    <div class="analytics-card"><div class="val" style="color:#2563eb">${scorePct}%</div><div class="lbl">Умумий</div></div>
    <div class="analytics-card"><div class="val" style="color:${(report.saleProbability || 0) >= 60 ? '#16a34a' : '#dc2626'}">${report.saleProbability || 0}%</div><div class="lbl">Сотиш</div></div>
    <div class="analytics-card"><div class="val" style="color:#0284c7">${report.managerTalkRatio || 50}%</div><div class="lbl">Менежер</div></div>
    <div class="analytics-card"><div class="val" style="color:#9333ea">${report.customerTalkRatio || Math.max(0, 100 - (report.managerTalkRatio || 50))}%</div><div class="lbl">Мижоз</div></div>
    <div class="analytics-card"><div class="val" style="color:${(report.interruptions || 0) <= 2 ? '#16a34a' : '#ca8a04'}">${Math.max(0, 100 - (report.interruptions || 0) * 10)}%</div><div class="lbl">Узилиш</div></div>
    <div class="analytics-card"><div class="val" style="color:${report.hasCriticalFails ? '#dc2626' : '#16a34a'}">${report.hasCriticalFails ? 20 : scorePct}%</div><div class="lbl">ОКК</div></div>
  </div>

  <div style="margin-top:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
      <span style="font-size:12px;font-weight:800;color:#64748b;text-transform:uppercase">Сотиш эҳтимоли</span>
      <span style="font-size:18px;font-weight:900;color:${scoreColor}">${report.saleProbability || 0}%</span>
    </div>
    <div style="height:10px;background:#e2e8f0;border-radius:5px;overflow:hidden">
      <div style="height:100%;width:${report.saleProbability || 0}%;background:${scoreColor};border-radius:5px"></div>
    </div>
  </div>
</div>

${generateRadarChartSVG(report.criteria, report.audioDurationSeconds > 0 ? `${Math.floor(report.audioDurationSeconds/60)}:${String(Math.floor(report.audioDurationSeconds%60)).padStart(2,'0')}` : '5:19')}

<!-- ── COPYRIGHT & INTELLECTUAL PROPERTY SECTION ── -->
<div class="copyright-section">
  <div class="copyright-title">Marketing Markazi Fraganus AI — Муаллифлик ҳуқуқи</div>
  <div class="copyright-sub">© 2026 Marketing Markazi. Барча ҳуқуқлар ҳимояланган.</div>
  <p class="copyright-p">
    Fraganus AI дастурий маҳсулоти, унинг архитектураси, дастурий коди, функционал имкониятлари, сунъий интеллект асосидаги ечимлари, интерфейси, дизайни, алгоритмлари ва бошқа таркибий қисмлари Marketing Markaziнинг интеллектуал мулки ҳисобланади.
  </p>
  <p class="copyright-p">
    Fraganus AI мижозларга фойдаланиш ҳуқуқи асосида тақдим этилади. Дастурдан фойдаланиш ҳуқуқининг берилиши дастурга бўлган муаллифлик ёки мулкий ҳуқуқларнинг бошқа шахс ёки ташкилотга ўтишини англатмайди.
  </p>
  <p class="copyright-p" style="font-weight:700; color:#0f172a;">
    Marketing Markazi’нинг олдиндан ёзма розилигисиз Fraganus AI дастурини ёки унинг алоҳида қисмларини:
  </p>
  <ul class="copyright-list">
    <li>нусхалаш;</li>
    <li>қайта сотиш;</li>
    <li>учинчи шахсларга тарқатиш;</li>
    <li>ўзгартириш ёки қайта ишлаш;</li>
    <li>дастурий кодини олишга ёки таҳлил қилишга уриниш;</li>
    <li>бошқа маҳсулот яратиш учун тўлиқ ёки қисман кўчириш;</li>
    <li>ўз номи ёки бошқа бренд остида тарқатиш</li>
  </ul>
  <p class="copyright-prohibited">ТАҚИҚЛАНАДИ.</p>
  <p class="copyright-p">
    Fraganus AI — Marketing Markazi томонидан ишлаб чиқилган ва унга тегишли интеллектуал мулк ҳисобланади.
  </p>
  <div style="font-size:13px; font-weight:800; color:#0f172a; margin-top:10px; border-top:1px solid #cbd5e1; padding-top:8px;">
    © 2026 Marketing Markazi. All rights reserved.
  </div>
</div>

<div class="footer">
  Ҳисобот яратилди: ${dateStr} · Marketing Markazi Fraganus AI Sales Intelligence System · ОКК версияси 2.0
</div>

<script>
  // Auto-trigger print/save as PDF dialog on load
  window.onload = () => {
    document.title = "OKK_Hisobot_${report.managerName.replace(/\s+/g,'_')}_${new Date().toLocaleDateString('uz-UZ').replace(/\./g,'-')}.pdf"
    setTimeout(() => {
      window.print();
    }, 500);
  }
</script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) {
      toast.error('Brauzer pop-up\'ni bloklab qo\'ydi. Ruxsat bering.')
      return
    }
    win.document.write(html)
    win.document.close()
  }

  const progressLabels = {
    uploading: 'Audio yuklanmoqda...',
    transcribing: 'Aisha AI nutqni taniyapti... (1-3 daqiqa kutish mumkin)',
    analyzing: 'GPT-4o OKK mezonlarini baholayapti...',
    done: 'Tahlil tayyor!',
    idle: '',
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Upload size={22} className="text-primary" />
            Qo'lda audio tahlil
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            MP3/WAV audio yuklang — OKK mezonlari bo'yicha to'liq hisobot oling
          </p>
        </div>
        {report && (
          <div className="flex items-center gap-2">
            {/* Edit / Save toggle */}
            <button
              onClick={() => setIsEditMode(m => !m)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all',
                isEditMode
                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border-amber-500/40'
                  : 'bg-muted/60 hover:bg-muted border-border/50 text-muted-foreground hover:text-foreground'
              )}
            >
              {isEditMode ? (
                <><Save size={13} /> Таҳрирлашни якунлаш</>
              ) : (
                <><Pencil size={13} /> Таҳрирлаш</>
              )}
            </button>
            <button
              onClick={generatePDF}
              disabled={isEditMode}
              title={isEditMode ? 'Аввал таҳрирлашни якунланг' : ''}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all',
                isEditMode
                  ? 'opacity-40 cursor-not-allowed bg-muted/30 text-muted-foreground border-border/30'
                  : 'bg-primary/20 text-primary hover:bg-primary/30 border-primary/30'
              )}
            >
              <Download size={13} />
              PDF юклаш
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-muted/60 hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground transition-all"
            >
              <RotateCcw size={13} />
              Янги таҳлил
            </button>
          </div>
        )}
      </div>

      {/* Upload + Form Card */}
      {!report && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Left: Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !audioFile && fileInputRef.current?.click()}
            className={cn(
              'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-all duration-200 cursor-pointer min-h-[220px]',
              dragging
                ? 'border-primary bg-primary/10 scale-[1.01]'
                : audioFile
                ? 'border-emerald-500/50 bg-emerald-500/5 cursor-default'
                : 'border-border/50 hover:border-primary/50 hover:bg-muted/30 bg-muted/10'
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,.webm,.mp4"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {audioFile ? (
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto">
                  <FileAudio size={28} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-400 truncate max-w-[200px]">
                    {audioFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(audioFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setAudioFile(null) }}
                  className="text-xs text-muted-foreground hover:text-red-400 flex items-center gap-1 mx-auto transition-colors"
                >
                  <X size={12} /> O'chirish
                </button>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
                  <Upload size={28} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Audio faylni yuklang
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Shu yerga tashlang yoki bosing
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-2 font-mono">
                    MP3 · WAV · M4A · 50MB gacha
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Form */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User size={11} />
                Ходим исми <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={managerName}
                onChange={e => setManagerName(e.target.value)}
                placeholder="Масалан: Нафиса Каримова"
                className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Лавозим
              </label>
              <input
                type="text"
                value={managerPosition}
                onChange={e => setManagerPosition(e.target.value)}
                placeholder="Сотув менежери"
                className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Building2 size={11} />
                Компания номи
              </label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Масалан: Marketing Markazi"
                className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Мижоз исми (ихтиёрий)
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="Масалан: Абдулборий Ғуломов"
                className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
              />
            </div>

            <div className="pt-2 border-t border-border/40 space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <User size={11} className="text-blue-400" />
                  ОКК ходими
                </label>
                <input
                  type="text"
                  value={okkOfficer}
                  onChange={e => setOkkOfficer(e.target.value)}
                  placeholder="Масалан: Ясмина"
                  className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all"
                />
              </div>
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading || !audioFile || !managerName.trim()}
              className={cn(
                'w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200',
                loading || !audioFile || !managerName.trim()
                  ? 'bg-muted/50 text-muted-foreground cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-primary/25 active:scale-[0.98]'
              )}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {progressLabels[progress]}
                </>
              ) : (
                <>
                  <Zap size={16} />
                  OKK tahlilini boshlash
                </>
              )}
            </button>

            {/* Progress Steps */}
            {loading && (
              <div className="space-y-1.5 pt-1">
                {['uploading', 'transcribing', 'analyzing'].map((step, i) => {
                  const steps = ['uploading', 'transcribing', 'analyzing']
                  const currentIdx = steps.indexOf(progress)
                  const isDone = i < currentIdx
                  const isCurrent = step === progress

                  return (
                    <div key={step} className="flex items-center gap-2">
                      <div className={cn(
                        'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0',
                        isDone ? 'bg-emerald-500' : isCurrent ? 'bg-primary' : 'bg-muted/50'
                      )}>
                        {isDone ? (
                          <CheckCircle2 size={10} className="text-white" />
                        ) : isCurrent ? (
                          <Loader2 size={10} className="animate-spin text-white" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                        )}
                      </div>
                      <span className={cn(
                        'text-xs flex-1',
                        isCurrent ? 'text-foreground font-medium' : isDone ? 'text-emerald-400' : 'text-muted-foreground/40'
                      )}>
                        {progressLabels[step as keyof typeof progressLabels]}
                      </span>
                      {isCurrent && step === 'transcribing' && elapsedSeconds > 0 && (
                        <span className="text-[10px] font-mono text-primary/70">{elapsedSeconds}s</span>
                      )}
                    </div>
                  )
                })}
                {progress === 'transcribing' && elapsedSeconds > 30 && (
                  <p className="text-[10px] text-muted-foreground/60 pl-6">
                    Aisha AI server hozir band bo'lishi mumkin. Iltimos kuting...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── REPORT ─────────────────────────────────────────────── */}

      {report && (
        <div ref={reportRef} className="space-y-6 print:space-y-4">

          {/* Edit mode banner */}
          {isEditMode && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-center gap-3">
              <Pencil size={15} className="text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-300">Таҳрирлаш режими</p>
                <p className="text-xs text-amber-400/70 mt-0.5">Балл, тушунтиришлар, хатоликлар ва тавсияларни ўзгартиришингиз мумкин. Тайёр бўлгандан сўнг «Таҳрирлашни якунлаш» тугмасини босинг.</p>
              </div>
              <button
                onClick={() => setIsEditMode(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-all"
              >
                <Save size={13} /> Сақлаш
              </button>
            </div>
          )}
          <div className="rounded-2xl border border-border/40 bg-card/80 overflow-hidden">
            {/* Top accent line */}
            <div className="h-1 bg-gradient-to-r from-primary via-blue-500 to-purple-500" />

            <div className="p-6">
              {/* Title */}
              <div className="text-center mb-6">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mb-1">
                  "MARKETING MARKAZI" · SIFAT NAZORATI (OKK)
                </p>
                <h2 className="text-lg font-bold text-foreground">Umumiy natija</h2>
              </div>

              {/* Info Grid */}
              <div className="grid sm:grid-cols-2 gap-3 mb-6">
                <div className="space-y-2">
                  {[
                    { label: 'Kompaniya nomi', value: report.companyName },
                    { label: 'Lavomi', value: report.managerPosition },
                    { label: 'Xodim', value: report.managerName },
                    ...(report.customerName ? [{ label: 'Mijoz', value: report.customerName }] : []),
                    ...(okkOfficer ? [{ label: 'ОКК масъул ходим', value: okkOfficer }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-baseline gap-2">
                      <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}:</span>
                      <span className="text-sm font-semibold text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'Baholash tizimi', value: `${report.maxScore} ball` },
                    { label: 'Audio davomiyligi', value: report.audioDurationSeconds > 0 ? formatDuration(report.audioDurationSeconds) : '—' },
                    { label: 'Fayl nomi', value: report.audioFileName },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-baseline gap-2">
                      <span className="text-xs text-muted-foreground w-28 flex-shrink-0">{label}:</span>
                      <span className="text-sm font-semibold text-foreground truncate">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* BIG Score */}
              <div className="flex flex-col items-center py-6 border-t border-border/30 border-b border-border/30 mb-6">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                  Umumiy audiodan olgan bali
                </p>
                <div className={cn(
                  'w-32 h-32 rounded-full flex flex-col items-center justify-center border-4',
                  report.totalScore >= 80
                    ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                    : report.totalScore >= 60
                    ? 'border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.3)]'
                    : 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                )}>
                  <span className={cn(
                    'text-4xl font-black',
                    getScoreColor(report.totalScore, report.maxScore)
                  )}>
                    {report.totalScore}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">/ {report.maxScore}</span>
                </div>

                {report.hasCriticalFails && (
                  <div className="mt-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30">
                    <AlertCircle size={13} className="text-red-400" />
                    <span className="text-xs font-bold text-red-400">KRITIK XATOLAR MAVJUD</span>
                  </div>
                )}
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl bg-muted/30 p-3 text-center border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Menejer gapirdi</p>
                  <p className="text-xl font-bold text-foreground mt-1">{report.managerTalkRatio}%</p>
                </div>
                <div className="rounded-xl bg-muted/30 p-3 text-center border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sotish ehtimoli</p>
                  <p className={cn('text-xl font-bold mt-1', getScoreColor(report.saleProbability, 100))}>
                    {report.saleProbability}%
                  </p>
                </div>
                <div className="rounded-xl bg-muted/30 p-3 text-center border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Uzilishlar</p>
                  <p className="text-xl font-bold text-foreground mt-1">{report.interruptions}</p>
                </div>
                <div className="rounded-xl bg-muted/30 p-3 text-center border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Qo'ng'iroq natijasi</p>
                  <p className="text-sm font-bold text-primary mt-1 truncate">{report.callResult || '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tahlil mundarijasi — 9 criteria */}
          <div className="rounded-2xl border border-border/40 bg-card/60 p-5">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
              <Target size={16} className="text-primary" />
              Таҳлил мундарижаси
            </h3>
            <div className="space-y-2">
              {report.criteria.map((c, i) => (
                <CriterionCard
                  key={c.code}
                  c={c}
                  index={i + 1}
                  editMode={isEditMode}
                  onChange={updated => {
                    const newCriteria = report.criteria.map((cr, idx) => idx === i ? updated : cr)
                    const newTotal = newCriteria.reduce((sum, cr) => sum + cr.score, 0)
                    setReport({
                      ...report,
                      criteria: newCriteria,
                      totalScore: newTotal,
                      hasCriticalFails: newCriteria.some(cr => cr.criticalFail),
                    })
                  }}
                />
              ))}
            </div>
          </div>

          {/* Business Analysis */}
          {report.businessAnalysis && (
            <div className="rounded-2xl border border-border/40 bg-card/60 p-5">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                <Brain size={16} className="text-purple-400" />
                Бизнес таҳлил ва тушунчалар
              </h3>
              <div className="space-y-3">
                {Object.entries(report.businessAnalysis)
                  .filter(([key, v]) => v && key !== 'callContext')
                  .map(([key, value]) => {
                    const labels: Record<string, string> = {
                      customerRequest: 'Мурожаат мазмуни',
                      productDemand: 'Талаб ва ассортимент',
                      operations: 'Операцион маълумот',
                      logistics: 'Логистика',
                      objections: 'Эътирозлар',
                      refusalReasons: 'Рад этиш сабаблари',
                      marketingInsights: 'Маркетинг инсайт',
                      managerPerformance: 'Оператор компетенцияси',
                      customerSentiment: 'Мижоз кайфияти',
                      businessInsights: 'Бизнес инсайт',
                      managementRecommendations: 'Бошқарув тавсиялари',
                    }
                    return (
                      <div key={key} className="rounded-xl bg-muted/20 border border-border/30 p-3">
                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">
                          {labels[key] || key}
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">{value as string}</p>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Summary & Recommendations */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Strengths */}
            {report.strengths.length > 0 && (
              <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <CheckCircle2 size={13} />
                  Кучли томонлар
                  {isEditMode && (
                    <button onClick={() => setReport({ ...report, strengths: [...report.strengths, ''] })} className="ml-auto text-emerald-400/60 hover:text-emerald-400">
                      <PlusCircle size={13} />
                    </button>
                  )}
                </h3>
                <ul className="space-y-2">
                  {report.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      {isEditMode ? (
                        <>
                          <Star size={10} className="text-emerald-400 mt-1.5 flex-shrink-0" />
                          <input
                            value={s}
                            onChange={e => { const a = [...report.strengths]; a[i] = e.target.value; setReport({ ...report, strengths: a }) }}
                            className="flex-1 text-xs px-2 py-1 rounded-lg bg-muted/40 border border-emerald-500/30 text-foreground focus:outline-none"
                          />
                          <button onClick={() => setReport({ ...report, strengths: report.strengths.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-400">
                            <Trash2 size={11} />
                          </button>
                        </>
                      ) : (
                        <>
                          <Star size={10} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                          {s}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Mistakes */}
            {report.mistakes.length > 0 && (
              <div className="rounded-2xl border border-red-500/25 bg-red-500/5 p-4">
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <AlertCircle size={13} />
                  Хатолар
                  {isEditMode && (
                    <button onClick={() => setReport({ ...report, mistakes: [...report.mistakes, ''] })} className="ml-auto text-red-400/60 hover:text-red-400">
                      <PlusCircle size={13} />
                    </button>
                  )}
                </h3>
                <ul className="space-y-2">
                  {report.mistakes.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      {isEditMode ? (
                        <>
                          <X size={10} className="text-red-400 mt-1.5 flex-shrink-0" />
                          <input
                            value={m}
                            onChange={e => { const a = [...report.mistakes]; a[i] = e.target.value; setReport({ ...report, mistakes: a }) }}
                            className="flex-1 text-xs px-2 py-1 rounded-lg bg-muted/40 border border-red-500/30 text-foreground focus:outline-none"
                          />
                          <button onClick={() => setReport({ ...report, mistakes: report.mistakes.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-400">
                            <Trash2 size={11} />
                          </button>
                        </>
                      ) : (
                        <>
                          <X size={10} className="text-red-400 mt-0.5 flex-shrink-0" />
                          {m}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Tavsiya */}
          {(report.ropRecommendation || isEditMode) && (
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-5">
              <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck size={13} />
                Тавсия
              </h3>
              {isEditMode ? (
                <textarea
                  rows={3}
                  value={report.ropRecommendation || ''}
                  onChange={e => setReport({ ...report, ropRecommendation: e.target.value })}
                  placeholder="Тавсия матни..."
                  className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-blue-500/30 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-blue-500/40 resize-none"
                />
              ) : (
                <p className="text-sm text-foreground leading-relaxed">{report.ropRecommendation}</p>
              )}
            </div>
          )}

          {/* Next Step */}
          {(report.nextStep || isEditMode || true) && (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={13} />
                  Кейинги қадам
                  <span className="text-[10px] font-normal text-muted-foreground ml-1">
                    (Таҳрирланиши мумкин)
                  </span>
                </h3>
                <button
                  onClick={() => {
                    if (isEditingNextStepInline) {
                      setReport({ ...report, nextStep: editingNextStep })
                      setIsEditingNextStepInline(false)
                      toast.success('Кейинги қадам сақланди ✓')
                    } else {
                      setEditingNextStep(report.nextStep || '')
                      setIsEditingNextStepInline(true)
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                >
                  {isEditingNextStepInline ? (
                    <><Save size={12} /> Сақлаш</>
                  ) : (
                    <><Pencil size={12} /> Таҳрирлаш</>
                  )}
                </button>
              </div>

              {isEditMode || isEditingNextStepInline ? (
                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={editingNextStep}
                    onChange={e => {
                      setEditingNextStep(e.target.value)
                      setReport({ ...report, nextStep: e.target.value })
                    }}
                    placeholder="Кейинги қадамни киритинг (масалан: Сешанба куни соат 15:00 да қайта боғланиш)..."
                    className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-primary/30 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none font-medium"
                  />
                  {isEditingNextStepInline && (
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setReport({ ...report, nextStep: editingNextStep })
                          setIsEditingNextStepInline(false)
                          toast.success('Кейинги қадам сақланди ✓')
                        }}
                        className="flex items-center gap-1 px-3 py-1 text-xs font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                      >
                        <Save size={12} /> Сақлаш
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-foreground leading-relaxed font-semibold">
                  {report.nextStep || 'Кейинги қадам келишилмади'}
                </p>
              )}
            </div>
          )}

          {/* ─── Ideal AI Script Suggestion Card ─── */}
          {report.idealScriptSuggestions && report.idealScriptSuggestions.length > 0 && (
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-card to-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-400" />
                  <h3 className="text-sm font-bold text-foreground">Сўзлашув варианти</h3>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  +90% сотув эҳтимоли
                </span>
              </div>
              {report.idealScriptSuggestions.map((s, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                  <div className="flex items-start gap-2 text-xs">
                    <span className="font-bold text-red-400 shrink-0">Мижоз эътирози:</span>
                    <span className="text-muted-foreground italic">«{s.customer_objection}»</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <span className="font-bold text-amber-400 shrink-0">Менежер жавоби:</span>
                    <span className="text-muted-foreground/80">«{s.manager_answer}»</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-medium leading-relaxed">
                    <span className="font-bold text-emerald-400 block mb-0.5">✨ AI Идеал Скрипт таклифи:</span>
                    {s.ideal_ai_script}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── ROP Training & Action Plan Card ─── */}
          {report.ropTrainingPlan && (
            <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/20 via-card to-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <GraduationCap size={18} className="text-purple-400" />
                <h3 className="text-sm font-bold text-foreground">Менежерга тавсия</h3>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">Паст кўникма</span>
                  <p className="text-xs font-bold text-foreground">{report.ropTrainingPlan.weak_skill}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">Рекомендуемый тренинг</span>
                  <p className="text-xs font-medium text-foreground">{report.ropTrainingPlan.recommended_training}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Ходимга топшириқ</span>
                  <p className="text-xs font-medium text-foreground">{report.ropTrainingPlan.task_for_manager}</p>
                </div>
              </div>
            </div>
          )}

          {/* Key Quotes */}
          {report.importantQuotes.length > 0 && (
            <div className="rounded-2xl border border-border/40 bg-card/60 p-5">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                <MessageSquare size={16} className="text-blue-400" />
                Muhim iqtiboslar
              </h3>
              <div className="space-y-2">
                {report.importantQuotes.slice(0, 5).map((q, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5',
                      q.speaker === 'MANAGER'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-purple-500/20 text-purple-400'
                    )}>
                      {q.speaker === 'MANAGER' ? 'M' : 'Mij'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-muted-foreground font-mono">[{q.timestamp}]</span>
                      <p className="text-xs text-foreground mt-0.5 italic">«{q.text}»</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Needs & Filler Words */}
          {(report.customerNeeds.length > 0 || report.fillerWords.length > 0) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {report.customerNeeds.length > 0 && (
                <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    Mijoz ehtiyojlari
                  </h3>
                  <ul className="space-y-1.5">
                    {report.customerNeeds.map((n, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                        <span className="w-4 h-4 rounded bg-primary/20 text-primary text-[9px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {report.fillerWords.length > 0 && (
                <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    To'ldiruvchi so'zlar
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {report.fillerWords.map((fw, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-lg bg-orange-500/15 border border-orange-500/25 text-xs text-orange-400 font-mono"
                      >
                        «{fw.word}» × {fw.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── STT Transcript Edit ─────────────────────────────────── */}
          {(editingTranscript || report.transcript) && (
            <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden">
              <button
                onClick={() => setShowTranscript(s => !s)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={15} className="text-blue-400" />
                  <span className="text-sm font-bold text-foreground">STT Транскрипция</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 font-bold">
                    Таҳрирлаш мумкин
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className={cn('text-muted-foreground transition-transform duration-200', showTranscript && 'rotate-180')}
                />
              </button>

              {showTranscript && (
                <div className="px-5 pb-5 border-t border-border/30 pt-4 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Aisha AI STT томонидан яратилган транскрипция. Хатоларни тузатишингиз мумкин.
                  </p>
                  <textarea
                    rows={12}
                    value={editingTranscript}
                    onChange={e => setEditingTranscript(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-blue-500/30 text-xs text-foreground font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-y"
                    placeholder="Транскрипция юкланмади..."
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      {editingTranscript.length} белги · {editingTranscript.split('\n').length} қатор
                    </p>
                    <button
                      onClick={() => {
                        setReport({ ...report, transcript: editingTranscript })
                        toast.success('Транскрипция сақланди ✓')
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 transition-all"
                    >
                      <Save size={12} /> Сақлаш
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── Analytics ─────────────────────────────────── */}
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-card/80 to-card/40 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2 bg-primary/5">
              <BarChart3 size={16} className="text-primary" />
              <h3 className="text-sm font-black text-foreground tracking-wide">АНАЛИТИКА</h3>
              <span className="ml-auto text-xs font-bold text-primary">
                {Math.round((report.totalScore / report.maxScore) * 100)}% умумий натижа
              </span>
            </div>

            {/* Criteria bars */}
            <div className="px-5 py-4 space-y-2.5">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3">Мезонлар бўйича баҳо</p>
              {report.criteria.filter(c => c.status !== 'NOT_APPLICABLE').map((c, i) => {
                const pct = c.maxScore > 0 ? Math.round((c.score / c.maxScore) * 100) : 0
                const barColor = pct >= 80 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : pct >= 60 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' : 'bg-gradient-to-r from-red-600 to-red-500'
                const textColor = pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-yellow-400' : 'text-red-400'
                return (
                  <div key={c.code} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground/60 w-3 text-right flex-shrink-0">{i + 1}</span>
                    <span className="text-xs text-foreground font-medium flex-1 min-w-0 truncate">{c.nameUz.replace(/^\d+\.\s*/, '')}</span>
                    <div className="w-28 h-2 rounded-full bg-muted/40 overflow-hidden flex-shrink-0">
                      <div
                        className={cn('h-full rounded-full transition-all duration-700', barColor)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={cn('text-xs font-black w-8 text-right flex-shrink-0 tabular-nums', textColor)}>{pct}%</span>
                  </div>
                )
              })}
            </div>

            {/* Key metrics row — like FIFA card bottom stats */}
            <div className="border-t border-border/20 px-5 py-4 bg-muted/10">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-4">Асосий кўрсаткичлар</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  { label: 'Умумий', value: Math.round((report.totalScore / report.maxScore) * 100), color: 'text-primary' },
                  { label: 'Сотиш', value: report.saleProbability, color: report.saleProbability >= 60 ? 'text-emerald-400' : 'text-red-400' },
                  { label: 'Менежер', value: report.managerTalkRatio, color: 'text-blue-400' },
                  { label: 'Мижоз', value: report.customerTalkRatio || Math.max(0, 100 - report.managerTalkRatio), color: 'text-purple-400' },
                  { label: 'Узилиш', value: Math.max(0, 100 - report.interruptions * 10), color: report.interruptions <= 2 ? 'text-emerald-400' : 'text-yellow-400' },
                  { label: 'OKK', value: report.hasCriticalFails ? 20 : Math.round((report.totalScore / report.maxScore) * 100), color: report.hasCriticalFails ? 'text-red-400' : 'text-emerald-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5">
                    <div className="relative w-14 h-14 flex items-center justify-center">
                      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56" fill="none">
                        <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                        <circle
                          cx="28" cy="28" r="22"
                          stroke="currentColor"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={`${2 * Math.PI * 22}`}
                          strokeDashoffset={`${2 * Math.PI * 22 * (1 - Math.min(100, value) / 100)}`}
                          className={color}
                        />
                      </svg>
                      <span className={cn('text-sm font-black tabular-nums', color)}>{value}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground text-center font-bold uppercase tracking-wider">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sale probability bar */}
            <div className="border-t border-border/20 px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={12} />
                  Сотиш эҳтимоли
                </span>
                <span className={cn(
                  'text-2xl font-black tabular-nums',
                  report.saleProbability >= 70 ? 'text-emerald-400' :
                  report.saleProbability >= 40 ? 'text-yellow-400' : 'text-red-400'
                )}>{report.saleProbability}%</span>
              </div>
              <div className="h-3 rounded-full bg-muted/40 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-1000',
                    report.saleProbability >= 70 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' :
                    report.saleProbability >= 40 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                    'bg-gradient-to-r from-red-700 to-red-400'
                  )}
                  style={{ width: `${report.saleProbability}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-1.5 font-mono">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
              </div>
            </div>
          </div>

          {/* Radar Chart SVG — Image 3 style */}
          <div
            className="mt-6 flex justify-center overflow-x-auto"
            dangerouslySetInnerHTML={{
              __html: generateRadarChartSVG(
                report.criteria,
                report.audioDurationSeconds > 0
                  ? `${Math.floor(report.audioDurationSeconds / 60)}:${String(Math.floor(report.audioDurationSeconds % 60)).padStart(2, '0')}`
                  : '5:19'
              )
            }}
          />

          {/* Print / Reset Footer */}
          <div className="flex items-center justify-center gap-3 pt-2 print:hidden">
            <button
              onClick={generatePDF}
              disabled={isEditMode}
              title={isEditMode ? 'Аввал таҳрирлашни якунланг' : ''}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg',
                isEditMode
                  ? 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              <Download size={15} />
              PDF юклаш
            </button>
            <button
              onClick={() => setIsEditMode(m => !m)}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all',
                isEditMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-muted hover:bg-muted/80 border-border/50 text-muted-foreground hover:text-foreground'
              )}
            >
              {isEditMode ? <><Save size={15} /> Сақлаш</> : <><Pencil size={15} /> Таҳрирлаш</>}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 border border-border/50 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all"
            >
              <RotateCcw size={15} />
              Янги таҳлил
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
