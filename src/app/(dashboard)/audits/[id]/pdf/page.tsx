'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, XCircle, Minus, AlertTriangle, Briefcase, TrendingUp } from 'lucide-react'
import { cn, formatDateTime, formatDuration } from '@/lib/utils'
import { MARKETING_MARKAZI_LOGO_BASE64 } from '@/lib/constants/marketing-markazi-logo'


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
  evidenceQuote?: string
  status?: CriterionStatus
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

interface AuditDetail {
  id: string
  aiScore: number
  finalScore: number
  maxPossibleScore: number
  summary: string
  strengthsJson: string[]
  mistakesJson: string[]
  recommendationsJson: string[]
  saleProbability: number
  managerTalkRatio: number
  customerTalkRatio: number
  callType: string
  completedAt: string
  hasCriticalFails?: boolean
  callResult?: string
  ropRecommendation?: string
  businessAnalysisJson?: BusinessAnalysis
  nextStep?: string
  criterionResults: CriterionResult[]
  call: {
    talkDurationSeconds: number
    manager?: { name: string }
    customer?: { name: string; phone: string }
  }
}

export default function AuditPdfPage() {
  const params = useParams()
  const [audit, setAudit] = useState<AuditDetail | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)

  const parseJsonArray = (val: any): any[] => {
    if (Array.isArray(val)) return val
    if (typeof val === 'string') {
      try {
        const p = JSON.parse(val)
        return Array.isArray(p) ? p : typeof p === 'string' ? [p] : []
      } catch {
        return val ? [val] : []
      }
    }
    return []
  }

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setCompanyId(d.user.companyId)
      })
  }, [])

  useEffect(() => {
    if (!companyId || !params.id) return
    fetch(`/api/${companyId}/audits/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          const raw = d.data
          setAudit({
            ...raw,
            strengthsJson: parseJsonArray(raw.strengthsJson),
            mistakesJson: parseJsonArray(raw.mistakesJson),
            recommendationsJson: parseJsonArray(raw.recommendationsJson),
          })
          // Trigger print dialog after a brief delay
          setTimeout(() => {
            window.print()
          }, 800)
        }
      })
  }, [companyId, params.id])

  if (!audit) {
    return <div className="p-10 text-center text-gray-500 font-sans">Хужжат тайёрланмоқда...</div>
  }

  const businessAnalysisLabels: Record<keyof BusinessAnalysis, string> = {
    callContext: 'Қўнғироқ контексти',
    customerRequest: 'Мижоз мурожаати',
    productDemand: 'Маҳсулот талаби',
    operations: 'Операцион масалалар',
    logistics: 'Логистика',
    objections: 'Эътирозлар',
    refusalReasons: 'Рад сабаблари',
    marketingInsights: 'Маркетинг манбаси',
    managerPerformance: 'Менежер компетенцияси',
    customerSentiment: 'Мижоз кайфияти',
    businessInsights: 'Бизнес инсайт',
    managementRecommendations: 'Бошқарув тавсиялари',
  }

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
        const name = String(c.criterion?.nameUz || c.criterionCode || '').toLowerCase()
        return axis.keywords.some(k => name.includes(k.toLowerCase()))
      })
      if (matched.length > 0) {
        const sumScore = matched.reduce((acc, c) => acc + (c.finalScore || 0), 0)
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

  return (
    <div className="bg-white min-h-screen font-sans text-gray-900 max-w-[960px] mx-auto p-8 print:p-0 print:max-w-none text-base leading-relaxed">
      {/* Header */}
      <div className="border-b-2 border-gray-900 pb-5 mb-8 flex justify-between items-center">
        <div className="flex items-center gap-5">
          {/* Marketing Markazi Official 1:1 Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MARKETING_MARKAZI_LOGO_BASE64}
            alt="Marketing Markazi"
            className="h-16 w-auto object-contain"
          />

          <div className="h-8 w-0.5 bg-gray-300"></div>


          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black px-2.5 py-1 rounded bg-gray-900 text-white tracking-widest uppercase">Fraganus AI</span>
              <span className="text-xs font-bold text-gray-600 tracking-wider uppercase">Сифат Назорати (ОКК)</span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">АУДИТ ВА ЭКСПЕРТИЗА ҲИСОБОТИ</h1>
          </div>
        </div>

        <div className="text-right text-xs space-y-1">
          <p><span className="font-bold text-gray-600">Сана:</span> <span className="font-semibold text-gray-900">{formatDateTime(audit.completedAt)}</span></p>
          <p><span className="font-bold text-gray-600">ID:</span> <span className="font-mono font-bold text-gray-900">{audit.id.slice(0, 8).toUpperCase()}</span></p>
        </div>
      </div>

      {/* Critical Alert if exists */}
      {audit.hasCriticalFails && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border-2 border-red-500 text-red-900 flex items-start gap-3">
          <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={22} />
          <div>
            <p className="text-base font-black uppercase tracking-wide text-red-700">Критик хато аниқланган</p>
            <p className="text-sm text-red-800 font-medium mt-0.5">
              Ушбу қўнғироқда жиддий регламент бузилиши ёки критик мезон бажарилмаслиги қайд этилган.
            </p>
          </div>
        </div>
      )}

      {/* Overview & Scores */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Call Info */}
        <div className="border border-gray-300 rounded-xl p-5 bg-gray-50/70">
          <h2 className="text-xs font-black text-gray-600 uppercase tracking-wider mb-3.5 border-b border-gray-300 pb-2">
            Қўнғироқ маълумотлари
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Менежер:</span>
              <span className="font-bold text-gray-900">{audit.call.manager?.name || 'Номаълум'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Мижоз:</span>
              <span className="font-bold text-gray-900">{audit.call.customer?.name || audit.call.customer?.phone || 'Номаълум'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Қўнғироқ тури:</span>
              <span className="font-bold text-gray-900">{audit.callType}</span>
            </div>
            {audit.callResult && (
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Натижа:</span>
                <span className="font-black text-emerald-700">{audit.callResult}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Давомийлик:</span>
              <span className="font-bold text-gray-900">{formatDuration(audit.call.talkDurationSeconds)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">Суҳбат улуши:</span>
              <span className="font-bold text-gray-900">Менежер {audit.managerTalkRatio}% / Мижоз {audit.customerTalkRatio}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 font-medium">ОКК ходими:</span>
              <span className="font-bold text-gray-900">{(audit as any).okkOfficer || '—'}</span>
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="border border-gray-300 rounded-xl p-5 bg-gray-50/70 flex flex-col justify-between">
          <h2 className="text-xs font-black text-gray-600 uppercase tracking-wider border-b border-gray-300 pb-2">
            Баҳолаш натижаси
          </h2>
          <div className="flex items-center justify-around py-4">
            <div className="text-center">
              <span className="text-4xl font-black text-gray-900 block">{audit.finalScore}</span>
              <span className="text-xs font-bold text-gray-600 uppercase">
                {audit.aiScore !== audit.finalScore ? 'QC БАЛЛ' : 'УМУМИЙ БАЛЛ'} ({audit.maxPossibleScore} МАКС)
              </span>
              {audit.aiScore !== audit.finalScore && (
                <span className="text-xs text-gray-400 block line-through">AI: {audit.aiScore}</span>
              )}
            </div>
            <div className="w-px h-14 bg-gray-300"></div>
            <div className="text-center">
              <span className="text-4xl font-black text-violet-700 block">{audit.saleProbability}%</span>
              <span className="text-xs font-bold text-gray-600 uppercase">СОТУВ ЭҲТИМОЛИ</span>
            </div>
          </div>
          {audit.nextStep && (
            <div className="text-xs bg-violet-50 text-violet-900 p-2.5 rounded-lg font-semibold border border-violet-200">
              🎯 <strong>Кейинги қадам:</strong> {audit.nextStep}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mb-8">
        <h2 className="text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Хулоса</h2>
        <p className="text-sm text-gray-900 leading-relaxed font-medium border-l-4 border-gray-900 pl-4 py-3 bg-gray-50 rounded-r-xl">
          {audit.summary}
        </p>
      </div>

      {/* ROP Recommendation */}
      {audit.ropRecommendation && (
        <div className="mb-8 p-4 bg-violet-50 border border-violet-200 rounded-xl">
          <h2 className="text-xs font-black text-violet-900 uppercase tracking-wider mb-1.5 flex items-center gap-2">
            <TrendingUp size={16} /> РОП ва Раҳбарият учун тавсия
          </h2>
          <p className="text-sm text-violet-950 font-medium leading-relaxed">{audit.ropRecommendation}</p>
        </div>
      )}

      {/* Strengths & Mistakes */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="border border-green-200 rounded-xl p-4 bg-green-50/40">
          <h2 className="text-xs font-black text-green-800 uppercase tracking-wider mb-3">Кучли томонлар</h2>
          <ul className="space-y-2">
            {audit.strengthsJson.map((s, i) => (
              <li key={i} className="text-sm font-medium text-gray-900 flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-red-200 rounded-xl p-4 bg-red-50/40">
          <h2 className="text-xs font-black text-red-800 uppercase tracking-wider mb-3">Хатоликлар</h2>
          <ul className="space-y-2">
            {audit.mistakesJson.map((m, i) => (
              <li key={i} className="text-sm font-medium text-gray-900 flex items-start gap-2">
                <span className="text-red-600 font-bold mt-0.5">✗</span>
                <span className="leading-relaxed">{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Business Analysis Section */}
      {audit.businessAnalysisJson && Object.keys(audit.businessAnalysisJson).length > 0 && (
        <div className="mb-8 break-inside-avoid">
          <h2 className="text-xs font-black text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-2 border-b border-gray-300 pb-2">
            <Briefcase size={16} /> Бизнес таҳлил ва Инсайтлар
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {(Object.entries(audit.businessAnalysisJson) as [keyof BusinessAnalysis, string][])
              .filter(([, v]) => v)
              .map(([key, value]) => (
                <div key={key} className="border border-gray-300 rounded-xl p-3 bg-gray-50/80 text-xs">
                  <p className="font-black text-gray-600 text-[11px] uppercase tracking-wider">{businessAnalysisLabels[key] || key}</p>
                  <p className="text-gray-900 font-medium mt-1 text-sm leading-relaxed">{value}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Checklist Table */}
      <div className="break-inside-auto mb-8">
        <h2 className="text-xs font-black text-gray-600 uppercase tracking-wider mb-3 border-b-2 border-gray-900 pb-2">
          Чек-лист (Мезонлар бўйича баҳолаш)
        </h2>
        <div className="border border-gray-300 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 border-b border-gray-300 text-gray-700 font-black uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-14 text-center">Ҳолат</th>
                <th className="py-3 px-4 w-1/3">Мезон номи</th>
                <th className="py-3 px-4">Изоҳ ва Далиллар</th>
                <th className="py-3 px-4 w-24 text-right">Балл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {audit.criterionResults.map((cr) => {
                const isNA = cr.status === 'NOT_APPLICABLE'
                return (
                  <tr key={cr.id} className="bg-white break-inside-avoid">
                    <td className="py-3 px-4 align-top text-center">
                      {isNA ? (
                        <span className="text-[10px] font-black px-2 py-0.5 bg-gray-100 text-gray-500 rounded border">N/A</span>
                      ) : cr.criticalFail ? (
                        <AlertTriangle size={18} className="text-red-600 inline" />
                      ) : cr.status === 'PASS' || cr.passed ? (
                        <CheckCircle size={18} className="text-green-600 inline" />
                      ) : cr.status === 'PARTIAL' ? (
                        <CheckCircle size={18} className="text-amber-500 inline" />
                      ) : (
                        <XCircle size={18} className="text-red-600 inline" />
                      )}
                    </td>
                    <td className="py-3 px-4 align-top font-bold text-gray-900 text-base">
                      {cr.criterion?.nameUz || cr.criterionCode}
                      {cr.criterion?.isCritical && !isNA && (
                        <span className="ml-1.5 text-[9px] font-black px-1.5 py-0.5 bg-red-100 text-red-700 rounded uppercase">критик</span>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top text-gray-700 text-sm leading-relaxed font-medium">
                      {cr.explanationUz || '—'}
                      {cr.evidenceQuote && (
                        <p className="mt-1.5 text-xs text-gray-600 italic bg-gray-50 p-2 rounded-lg border border-gray-200">
                          «{cr.evidenceQuote}»
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top text-right font-black text-gray-900 whitespace-nowrap text-base">
                      {isNA ? '—' : `${cr.finalScore} / ${cr.maxScore}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 📊 Analytics Section */}
      <div className="my-8 p-6 border-2 border-gray-300 rounded-2xl bg-gray-50/70 break-inside-auto">
        <div className="text-lg font-black text-gray-900 mb-4 border-b-2 border-gray-300 pb-2 flex justify-between items-center">
          <span>📊 АНАЛИТИКА</span>
          <span className="text-xs font-bold text-gray-600">
            {Math.round((audit.finalScore / audit.maxPossibleScore) * 100)}% умумий натижа
          </span>
        </div>

        {/* Criteria bars */}
        <div className="space-y-2 mb-6">
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Мезонлар бўйича баҳо</p>
          {audit.criterionResults
            .filter((c) => c.status !== 'NOT_APPLICABLE')
            .map((c, i) => {
              const pct = c.maxScore > 0 ? Math.round((c.finalScore / c.maxScore) * 100) : 0
              const colorCls = pct >= 80 ? 'bg-emerald-600' : pct >= 60 ? 'bg-amber-500' : 'bg-red-600'
              const textCls = pct >= 80 ? 'text-emerald-700' : pct >= 60 ? 'text-amber-700' : 'text-red-700'
              return (
                <div key={c.id} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-400 w-4 text-right font-mono">{i + 1}.</span>
                  <span className="font-semibold text-gray-800 flex-1 truncate">
                    {(c.criterion?.nameUz || c.criterionCode).replace(/greeting_hello/gi, 'Саломлашиш ва идентификация').replace(/^\d+\.\s*/, '')}
                  </span>
                  <div className="w-32 h-2 rounded-full bg-gray-200 overflow-hidden shrink-0">
                    <div className={cn('h-full rounded-full', colorCls)} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={cn('w-9 text-right font-black tabular-nums', textCls)}>{pct}%</span>
                </div>
              )
            })}
        </div>

        {/* Key indicators grid */}
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-3">Асосий кўрсаткичлар</p>
        <div className="grid grid-cols-6 gap-2 mb-4 text-center">
          <div className="border border-gray-300 rounded-xl p-2.5 bg-white">
            <div className="text-lg font-black text-blue-600">{Math.round((audit.finalScore / audit.maxPossibleScore) * 100)}%</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">Умумий</div>
          </div>
          <div className="border border-gray-300 rounded-xl p-2.5 bg-white">
            <div className={cn('text-lg font-black', audit.saleProbability >= 60 ? 'text-emerald-600' : 'text-red-600')}>
              {audit.saleProbability}%
            </div>
            <div className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">Сотиш</div>
          </div>
          <div className="border border-gray-300 rounded-xl p-2.5 bg-white">
            <div className="text-lg font-black text-sky-600">{audit.managerTalkRatio}%</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">Менежер</div>
          </div>
          <div className="border border-gray-300 rounded-xl p-2.5 bg-white">
            <div className="text-lg font-black text-purple-600">{audit.customerTalkRatio}%</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">Мижоз</div>
          </div>
          <div className="border border-gray-300 rounded-xl p-2.5 bg-white">
            <div className="text-lg font-black text-amber-600">
              {Math.max(0, 100 - ((audit as any).interruptionsCount || 0) * 10)}%
            </div>
            <div className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">Узилиш</div>
          </div>
          <div className="border border-gray-300 rounded-xl p-2.5 bg-white">
            <div className={cn('text-lg font-black', audit.hasCriticalFails ? 'text-red-600' : 'text-emerald-600')}>
              {audit.hasCriticalFails ? '20%' : `${Math.round((audit.finalScore / audit.maxPossibleScore) * 100)}%`}
            </div>
            <div className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">ОКК</div>
          </div>
        </div>

        {/* Sale probability bar */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="font-bold text-gray-600 uppercase">Сотиш эҳтимоли</span>
            <span className="font-black text-gray-900 text-sm">{audit.saleProbability}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                audit.saleProbability >= 70 ? 'bg-emerald-600' : audit.saleProbability >= 40 ? 'bg-amber-500' : 'bg-red-600'
              )}
              style={{ width: `${audit.saleProbability}%` }}
            />
          </div>
        </div>
      </div>

      <div
        className="my-6 flex justify-center"
        dangerouslySetInnerHTML={{
          __html: generateRadarChartSVG(
            audit.criterionResults,
            formatDuration(audit.call.talkDurationSeconds)
          )
        }}
      />

      {/* ── COPYRIGHT & INTELLECTUAL PROPERTY SECTION ── */}
      <div className="my-8 p-6 bg-gray-50 border-2 border-gray-300 rounded-2xl break-inside-avoid">
        <div className="text-lg font-black text-gray-900 mb-2 border-b-2 border-gray-300 pb-2">
          Marketing Markazi Fraganus AI — Муаллифлик ҳуқуқи
        </div>
        <div className="text-sm font-extrabold text-gray-800 mb-3">
          © 2026 Marketing Markazi. Барча ҳуқуқлар ҳимояланган.
        </div>
        <p className="text-xs text-gray-700 leading-relaxed mb-2.5 font-medium">
          Fraganus AI дастурий маҳсулоти, унинг архитектураси, дастурий коди, функционал имкониятлари, сунъий интеллект асосидаги ечимлари, интерфейси, дизайни, алгоритмлари ва бошқа таркибий қисмлари Marketing Markaziнинг интеллектуал мулки ҳисобланади.
        </p>
        <p className="text-xs text-gray-700 leading-relaxed mb-2.5 font-medium">
          Fraganus AI мижозларга фойдаланиш ҳуқуқи асосида тақдим этилади. Дастурдан фойдаланиш ҳуқуқининг берилиши дастурга бўлган муаллифлик ёки мулкий ҳуқуқларнинг бошқа шахс ёки ташкилотга ўтишини англатмайди.
        </p>
        <p className="text-xs font-bold text-gray-900 mb-1.5">
          Marketing Markazi’нинг олдиндан ёзма розилигисиз Fraganus AI дастурини ёки унинг алоҳида қисмларини:
        </p>
        <ul className="text-xs text-gray-700 leading-relaxed pl-5 mb-2.5 list-disc font-medium">
          <li>нусхалаш;</li>
          <li>қайта сотиш;</li>
          <li>учинчи шахсларга тарқатиш;</li>
          <li>ўзгартириш ёки қайта ишлаш;</li>
          <li>дастурий кодини олишга ёки таҳлил қилишга уриниш;</li>
          <li>бошқа маҳсулот яратиш учун тўлиқ ёки қисман кўчириш;</li>
          <li>ўз номи ёки бошқа бренд остида тарқатиш</li>
        </ul>
        <p className="text-xs font-black text-red-600 mb-2">ТАҚИҚЛАХАДИ.</p>
        <p className="text-xs text-gray-700 leading-relaxed mb-2.5 font-medium">
          Fraganus AI — Marketing Markazi томонидан ишлаб чиқилган ва унга тегишли интеллектуал мулк ҳисобланади.
        </p>
        <div className="text-xs font-bold text-gray-900 mt-3 pt-2 border-t border-gray-300">
          © 2026 Marketing Markazi. All rights reserved.
        </div>
      </div>

      {/* Footer */}
      <div className="pt-5 border-t border-gray-300 text-center text-xs font-semibold text-gray-500">
        Marketing Markazi Fraganus AI Sales Intelligence System • Сифат Назорати (OKK) тизими орқали автоматик шакллантирилган
      </div>
    </div>
  )
}


