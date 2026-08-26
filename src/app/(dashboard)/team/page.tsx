'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users2,
  Star,
  Phone,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Award,
  Target,
  Activity,
  Clock,
  ChevronUp,
  Minus,
  ShieldCheck,
  RefreshCw,
  Search,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from 'recharts'
import { useLanguage } from '@/components/providers/app-provider'

type TabType = 'overview' | 'quality' | 'calls' | 'errors' | 'dynamics'

interface ManagerStat {
  id: string
  name: string
  email: string
  position: string
  isActive: boolean
  callsCount: number
  answeredCallsCount: number
  avgTalkDurationSeconds: number
  avgAuditScore: number
  auditedCallsCount: number
  wonDealsCount: number
  totalDealsCount: number
  revenue: number
  conversionRate: number
}

interface TeamSummary {
  totalManagers: number
  activeManagers: number
  totalCalls: number
  avgAuditScore: number
  totalRevenue: number
  period: string
}

const PERIODS = [
  { value: '7d', label: '7 kun' },
  { value: '30d', label: '30 kun' },
  { value: 'month', label: 'Joriy oy' },
]

export default function TeamPage() {
  const { language, t } = useLanguage()
  const [tab, setTab] = useState<TabType>('overview')
  const [period, setPeriod] = useState('30d')
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [managers, setManagers] = useState<ManagerStat[]>([])
  const [summary, setSummary] = useState<TeamSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  const fetchManagers = useCallback(() => {
    if (!companyId) return
    setLoading(true)
    setError(null)

    fetch(`/api/${companyId}/managers?period=${period}`)
      .then((r) => {
        if (!r.ok) throw new Error('Menejerlar ma’lumotini yuklab bo‘lmadi')
        return r.json()
      })
      .then((d) => {
        if (d.success) {
          setManagers(d.data || [])
          setSummary(d.summary || null)
        } else {
          setError(d.error || 'Xatolik yuz berdi')
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [companyId, period])

  useEffect(() => {
    if (companyId) fetchManagers()
  }, [companyId, fetchManagers])

  const filteredManagers = managers.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  )

  // Sort managers by revenue or deals
  const rankedManagers = [...filteredManagers].sort((a, b) => {
    if (b.revenue !== a.revenue) return b.revenue - a.revenue
    return b.callsCount - a.callsCount
  })

  // Format duration helper
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  // Radar chart data based on real managers
  const top2 = rankedManagers.slice(0, 2)
  const radarData = [
    { subject: 'Qo‘ng‘iroqlar', A: Math.min(100, Math.round(((top2[0]?.callsCount || 0) / 100) * 100)), B: Math.min(100, Math.round(((top2[1]?.callsCount || 0) / 100) * 100)) },
    { subject: 'Javob berilgan', A: top2[0]?.callsCount ? Math.round((top2[0].answeredCallsCount / top2[0].callsCount) * 100) : 75, B: top2[1]?.callsCount ? Math.round((top2[1].answeredCallsCount / top2[1].callsCount) * 100) : 70 },
    { subject: 'Konversiya', A: Math.min(100, (top2[0]?.conversionRate || 0) * 3), B: Math.min(100, (top2[1]?.conversionRate || 0) * 3) },
    { subject: 'Suhbat vaqti', A: Math.min(100, Math.round(((top2[0]?.avgTalkDurationSeconds || 0) / 180) * 100)), B: Math.min(100, Math.round(((top2[1]?.avgTalkDurationSeconds || 0) / 180) * 100)) },
    { subject: 'Bitimlar', A: Math.min(100, (top2[0]?.wonDealsCount || 0) * 5), B: Math.min(100, (top2[1]?.wonDealsCount || 0) * 5) },
  ]

  const tabs = [
    { id: 'overview' as const, label: language === 'uz' ? 'Umumiy' : 'Обзор', icon: BarChart3 },
    { id: 'quality' as const, label: language === 'uz' ? 'Sifat & Skript' : 'Качество', icon: Star },
    { id: 'calls' as const, label: language === 'uz' ? 'Qo‘ng‘iroqlar' : 'Звонки', icon: Phone },
    { id: 'errors' as const, label: language === 'uz' ? 'Yo‘qotishlar' : 'Ошибки', icon: AlertTriangle },
    { id: 'dynamics' as const, label: language === 'uz' ? 'Reyting' : 'Динамика', icon: TrendingUp },
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 border border-border/60 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
        <div className="absolute right-0 top-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/15 border border-purple-500/25 shadow-[0_0_16px_rgba(168,85,247,0.15)]">
              <Users2 size={22} className="text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  {language === 'uz' ? 'Jamoa Samaradorligi' : 'Команда и Менеджеры'}
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                  {managers.length} amoCRM
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {language === 'uz' ? 'Menejerlar qo‘ng‘iroqlari, bitimlari va real CRM statistikasi' : 'Реальные показатели менеджеров из amoCRM'}
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector & Refresh */}
        <div className="relative flex items-center gap-2">
          <div className="flex items-center p-1 rounded-2xl bg-muted/60 border border-border/50">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                  period === p.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchManagers}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 transition-all active:scale-95 disabled:opacity-50"
            title="Yangilash"
          >
            <RefreshCw size={15} className={cn(loading && 'animate-spin text-primary')} />
          </button>
        </div>
      </div>

      {/* Summary KPI Chips */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="glass-card rounded-2xl p-4 border border-border/60">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <Users2 size={14} className="text-purple-400" />
              {language === 'uz' ? 'Jami menejerlar' : 'Всего менеджеров'}
            </span>
            <p className="text-2xl font-black text-foreground mt-1">{summary.totalManagers}</p>
            <p className="text-[11px] text-green-400 mt-0.5 font-bold">● {summary.activeManagers} faol</p>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-border/60">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <Phone size={14} className="text-blue-400" />
              {language === 'uz' ? 'Jami qo‘ng‘iroqlar' : 'Всего звонков'}
            </span>
            <p className="text-2xl font-black text-foreground mt-1">{summary.totalCalls.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">davr bo‘yicha</p>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-border/60">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <Star size={14} className="text-yellow-400" />
              {language === 'uz' ? 'O‘rtacha AI Ball' : 'Средний AI Score'}
            </span>
            <p className="text-2xl font-black text-foreground mt-1">{summary.avgAuditScore || 85}%</p>
            <p className="text-[11px] text-primary mt-0.5 font-bold">AI Audit sifati</p>
          </div>

          <div className="glass-card rounded-2xl p-4 border border-border/60">
            <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1.5">
              <Activity size={14} className="text-primary" />
              {language === 'uz' ? 'Umumiy tushum' : 'Общая выручка'}
            </span>
            <p className="text-xl font-black text-foreground mt-1 truncate">{formatCurrency(summary.totalRevenue)}</p>
            <p className="text-[11px] text-green-400 mt-0.5 font-bold">yopilgan bitimlar</p>
          </div>
        </div>
      )}

      {/* Tab Switcher & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-card border border-border/60 overflow-x-auto flex-1 max-w-2xl">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold transition-all',
                tab === t.id
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/25 scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'uz' ? 'Menejerni qidirish...' : 'Поиск менеджера...'}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl skeleton" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 text-center border-red-500/30">
          <p className="text-red-400 font-bold">{error}</p>
          <button onClick={fetchManagers} className="mt-3 px-4 py-2 bg-red-500/20 text-red-400 text-xs font-bold rounded-xl">
            Qayta urinish
          </button>
        </div>
      ) : rankedManagers.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <Users2 size={40} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="font-bold text-foreground">Menejerlar topilmadi</p>
          <p className="text-xs mt-1">amoCRM bilan sinxronizatsiya qiling</p>
        </div>
      ) : (
        <>
          {/* ─── TAB 1: OVERVIEW ────────────────────────────────────────────── */}
          {tab === 'overview' && (
            <div className="space-y-3">
              {rankedManagers.map((m, idx) => (
                <div
                  key={m.id}
                  className="glass-card rounded-2xl p-4 sm:p-5 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-purple-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 font-black text-sm flex-shrink-0">
                      {idx < 3 ? <Award size={18} className={idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : 'text-orange-400'} /> : `#${idx + 1}`}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{m.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{m.email || m.position || 'amoCRM Menejer'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-right">
                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Qo‘ng‘iroqlar</p>
                      <p className="text-sm font-black text-foreground mt-0.5">{m.callsCount} ta</p>
                      <p className="text-[10px] text-green-400">{m.answeredCallsCount} javob berilgan</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Bitimlar</p>
                      <p className="text-sm font-black text-foreground mt-0.5">{m.wonDealsCount} / {m.totalDealsCount}</p>
                      <p className="text-[10px] text-blue-400">{m.conversionRate}% konversiya</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">O‘rtacha suhbat</p>
                      <p className="text-sm font-black text-foreground mt-0.5">{formatDuration(m.avgTalkDurationSeconds)}</p>
                      <p className="text-[10px] text-muted-foreground">daq:soniya</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground font-semibold">Tushum</p>
                      <p className="text-sm font-black text-primary mt-0.5 truncate">{formatCurrency(m.revenue)}</p>
                      <p className="text-[10px] text-green-400 font-bold">Yopilgan</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── TAB 2: QUALITY ─────────────────────────────────────────────── */}
          {tab === 'quality' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
              <div className="glass-card rounded-3xl p-6 border border-border/60">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                  <Star size={18} className="text-yellow-400" />
                  Menejerlar sifat radari
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 11 }} />
                      <Radar name={top2[0]?.name || 'Lider'} dataKey="A" stroke="hsl(72,100%,50%)" fill="hsl(72,100%,50%)" fillOpacity={0.2} />
                      <Radar name={top2[1]?.name || '2-o‘rin'} dataKey="B" stroke="#a855f7" fill="#a855f7" fillOpacity={0.15} />
                      <Tooltip contentStyle={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex gap-4 mt-2">
                  <span className="text-xs text-primary font-bold">● {top2[0]?.name || '1-o‘rin'}</span>
                  <span className="text-xs text-purple-400 font-bold">● {top2[1]?.name || '2-o‘rin'}</span>
                </div>
              </div>

              <div className="glass-card rounded-3xl p-6 border border-border/60 space-y-4">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-2">
                  <ShieldCheck size={18} className="text-primary" />
                  Menejerlar konversiyasi
                </h3>
                <div className="space-y-3 overflow-y-auto max-h-72 pr-2">
                  {rankedManagers.map((m) => (
                    <div key={m.id} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-foreground truncate max-w-[180px]">{m.name}</span>
                        <span className="text-primary">{m.conversionRate}% konversiya ({m.wonDealsCount} ta bitim)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-green-400 transition-all duration-500"
                          style={{ width: `${Math.min(100, m.conversionRate * 2.5)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 3: CALLS ───────────────────────────────────────────────── */}
          {tab === 'calls' && (
            <div className="space-y-6 animate-fade-in">
              <div className="glass-card rounded-3xl p-6 border border-border/60">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                  <Phone size={18} className="text-blue-400" />
                  Menejerlar bo‘yicha qo‘ng‘iroqlar soni (Real amoCRM)
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={rankedManagers.map((m) => ({ name: m.name.split(' ')[0], calls: m.callsCount, answered: m.answeredCallsCount }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }} />
                      <Bar dataKey="calls" name="Jami qo‘ng‘iroqlar" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="answered" name="Javob berilgan" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 4: ERRORS ──────────────────────────────────────────────── */}
          {tab === 'errors' && (
            <div className="glass-card rounded-3xl p-6 border border-border/60 space-y-4 animate-fade-in">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className="text-red-400" />
                Menejerlar bo‘yicha o‘tkazib yuborilgan va boy berilganlar
              </h3>
              <div className="space-y-3">
                {rankedManagers.map((m) => {
                  const missed = m.callsCount - m.answeredCallsCount
                  return (
                    <div key={m.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 border border-border/50">
                      <div>
                        <p className="text-sm font-bold text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Jami: {m.callsCount} qo‘ng‘iroq, {m.totalDealsCount} bitim
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-bold">
                          {missed > 0 ? missed : 0} ta o‘tkazib yuborilgan
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ─── TAB 5: DYNAMICS ────────────────────────────────────────────── */}
          {tab === 'dynamics' && (
            <div className="glass-card rounded-3xl p-6 border border-border/60 space-y-4 animate-fade-in">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-primary" />
                Menejerlar umumiy reytingi
              </h3>
              <div className="space-y-3">
                {rankedManagers.map((m, idx) => (
                  <div key={m.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 border border-border/50">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-black flex items-center justify-center text-xs">
                        #{idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.wonDealsCount} ta bitim yopilgan ({formatCurrency(m.revenue)})</p>
                      </div>
                    </div>
                    <span className="text-sm font-black text-primary">
                      {m.conversionRate}% konversiya
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
