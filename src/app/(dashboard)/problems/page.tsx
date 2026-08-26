'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Users2,
  Phone,
  User,
  ChevronDown,
  Search,
  ExternalLink,
  Brain,
  Clock,
  X,
  AlertOctagon,
  RefreshCw,
  Handshake,
  Calendar,
  CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/providers/app-provider'

interface ProblemItem {
  id: string
  manager: string
  managerId: string
  callId?: string
  dealId?: string
  clientName: string
  date: string
  duration?: string
  score?: number
  type: 'lost_deal' | 'missed_call' | 'overdue_task' | 'audit_mistake'
  severity: 'critical' | 'warning' | 'minor'
  aiComment: string
  errors: string[]
}

interface ManagerProblemStat {
  id: string
  name: string
  count: number
  critical: number
}

const SEVERITY_CONFIG = {
  critical: { label: 'Критично',  bg: 'bg-red-500/10 border-red-500/30', badge: 'bg-red-500/20 text-red-400 border-red-500/40' },
  warning:  { label: 'Внимание',  bg: 'bg-yellow-500/10 border-yellow-500/25', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  minor:    { label: 'Мелкая',    bg: 'bg-blue-500/10 border-blue-500/20', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
}

const TYPE_CONFIG = {
  lost_deal:     { label: 'Boy berilgan bitim', labelRu: 'Потерянная сделка', icon: Handshake, color: 'text-red-400' },
  missed_call:   { label: 'O‘tkazib yuborilgan', labelRu: 'Пропущенный звонок', icon: Phone, color: 'text-yellow-400' },
  overdue_task:  { label: 'Muddati o‘tgan vazifa', labelRu: 'Просроченная задача', icon: Calendar, color: 'text-orange-400' },
  audit_mistake: { label: 'AI Audit xatosi', labelRu: 'Ошибка в разговоре', icon: Brain, color: 'text-purple-400' },
}

export default function ProblemsPage() {
  const { language } = useLanguage()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [problems, setProblems] = useState<ProblemItem[]>([])
  const [managerStats, setManagerStats] = useState<ManagerProblemStat[]>([])
  const [summary, setSummary] = useState({ total: 0, critical: 0, warning: 0, minor: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterManagerId, setFilterManagerId] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [filterType, setFilterType] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.user.companyId) {
          setCompanyId(d.user.companyId)
        } else {
          setError('Tizimga kirilmagan')
          setLoading(false)
        }
      })
      .catch(() => {
        setError('Server bilan aloqa yo‘q')
        setLoading(false)
      })
  }, [])

  const fetchProblems = useCallback(() => {
    if (!companyId) return
    setLoading(true)
    setError(null)

    let url = `/api/${companyId}/problems?`
    if (filterManagerId) url += `&managerId=${filterManagerId}`
    if (filterSeverity) url += `&severity=${filterSeverity}`
    if (filterType) url += `&type=${filterType}`
    if (search) url += `&search=${encodeURIComponent(search)}`

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Muammolar ro‘yxatini yuklab bo‘lmadi')
        return r.json()
      })
      .then((d) => {
        if (d.success) {
          setProblems(d.data || [])
          setManagerStats(d.managerStats || [])
          setSummary(d.summary || { total: 0, critical: 0, warning: 0, minor: 0 })
        } else {
          setError(d.error || 'Xatolik yuz berdi')
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [companyId, filterManagerId, filterSeverity, filterType, search])

  useEffect(() => {
    if (companyId) fetchProblems()
  }, [companyId, fetchProblems])

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 border border-border/60 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
        <div className="absolute right-0 top-0 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-red-500/15 border border-red-500/25 shadow-[0_0_16px_rgba(239,68,68,0.15)]">
            <AlertTriangle size={22} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {language === 'uz' ? 'Muammolar & Xatolar Tahlili' : 'Проблемы и Ошибки продаж'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {language === 'uz' ? 'Qaysi menejerlar → Qaysi qo‘ng‘iroqlar/bitimlar → Qaysi mijozlar → AI tahlili' : 'Менеджеры → Звонки/Сделки → Клиенты → AI анализ'}
            </p>
          </div>
        </div>

        {/* Stats and Refresh */}
        <div className="relative flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/25">
            <AlertOctagon size={14} className="text-red-400" />
            <span className="text-xs font-bold text-red-400">
              {summary.critical} {language === 'uz' ? 'kritik' : 'критичных'}
            </span>
          </div>

          <button
            onClick={fetchProblems}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 transition-all active:scale-95 disabled:opacity-50"
            title="Yangilash"
          >
            <RefreshCw size={15} className={cn(loading && 'animate-spin text-primary')} />
          </button>
        </div>
      </div>

      {/* ─── Manager Quick-Filter Chips ───────────────────────────────────── */}
      {managerStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {managerStats.slice(0, 7).map((m) => (
            <button
              key={m.id}
              onClick={() => setFilterManagerId(filterManagerId === m.id ? '' : m.id)}
              className={cn(
                'glass-card rounded-2xl p-3 border text-left transition-all hover:scale-[1.02] flex flex-col justify-between',
                filterManagerId === m.id
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border/60'
              )}
            >
              <div className="flex items-center justify-between">
                <User size={14} className="text-muted-foreground" />
                {m.critical > 0 && (
                  <span className="text-[10px] font-black text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded-full">
                    {m.critical}!
                  </span>
                )}
              </div>
              <div className="mt-2">
                <p className="text-xs font-bold text-foreground truncate">{m.name.split(' ')[0]}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{m.count} ta muammo</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ─── Filter Dropdowns & Search ────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'uz' ? 'Qidirish...' : 'Поиск по проблеме...'}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>

        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-card border border-border/60 text-xs text-foreground font-semibold focus:outline-none focus:border-primary cursor-pointer"
        >
          <option value="">Barcha darajalar</option>
          <option value="critical">🔴 Kritik</option>
          <option value="warning">🟡 Ogohlantirish</option>
          <option value="minor">🔵 Kichik</option>
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-card border border-border/60 text-xs text-foreground font-semibold focus:outline-none focus:border-primary cursor-pointer"
        >
          <option value="">Barcha turlar</option>
          <option value="lost_deal">🤝 Boy berilgan bitimlar</option>
          <option value="missed_call">📞 O‘tkazib yuborilgan qo‘ng‘iroqlar</option>
          <option value="overdue_task">📅 Muddati o‘tgan vazifalar</option>
          <option value="audit_mistake">🧠 AI Audit xatoliklari</option>
        </select>

        {(filterManagerId || filterSeverity || filterType || search) && (
          <button
            onClick={() => {
              setFilterManagerId('')
              setFilterSeverity('')
              setFilterType('')
              setSearch('')
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all"
          >
            <X size={13} /> Filtrlarni tozalash
          </button>
        )}

        <p className="ml-auto text-xs text-muted-foreground">
          Topildi: <span className="text-foreground font-bold">{problems.length}</span>
        </p>
      </div>

      {/* ─── Problem List ─────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl skeleton" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 text-center border-red-500/30">
          <p className="text-red-400 font-bold">{error}</p>
          <button onClick={fetchProblems} className="mt-3 px-4 py-2 bg-red-500/20 text-red-400 text-xs font-bold rounded-xl">
            Qayta urinish
          </button>
        </div>
      ) : problems.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <CheckCircle2 size={40} className="mx-auto text-green-400/40 mb-3" />
          <p className="font-bold text-foreground">Muammolar topilmadi</p>
          <p className="text-xs mt-1">Tanlangan filtrlar bo‘yicha hech qanday xatolik qayd etilmagan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {problems.map((p, idx) => {
            const sev = SEVERITY_CONFIG[p.severity] || SEVERITY_CONFIG.warning
            const typ = TYPE_CONFIG[p.type] || TYPE_CONFIG.lost_deal
            const isOpen = expandedId === p.id

            return (
              <div
                key={p.id}
                className={cn(
                  'rounded-2xl border transition-all duration-200 overflow-hidden',
                  sev.bg
                )}
                style={{ animationDelay: `${idx * 25}ms` }}
              >
                {/* Header Row */}
                <button
                  onClick={() => setExpandedId(isOpen ? null : p.id)}
                  className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 text-left hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3 flex-wrap min-w-0">
                    <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-xl border uppercase tracking-wider', sev.badge)}>
                      {sev.label}
                    </span>

                    <span className="flex items-center gap-1 text-xs font-bold text-foreground">
                      <typ.icon size={14} className={typ.color} />
                      {language === 'uz' ? typ.label : typ.labelRu}
                    </span>

                    <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                      <Users2 size={13} className="text-purple-400" />
                      {p.manager}
                    </span>

                    <span className="text-xs text-foreground font-medium flex items-center gap-1">
                      <User size={13} />
                      {p.clientName}
                    </span>

                    <span className="text-xs text-muted-foreground font-mono">
                      {p.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 ml-auto flex-shrink-0">
                    <ChevronDown
                      size={18}
                      className={cn('text-muted-foreground transition-transform duration-200', isOpen && 'rotate-180 text-primary')}
                    />
                  </div>
                </button>

                {/* Expanded Details */}
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/[0.05] pt-3 animate-fade-in text-xs">
                    {/* AI Comment */}
                    <div className="p-3.5 rounded-xl bg-black/30 border border-white/[0.06] flex gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary h-fit">
                        <Brain size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">
                          {language === 'uz' ? 'AI Tahlil & Xulosa' : 'AI Анализ и рекомендация'}
                        </p>
                        <p className="text-muted-foreground leading-relaxed text-xs">{p.aiComment}</p>
                      </div>
                    </div>

                    {/* Identified Errors */}
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                        {language === 'uz' ? 'Aniqlangan kamchiliklar' : 'Выявленные ошибки'} ({p.errors.length}):
                      </p>
                      <div className="space-y-1">
                        {p.errors.map((err, i) => (
                          <div key={i} className="flex items-center gap-2 text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                            <span>{err}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Link */}
                    {p.callId && (
                      <div className="pt-2">
                        <Link
                          href={`/audits`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs border border-primary/20 transition-all"
                        >
                          <Phone size={13} />
                          {language === 'uz' ? 'Qo‘ng‘iroqni audit qilish' : 'Открыть звонок в аудите'}
                          <ExternalLink size={11} />
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
