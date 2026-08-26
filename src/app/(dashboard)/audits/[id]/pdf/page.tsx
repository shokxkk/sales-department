'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, XCircle, Minus, AlertTriangle, Briefcase, TrendingUp } from 'lucide-react'
import { formatDateTime, formatDuration } from '@/lib/utils'

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

  return (
    <div className="bg-white min-h-screen font-sans text-gray-900 max-w-[920px] mx-auto p-8 print:p-0 print:max-w-none">
      {/* Header */}
      <div className="border-b-2 border-gray-900 pb-4 mb-6 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-900 text-white tracking-widest uppercase">Fraganus AI</span>
            <span className="text-xs font-bold text-gray-500 tracking-wider uppercase">Сифат Назорати (ОКК)</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-1">АУДИТ ВА ЭКСПЕРТИЗА ҲИСОБОТИ</h1>
        </div>
        <div className="text-right text-xs space-y-0.5">
          <p><span className="font-semibold text-gray-600">Сана:</span> <span className="font-medium text-gray-900">{formatDateTime(audit.completedAt)}</span></p>
          <p><span className="font-semibold text-gray-600">ID:</span> <span className="font-mono text-gray-900">{audit.id.slice(0, 8).toUpperCase()}</span></p>
        </div>
      </div>

      {/* Critical Alert if exists */}
      {audit.hasCriticalFails && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border-2 border-red-500 text-red-900 flex items-start gap-3">
          <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-red-700">Критик хато аниқланган</p>
            <p className="text-xs text-red-800 mt-0.5">
              Ушбу қўнғироқда жиддий регламент бузилиши ёки критик мезон бажарилмаслиги қайд этилган.
            </p>
          </div>
        </div>
      )}

      {/* Overview & Scores */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Call Info */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 border-b border-gray-200 pb-1.5">
            Қўнғироқ маълумотлари
          </h2>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Менежер:</span>
              <span className="font-bold text-gray-900">{audit.call.manager?.name || 'Номаълум'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Мижоз:</span>
              <span className="font-medium text-gray-900">{audit.call.customer?.name || audit.call.customer?.phone || 'Номаълум'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Қўнғироқ тури:</span>
              <span className="font-semibold text-gray-900">{audit.callType}</span>
            </div>
            {audit.callResult && (
              <div className="flex justify-between">
                <span className="text-gray-500">Натижа:</span>
                <span className="font-bold text-emerald-700">{audit.callResult}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Давомийлик:</span>
              <span className="font-medium text-gray-900">{formatDuration(audit.call.talkDurationSeconds)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Суҳбат улуши:</span>
              <span className="font-medium text-gray-900">Менежер {audit.managerTalkRatio}% / Мижоз {audit.customerTalkRatio}%</span>
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 flex flex-col justify-between">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1.5">
            Баҳолаш натижаси
          </h2>
          <div className="flex items-center justify-around py-3">
            <div className="text-center">
              <span className="text-3xl font-black text-gray-900 block">{audit.finalScore}</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">
                {audit.aiScore !== audit.finalScore ? 'QC БАЛЛ' : 'УМУМИЙ БАЛЛ'} ({audit.maxPossibleScore} МАКС)
              </span>
              {audit.aiScore !== audit.finalScore && (
                <span className="text-[9px] text-gray-400 block line-through">AI: {audit.aiScore}</span>
              )}
            </div>
            <div className="w-px h-12 bg-gray-300"></div>
            <div className="text-center">
              <span className="text-3xl font-black text-violet-700 block">{audit.saleProbability}%</span>
              <span className="text-[10px] font-bold text-gray-500 uppercase">СОТУВ ЭҲТИМОЛИ</span>
            </div>
          </div>
          {audit.nextStep && (
            <div className="text-[11px] bg-violet-50 text-violet-900 p-2 rounded-lg font-medium border border-violet-200">
              🎯 <strong>Кейинги қадам:</strong> {audit.nextStep}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Хулоса</h2>
        <p className="text-xs text-gray-800 leading-relaxed border-l-4 border-gray-900 pl-3 py-2 bg-gray-50 rounded-r-lg">
          {audit.summary}
        </p>
      </div>

      {/* ROP Recommendation */}
      {audit.ropRecommendation && (
        <div className="mb-6 p-3 bg-violet-50 border border-violet-200 rounded-xl">
          <h2 className="text-xs font-bold text-violet-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <TrendingUp size={14} /> РОП ва Раҳбарият учун тавсия
          </h2>
          <p className="text-xs text-violet-950 leading-relaxed">{audit.ropRecommendation}</p>
        </div>
      )}

      {/* Strengths & Mistakes */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="border border-green-200 rounded-xl p-3.5 bg-green-50/40">
          <h2 className="text-xs font-bold text-green-800 uppercase tracking-wider mb-2">Кучли томонлар</h2>
          <ul className="space-y-1.5">
            {audit.strengthsJson.map((s, i) => (
              <li key={i} className="text-xs text-gray-800 flex items-start gap-1.5">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span className="leading-snug">{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-red-200 rounded-xl p-3.5 bg-red-50/40">
          <h2 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-2">Хатоликлар</h2>
          <ul className="space-y-1.5">
            {audit.mistakesJson.map((m, i) => (
              <li key={i} className="text-xs text-gray-800 flex items-start gap-1.5">
                <span className="text-red-600 font-bold mt-0.5">✗</span>
                <span className="leading-snug">{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Business Analysis Section */}
      {audit.businessAnalysisJson && Object.keys(audit.businessAnalysisJson).length > 0 && (
        <div className="mb-6 break-inside-avoid">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-gray-200 pb-1.5">
            <Briefcase size={14} /> Бизнес таҳлил ва Инсайтлар
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(audit.businessAnalysisJson) as [keyof BusinessAnalysis, string][])
              .filter(([, v]) => v)
              .map(([key, value]) => (
                <div key={key} className="border border-gray-200 rounded-lg p-2.5 bg-gray-50/70 text-xs">
                  <p className="font-bold text-gray-600 text-[10px] uppercase">{businessAnalysisLabels[key] || key}</p>
                  <p className="text-gray-900 mt-0.5 leading-snug">{value}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Checklist Table */}
      <div className="break-inside-auto mb-6">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 border-b-2 border-gray-900 pb-1.5">
          Чек-лист (Мезонлар бўйича баҳолаш)
        </h2>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-100 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">Ҳолат</th>
                <th className="py-2.5 px-3 w-1/3">Мезон номи</th>
                <th className="py-2.5 px-3">Изоҳ ва Далиллар</th>
                <th className="py-2.5 px-3 w-20 text-right">Балл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {audit.criterionResults.map((cr) => {
                const isNA = cr.status === 'NOT_APPLICABLE'
                return (
                  <tr key={cr.id} className="bg-white break-inside-avoid">
                    <td className="py-2.5 px-3 align-top text-center">
                      {isNA ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded border">N/A</span>
                      ) : cr.criticalFail ? (
                        <AlertTriangle size={16} className="text-red-600 inline" />
                      ) : cr.status === 'PASS' || cr.passed ? (
                        <CheckCircle size={16} className="text-green-600 inline" />
                      ) : cr.status === 'PARTIAL' ? (
                        <CheckCircle size={16} className="text-amber-500 inline" />
                      ) : (
                        <XCircle size={16} className="text-red-600 inline" />
                      )}
                    </td>
                    <td className="py-2.5 px-3 align-top font-semibold text-gray-900">
                      {cr.criterion?.nameUz || cr.criterionCode}
                      {cr.criterion?.isCritical && !isNA && (
                        <span className="ml-1 text-[8px] font-bold px-1 py-0.5 bg-red-100 text-red-700 rounded uppercase">критик</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 align-top text-gray-600 text-[11px] leading-relaxed">
                      {cr.explanationUz || '—'}
                      {cr.evidenceQuote && (
                        <p className="mt-1 text-[10px] text-gray-500 italic bg-gray-50 p-1.5 rounded border border-gray-100">
                          «{cr.evidenceQuote}»
                        </p>
                      )}
                    </td>
                    <td className="py-2.5 px-3 align-top text-right font-bold text-gray-900 whitespace-nowrap">
                      {isNA ? '—' : `${cr.finalScore} / ${cr.maxScore}`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400">
        Fraganus AI • Сифат Назорати (OKK) тизими орқали автоматик шакллантирилган
      </div>
    </div>
  )
}
