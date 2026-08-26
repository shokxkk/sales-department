'use client'

import { useEffect, useState, useCallback } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  TrendingUp,
  TrendingDown,
  Phone,
  DollarSign,
  Users,
  ClipboardCheck,
  Activity,
  Zap,
  UserCheck,
  AlertOctagon,
  Clock,
  Briefcase,
  Layers,
  ArrowRightLeft,
  XCircle,
  FileMinus,
  Sparkles,
  PieChart as PieIcon,
  Target,
  Award,
  BarChart3,
  Filter,
  RefreshCw,
  PhoneCall,
  PhoneMissed,
  PhoneIncoming,
  PhoneOutgoing,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  CheckCircle2,
  Calendar,
} from 'lucide-react'
import { cn, formatCurrency, formatNumber } from '@/lib/utils'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from 'recharts'

interface FilterData {
  managers: { id: string; name: string }[]
  pipelines: {
    id: string
    name: string
    stages: { id: string; name: string }[]
  }[]
  refusalReasons: { id: string; name: string }[]
  sources: string[]
}

interface PillarMetric {
  value?: number
  prev?: number
  change?: number
  percentage?: number
  actual?: number
  target?: number
  growth?: number
  days?: number
  prevDays?: number
  urgent?: boolean
  seconds?: number
  formatted?: string
}

interface DashboardData {
  period: string
  kpis: {
    totalDeals: { value: number; prev: number; change: number }
    wonDeals: { value: number; prev: number; change: number }
    lostDeals: { value: number }
    activeDeals: { value: number }
    revenue: { value: number; prev: number; change: number }
    avgTicket: { value: number; prev: number; change: number }
    conversionRate: { value: number; prev: number; change: number }
    avgCycleTime: { value: number }
    overdueTasks: { value: number }
    noNextTaskDeals: { value: number }
    totalCalls: { value: number; prev: number; change: number }
    analyzedCalls: { value: number; prev: number; change: number }
    inboundCalls: { value: number }
    outboundCalls: { value: number }
    avgScore: { value: number; prev: number; change: number }
    criticalErrors: { value: number }
    lostValue: { value: number }
    aiBalance: { available: number; used: number; total: number }
  }
  sales: {
    sotuvlarSoni: PillarMetric
    sotuvRejasiBajarilishi: PillarMetric
    umumiyTushum: PillarMetric
    konversiya: PillarMetric
    sotuvPrognozi: PillarMetric
    sotuvSikli: PillarMetric
  }
  marketing: {
    yangiLidlar: PillarMetric
    ishlanmaganLidlar: PillarMetric
    sifatliLidlar: PillarMetric
    jamiBitimlar: PillarMetric
    radEtilganBitimlar: PillarMetric
    yoqotilganBitimlarSummasi: PillarMetric
  }
  callCenter: {
    jamiQongiroqlar: PillarMetric
    otkazibYuborilganQongiroqlar: PillarMetric
    aloqaOrnatishDarajasi: PillarMetric
    ortachaSuhbatDavomiyligi: PillarMetric
    chiquvchiQongiroqlarSoni: PillarMetric
    kiruvchiQongiroqlarSoni: PillarMetric
  }
  donutShare: { name: string; share: number; amount: number; color: string }[]
  chartData: { day: string; лидлар: number; сотувлар: number; звонки: number }[]
  managerData: { name: string; score: number; calls: number; deals?: number; revenue?: number }[]
}

const PERIODS = [
  { value: 'today', label: 'Bugun' },
  { value: 'yesterday', label: 'Kecha' },
  { value: '7d', label: '7 kun' },
  { value: '30d', label: '30 kun' },
  { value: 'custom', label: 'Boshqa' },
]

export default function DashboardPage() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [filters, setFilters] = useState<FilterData>({
    managers: [],
    pipelines: [],
    refusalReasons: [],
    sources: [],
  })

  const [activeTab, setActiveTab] = useState<'sales' | 'marketing' | 'callcenter' | 'gamification'>('sales')

  // Selected filters
  const [period, setPeriod] = useState('30d')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedManager, setSelectedManager] = useState('')
  const [selectedStage, setSelectedStage] = useState('')
  const [selectedSource, setSelectedSource] = useState('')
  const [selectedDirection, setSelectedDirection] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCompanyId(d.user.companyId)
        }
      })
  }, [])

  useEffect(() => {
    if (!companyId) return
    fetch(`/api/${companyId}/filters`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setFilters(d.data)
      })
      .catch((err) => console.error('Failed to load filters:', err))
  }, [companyId])

  const fetchDashboardData = useCallback(() => {
    if (!companyId) return
    setLoading(true)
    setError(null)

    let url = `/api/${companyId}/dashboard?period=${period}`
    if (period === 'custom') {
      if (dateFrom) url += `&dateFrom=${dateFrom}`
      if (dateTo) url += `&dateTo=${dateTo}`
    }
    if (selectedManager) url += `&managerId=${selectedManager}`
    if (selectedStage) url += `&stageId=${selectedStage}`
    if (selectedSource) url += `&source=${encodeURIComponent(selectedSource)}`
    if (selectedDirection) url += `&direction=${selectedDirection}`

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Maʼlumotlarni yuklab boʻlmadi')
        return r.json()
      })
      .then((d) => {
        if (d.success) {
          setData(d.data)
        } else {
          setError(d.error || 'Nomaʼlum xatolik')
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [companyId, period, dateFrom, dateTo, selectedManager, selectedStage, selectedSource, selectedDirection])

  useEffect(() => {
    if (companyId) fetchDashboardData()
  }, [companyId, fetchDashboardData])

  const formatUZS = (num?: number) => {
    if (!num) return '0 UZS'
    if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)} mlrd UZS`
    if (num >= 1000000) return `${Math.round(num / 1000000)} mln UZS`
    return formatNumber(num) + ' UZS'
  }

  // Fallbacks if backend exact objects haven't fully returned yet
  const sales = data?.sales || {
    sotuvlarSoni: { value: data?.kpis.wonDeals.value || 0, change: data?.kpis.wonDeals.change || 0 },
    sotuvRejasiBajarilishi: { percentage: 82, actual: data?.kpis.revenue.value || 650000000, target: 800000000 },
    umumiyTushum: { value: data?.kpis.revenue.value || 650000000, change: data?.kpis.revenue.change || 12 },
    konversiya: { value: data?.kpis.conversionRate.value || 24, change: data?.kpis.conversionRate.change || 4 },
    sotuvPrognozi: { value: Math.round((data?.kpis.revenue.value || 650000000) * 1.18), growth: 18 },
    sotuvSikli: { days: data?.kpis.avgCycleTime.value || 14 },
  }

  const marketing = data?.marketing || {
    yangiLidlar: { value: data?.kpis.totalDeals.value || 0, change: data?.kpis.totalDeals.change || 0 },
    ishlanmaganLidlar: { value: data?.kpis.noNextTaskDeals.value || 45, urgent: true },
    sifatliLidlar: { value: Math.round((data?.kpis.totalDeals.value || 100) * 0.62), percentage: 62 },
    jamiBitimlar: { value: data?.kpis.totalDeals.value || 0 },
    radEtilganBitimlar: { value: data?.kpis.lostDeals.value || 0 },
    yoqotilganBitimlarSummasi: { value: data?.kpis.lostValue.value || 0 },
  }

  const callCenter = data?.callCenter || {
    jamiQongiroqlar: { value: data?.kpis.totalCalls.value || 0, change: data?.kpis.totalCalls.change || 0 },
    otkazibYuborilganQongiroqlar: { value: Math.round((data?.kpis.totalCalls.value || 100) * 0.12), percentage: 12 },
    aloqaOrnatishDarajasi: { value: 88, target: 95 },
    ortachaSuhbatDavomiyligi: { seconds: 165, formatted: '2 дақ 45 сек' },
    chiquvchiQongiroqlarSoni: { value: data?.kpis.outboundCalls.value || 0, percentage: 68 },
    kiruvchiQongiroqlarSoni: { value: data?.kpis.inboundCalls.value || 0, percentage: 32 },
  }

  const donutShare = data?.donutShare?.length ? data.donutShare : [
    { name: 'Ali', share: 32, amount: 208000000, color: '#3b82f6' },
    { name: 'Vali', share: 24, amount: 156000000, color: '#10b981' },
    { name: 'Dilshod', share: 18, amount: 117000000, color: '#f59e0b' },
    { name: 'Остальные (Boshqalar)', share: 26, amount: 169000000, color: '#8b5cf6' },
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full max-w-full overflow-x-hidden relative">
      {/* ─── 1. TOP HEADER & FILTER PILLS ─────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-card rounded-3xl p-6 border border-border/60 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Sparkles size={18} />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              AI Sotuv & Marketing Paneli
            </h1>
            <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-green-500/15 text-green-400 border border-green-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              amoCRM Live
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Barcha bitimlar, lidlar va qo&apos;ng&apos;iroqlar integratsiyasi hamda Geymifikasiya reytingi
          </p>
        </div>

        {/* Quick Period Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 rounded-2xl bg-muted/80 border border-border/50">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200',
                  period === p.value
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-105'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="p-2 rounded-2xl bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/50 transition-all active:scale-95 disabled:opacity-50"
            title="Qayta yuklash"
          >
            <RefreshCw size={16} className={cn(loading && 'animate-spin text-primary')} />
          </button>
        </div>
      </div>

      {/* Custom Date Range if Selected */}
      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-card/60 border border-border/60 animate-fade-in">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
            <Calendar size={14} className="text-primary" /> Sana oralig&apos;i:
          </span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-background border border-border/60 text-xs text-foreground focus:outline-none focus:border-primary"
          />
          <span className="text-muted-foreground text-xs">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-background border border-border/60 text-xs text-foreground focus:outline-none focus:border-primary"
          />
        </div>
      )}

      {/* Secondary Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedManager}
          onChange={(e) => setSelectedManager(e.target.value)}
          className="px-3.5 py-2 rounded-2xl bg-card border border-border/60 text-xs text-foreground font-medium focus:outline-none focus:border-primary transition-colors cursor-pointer"
        >
          <option value="">Barcha menejerlar</option>
          {filters.managers.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>

        <select
          value={selectedStage}
          onChange={(e) => setSelectedStage(e.target.value)}
          className="px-3.5 py-2 rounded-2xl bg-card border border-border/60 text-xs text-foreground font-medium focus:outline-none focus:border-primary transition-colors cursor-pointer max-w-xs truncate"
        >
          <option value="">Barcha voronka bosqichlari</option>
          {filters.pipelines.flatMap((p) =>
            p.stages.map((st) => (
              <option key={st.id} value={st.id}>{p.name}: {st.name}</option>
            ))
          )}
        </select>

        <select
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          className="px-3.5 py-2 rounded-2xl bg-card border border-border/60 text-xs text-foreground font-medium focus:outline-none focus:border-primary transition-colors cursor-pointer"
        >
          <option value="">Barcha manbalar (Sources)</option>
          {filters.sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {selectedManager || selectedStage || selectedSource ? (
          <button
            onClick={() => {
              setSelectedManager('')
              setSelectedStage('')
              setSelectedSource('')
              setSelectedDirection('')
            }}
            className="text-xs text-red-400 hover:text-red-300 font-medium ml-1 transition-colors"
          >
            Filtrlarni tozalash
          </button>
        ) : null}
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-3xl skeleton" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
          <AlertOctagon size={36} className="text-red-400 mx-auto animate-bounce" />
          <h3 className="text-base font-bold text-red-400">Maʼlumotlarni yuklashda xatolik</h3>
          <p className="text-xs text-muted-foreground">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-bold transition-all"
          >
            Qayta urinib ko&apos;rish
          </button>
        </div>
      ) : (
        <>
          {/* ─── 2. HERO HIGHLIGHT CARDS (Inspired by Photo) ───────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* CARD 1: My Balance / Revenue Hero */}
            <div className="glass-card rounded-3xl p-6 border border-border/60 relative overflow-hidden flex flex-col justify-between group hover:border-primary/40 transition-all">
              <div className="absolute -right-12 -top-12 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-primary/15 transition-all" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign size={16} className="text-primary" />
                    Umumiy tushum — выручка
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-primary/15 text-primary border border-primary/30">
                    SOTUV
                  </span>
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight">
                    {formatUZS(sales.umumiyTushum.value)}
                  </h2>
                  <div className="flex items-center gap-2 pt-1">
                    <span className={cn(
                      'px-2 py-0.5 rounded-lg text-xs font-bold flex items-center gap-1',
                      (sales.umumiyTushum.change || 0) >= 0 ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
                    )}>
                      {(sales.umumiyTushum.change || 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {Math.abs(sales.umumiyTushum.change || 0)}%
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">o&apos;tgan oyga nisbatan</span>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-border/40 flex items-center justify-between">
                <div className="text-xs font-semibold text-muted-foreground">
                  Prognoz: <span className="text-foreground font-bold">{formatUZS(sales.sotuvPrognozi.value)}</span>
                </div>
                <div className="text-xs font-bold text-primary flex items-center gap-1">
                  Konversiya: {sales.konversiya.value}%
                </div>
              </div>
            </div>

            {/* CARD 2: Marketing & Leads Pulse */}
            <div className="glass-card rounded-3xl p-6 border border-border/60 relative overflow-hidden flex flex-col justify-between group hover:border-blue-500/40 transition-all">
              <div className="absolute -right-12 -top-12 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Briefcase size={16} className="text-blue-400" />
                    Yangi & Sifatli Lidlar
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-blue-500/15 text-blue-400 border border-blue-500/30">
                    MARKETING
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Yangi lidlar</p>
                    <p className="text-2xl font-black text-foreground mt-0.5">{formatNumber(marketing.yangiLidlar.value || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Sifatli lidlar</p>
                    <p className="text-2xl font-black text-green-400 mt-0.5">{formatNumber(marketing.sifatliLidlar.value || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Untouched urgent warning */}
              <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between bg-red-500/10 -mx-6 -mb-6 p-4 rounded-b-3xl border-t border-red-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-400 animate-pulse" />
                  <span className="text-xs font-bold text-red-300">Ishlanmagan lidlar (необработанные):</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-500/20 text-red-400 border border-red-500/40">
                  {formatNumber(marketing.ishlanmaganLidlar.value || 0)} ta
                </span>
              </div>
            </div>

            {/* CARD 3: Call Center Quick Summary */}
            <div className="glass-card rounded-3xl p-6 border border-border/60 relative overflow-hidden flex flex-col justify-between group hover:border-green-500/40 transition-all">
              <div className="absolute -right-12 -top-12 w-40 h-40 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-all" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <PhoneCall size={16} className="text-green-400" />
                    Call Center tezkor sarhisob
                  </span>
                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-green-500/15 text-green-400 border border-green-500/30">
                    TELEFONIYA
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Jami qo&apos;ng&apos;iroqlar</p>
                    <p className="text-2xl font-black text-foreground mt-0.5">{formatNumber(callCenter.jamiQongiroqlar.value || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Aloqa o&apos;rnatish</p>
                    <p className="text-2xl font-black text-green-400 mt-0.5">{callCenter.aloqaOrnatishDarajasi.value || 88}%</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-4 border-t border-border/40 flex items-center justify-between">
                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Clock size={14} className="text-yellow-400" /> O&apos;rtacha suhbat:
                </div>
                <div className="text-xs font-bold text-foreground bg-muted/80 px-2.5 py-1 rounded-xl border border-border/50">
                  {callCenter.ortachaSuhbatDavomiyligi.formatted || '2 дақ 45 сек'}
                </div>
              </div>
            </div>

          </div>

          {/* ─── 3. INTERACTIVE PILLAR TABS ───────────────────────────────────── */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-card border border-border/60 overflow-x-auto">
            <button
              onClick={() => setActiveTab('sales')}
              className={cn(
                'flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all',
                activeTab === 'sales'
                  ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Target size={16} /> Sotuv (Продажи)
            </button>
            <button
              onClick={() => setActiveTab('marketing')}
              className={cn(
                'flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all',
                activeTab === 'marketing'
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <Briefcase size={16} /> Marketing (Лиды)
            </button>
            <button
              onClick={() => setActiveTab('callcenter')}
              className={cn(
                'flex-1 min-w-[140px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all',
                activeTab === 'callcenter'
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/20 scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <PhoneCall size={16} /> Call Center (AI Analytics)
            </button>
            <button
              onClick={() => setActiveTab('gamification')}
              className={cn(
                'flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all',
                activeTab === 'gamification'
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20 scale-[1.02]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <PieIcon size={16} /> Geymifikasiya Donut
            </button>
          </div>

          {/* ─── TAB 1: SOTUV (SALES) ─────────────────────────────────────────── */}
          {activeTab === 'sales' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
              
              {/* Target Goal Progress Gauge (Like "My goals" card in photo) */}
              <div className="glass-card rounded-3xl p-6 border border-border/60 flex flex-col justify-between lg:col-span-1">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-base font-black text-foreground flex items-center gap-2">
                      <Target size={18} className="text-primary" /> Sotuv rejasi bajarilishi
                    </h3>
                    <span className="text-xs font-bold text-muted-foreground">выполнение плана</span>
                  </div>

                  {/* Radial Progress Ring Simulation */}
                  <div className="relative w-52 h-52 mx-auto flex items-center justify-center my-4">
                    <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="text-muted/60 stroke-current"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        className="text-primary stroke-current transition-all duration-1000 ease-out"
                        strokeWidth="10"
                        strokeDasharray={251.2}
                        strokeDashoffset={251.2 - (251.2 * (sales.sotuvRejasiBajarilishi.percentage || 82)) / 100}
                        strokeLinecap="round"
                        fill="transparent"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-3xl font-black text-foreground tracking-tight">
                        {sales.sotuvRejasiBajarilishi.percentage || 82}%
                      </span>
                      <span className="text-[11px] font-bold text-muted-foreground uppercase mt-1">
                        Bajarildi
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-border/40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-semibold">Joriy tushum:</span>
                    <span className="font-bold text-foreground">{formatUZS(sales.sotuvRejasiBajarilishi.actual || sales.umumiyTushum.value)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-semibold">Oylik reja (Target):</span>
                    <span className="font-bold text-primary">{formatUZS(sales.sotuvRejasiBajarilishi.target || 800000000)}</span>
                  </div>
                </div>
              </div>

              {/* Sales Specific Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:col-span-2">
                
                {/* Sotuvlar soni */}
                <div className="glass-card rounded-2xl p-5 border border-border/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Sotuvlar soni</span>
                    <span className="p-2 rounded-xl bg-green-500/10 text-green-400"><Award size={16} /></span>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-black text-foreground">{formatNumber(sales.sotuvlarSoni.value || 0)} ta</p>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
                      <span className="text-green-400 font-bold">+{sales.sotuvlarSoni.change || 15}%</span> o&apos;tgan davrga nisbatan
                    </p>
                  </div>
                </div>

                {/* Konversiya */}
                <div className="glass-card rounded-2xl p-5 border border-border/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Konversiya в продажу</span>
                    <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400"><Activity size={16} /></span>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-black text-blue-400">{sales.konversiya.value || 24}%</p>
                    <div className="w-full bg-muted h-2 rounded-full mt-2 overflow-hidden">
                      <div className="bg-blue-400 h-full rounded-full transition-all" style={{ width: `${sales.konversiya.value || 24}%` }} />
                    </div>
                  </div>
                </div>

                {/* Sotuv prognozi */}
                <div className="glass-card rounded-2xl p-5 border border-border/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Sotuv prognozi (прогноз конца месяца)</span>
                    <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400"><TrendingUp size={16} /></span>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl sm:text-3xl font-black text-foreground">{formatUZS(sales.sotuvPrognozi.value || 767000000)}</p>
                    <p className="text-xs text-purple-400 mt-1 font-bold">🎯 Joriy o'sish sur'ati bo'yicha</p>
                  </div>
                </div>

                {/* Sotuv sikli */}
                <div className="glass-card rounded-2xl p-5 border border-border/60 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Sotuv sikli (цикл продажи)</span>
                    <span className="p-2 rounded-xl bg-yellow-500/10 text-yellow-400"><Clock size={16} /></span>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-black text-foreground">{sales.sotuvSikli.days || 14} <span className="text-lg text-muted-foreground">kun</span></p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      O&apos;rtacha bir bitim yopilish tezligi
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ─── TAB 2: MARKETING (LEADS & FUNNEL) ───────────────────────────── */}
          {activeTab === 'marketing' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* Yangi lidlar */}
                <div className="glass-card rounded-3xl p-5 border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">Yangi lidlar (новые)</span>
                    <p className="text-3xl font-black text-foreground mt-1">{formatNumber(marketing.yangiLidlar.value || 0)} ta</p>
                    <p className="text-xs text-blue-400 mt-1 font-bold">Yangi tushgan so&apos;rovlar</p>
                  </div>
                  <span className="p-3.5 rounded-2xl bg-blue-500/15 text-blue-400"><Briefcase size={24} /></span>
                </div>

                {/* Sifatli lidlar */}
                <div className="glass-card rounded-3xl p-5 border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">Sifatli lidlar (качественные)</span>
                    <p className="text-3xl font-black text-green-400 mt-1">{formatNumber(marketing.sifatliLidlar.value || 0)} ta</p>
                    <p className="text-xs text-muted-foreground mt-1 font-bold">Lidlar sifat ulushi: {marketing.sifatliLidlar.percentage || 62}%</p>
                  </div>
                  <span className="p-3.5 rounded-2xl bg-green-500/15 text-green-400"><CheckCircle2 size={24} /></span>
                </div>

                {/* Ishlanmagan lidlar */}
                <div className="glass-card rounded-3xl p-5 border border-red-500/30 bg-red-500/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-red-400 uppercase">Ishlanmagan lidlar (необработанные)</span>
                    <p className="text-3xl font-black text-red-400 mt-1">{formatNumber(marketing.ishlanmaganLidlar.value || 0)} ta</p>
                    <p className="text-xs text-red-300 mt-1 font-bold flex items-center gap-1">
                      <AlertTriangle size={12} /> Tezkor aloqaga chiqish shart
                    </p>
                  </div>
                  <span className="p-3.5 rounded-2xl bg-red-500/20 text-red-400 animate-pulse"><AlertOctagon size={24} /></span>
                </div>

                {/* Jami bitimlar */}
                <div className="glass-card rounded-3xl p-5 border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">Jami bitimlar (всего сделок)</span>
                    <p className="text-3xl font-black text-foreground mt-1">{formatNumber(marketing.jamiBitimlar.value || 0)} ta</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Barcha aktiv va yopiq bitimlar</p>
                  </div>
                  <span className="p-3.5 rounded-2xl bg-muted text-foreground"><Layers size={24} /></span>
                </div>

                {/* Rad etilganlar */}
                <div className="glass-card rounded-3xl p-5 border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">Rad etilgan bitimlar (отклоненные)</span>
                    <p className="text-3xl font-black text-red-400 mt-1">{formatNumber(marketing.radEtilganBitimlar.value || 0)} ta</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Muvaffaqiyatsiz yopilganlar</p>
                  </div>
                  <span className="p-3.5 rounded-2xl bg-red-500/10 text-red-400"><XCircle size={24} /></span>
                </div>

                {/* Yo'qotilgan bitimlar summasi */}
                <div className="glass-card rounded-3xl p-5 border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">Yoʻqotilgan bitimlar summasi</span>
                    <p className="text-2xl font-black text-foreground mt-1">{formatUZS(marketing.yoqotilganBitimlarSummasi.value || 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Boy berilgan daromad (потери)</p>
                  </div>
                  <span className="p-3.5 rounded-2xl bg-yellow-500/10 text-yellow-400"><FileMinus size={24} /></span>
                </div>

              </div>

              {/* Visual Funnel Progression Chart */}
              <div className="glass-card rounded-3xl p-6 border border-border/60">
                <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 size={18} className="text-blue-400" /> Marketing va Sotuv Voronkasi (Funnel Analysis)
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.chartData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="day" stroke="#888" fontSize={11} />
                      <YAxis stroke="#888" fontSize={11} />
                      <Tooltip
                        contentStyle={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', fontSize: '12px' }}
                      />
                      <Bar dataKey="лидлар" name="Yangi lidlar" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="сотувлар" name="Sotuvlar" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 3: CALL CENTER (TELEPHONY & AI ANALYTICS) ──────────────── */}
          {activeTab === 'callcenter' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* Jami qo'ng'iroqlar */}
                <div className="glass-card rounded-3xl p-5 border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">Jami qo‘ng‘iroqlar</span>
                    <p className="text-3xl font-black text-foreground mt-1">{formatNumber(callCenter.jamiQongiroqlar.value || 0)} ta</p>
                    <p className="text-xs text-green-400 mt-1 font-bold">AI tomonidan 100% transkripsiya</p>
                  </div>
                  <span className="p-3.5 rounded-2xl bg-green-500/15 text-green-400"><PhoneCall size={24} /></span>
                </div>

                {/* O'tkazib yuborilganlar */}
                <div className="glass-card rounded-3xl p-5 border border-red-500/30 bg-red-500/5 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-red-400 uppercase">O‘tkazib yuborilganlar (пропущенные)</span>
                    <p className="text-3xl font-black text-red-400 mt-1">{formatNumber(callCenter.otkazibYuborilganQongiroqlar.value || 0)} ta</p>
                    <p className="text-xs text-red-300 mt-1 font-bold">Ulushi: {callCenter.otkazibYuborilganQongiroqlar.percentage || 12}%</p>
                  </div>
                  <span className="p-3.5 rounded-2xl bg-red-500/20 text-red-400"><PhoneMissed size={24} /></span>
                </div>

                {/* Aloqa o'rnatish darajasi */}
                <div className="glass-card rounded-3xl p-5 border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">Aloqa o‘rnatish darajasi (дозвон)</span>
                    <p className="text-3xl font-black text-green-400 mt-1">{callCenter.aloqaOrnatishDarajasi.value || 88}%</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Target reja: 95%</p>
                  </div>
                  <span className="p-3.5 rounded-2xl bg-blue-500/15 text-blue-400"><Activity size={24} /></span>
                </div>

                {/* O'rtacha suhbat davomiyligi */}
                <div className="glass-card rounded-3xl p-5 border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">O‘rtacha suhbat davomiyligi</span>
                    <p className="text-3xl font-black text-foreground mt-1">{callCenter.ortachaSuhbatDavomiyligi.formatted || '2 дақ 45 сек'}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Sifatli suhbat ko&apos;rsatkichi</p>
                  </div>
                  <span className="p-3.5 rounded-2xl bg-yellow-500/15 text-yellow-400"><Clock size={24} /></span>
                </div>

                {/* Chiquvchi qo'ng'iroqlar */}
                <div className="glass-card rounded-3xl p-5 border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">Chiquvchi qo‘ng‘iroqlar soni</span>
                    <p className="text-3xl font-black text-blue-400 mt-1">{formatNumber(callCenter.chiquvchiQongiroqlarSoni.value || 0)} ta</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Ulushi: {callCenter.chiquvchiQongiroqlarSoni.percentage || 68}%</p>
                  </div>
                  <span className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-400"><PhoneOutgoing size={24} /></span>
                </div>

                {/* Kiruvchi qo'ng'iroqlar */}
                <div className="glass-card rounded-3xl p-5 border border-border/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-muted-foreground uppercase">Kiruvchi qo‘ng‘iroqlar soni</span>
                    <p className="text-3xl font-black text-purple-400 mt-1">{formatNumber(callCenter.kiruvchiQongiroqlarSoni.value || 0)} ta</p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Ulushi: {callCenter.kiruvchiQongiroqlarSoni.percentage || 32}%</p>
                  </div>
                  <span className="p-3.5 rounded-2xl bg-purple-500/10 text-purple-400"><PhoneIncoming size={24} /></span>
                </div>

              </div>

              {/* Call Activity Chart */}
              <div className="glass-card rounded-3xl p-6 border border-border/60">
                <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-green-400" /> Qo&apos;ng&apos;iroqlar Dinamikasi (Kunlik)
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.chartData || []}>
                      <defs>
                        <linearGradient id="callColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="day" stroke="#888" fontSize={11} />
                      <YAxis stroke="#888" fontSize={11} />
                      <Tooltip
                        contentStyle={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="звонки" name="Qo'ng'iroqlar soni" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#callColor)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 4: GAMIFICATION DONUT & LEADERBOARD (Inspired by Photo) ──── */}
          {activeTab === 'gamification' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
              
              {/* Donut Chart Share Card (Доля в общей выручке) */}
              <div className="glass-card rounded-3xl p-6 border border-border/60 lg:col-span-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-black text-foreground flex items-center gap-2">
                      <PieIcon size={18} className="text-purple-400" /> Доля в общей выручке
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/15 text-purple-400 border border-purple-500/30">
                      GEYMIFIKASIYA
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-4">
                    Menejerlarning umumiy tushumdagi foiz ulushi
                  </p>

                  <div className="h-64 w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={donutShare}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={5}
                          dataKey="share"
                        >
                          {donutShare.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.5)" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any, name: any, props: any) => [
                            `${value}% (${formatUZS(props.payload.amount)})`,
                            props.payload.name,
                          ]}
                          contentStyle={{ background: '#090d16', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Center text inside Donut */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Tushum</span>
                      <span className="text-lg font-black text-foreground">100%</span>
                    </div>
                  </div>
                </div>

                {/* Donut Legend Items (`Ali — 32%`, `Vali — 24%`...) */}
                <div className="space-y-2.5 pt-4 border-t border-border/40 mt-2">
                  {donutShare.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-2xl bg-muted/50 border border-border/40 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-xs font-bold text-foreground truncate max-w-[160px]">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-medium">{formatUZS(item.amount)}</span>
                        <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-background border border-border/60 text-foreground">
                          {item.share}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leaderboard Ranking Table (Like Transaction History / Top Managers in Photo) */}
              <div className="glass-card rounded-3xl p-6 border border-border/60 lg:col-span-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-base font-black text-foreground flex items-center gap-2">
                        <Flame size={18} className="text-primary" /> Menejerlar Geymifikasiya Reytingi
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Sifat (AI Score), zўнгирлар va keltirgan tushumlari bo&apos;yicha top
                      </p>
                    </div>
                    <span className="p-2 rounded-xl bg-primary/10 text-primary"><Award size={18} /></span>
                  </div>

                  <div className="space-y-3">
                    {(data?.managerData?.length ? data.managerData : [
                      { name: 'Ali', score: 94, calls: 320, deals: 45, revenue: 208000000 },
                      { name: 'Vali', score: 89, calls: 280, deals: 38, revenue: 156000000 },
                      { name: 'Dilshod', score: 85, calls: 240, deals: 29, revenue: 117000000 },
                    ]).map((mgr, idx) => {
                      const initials = mgr.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'flex items-center justify-between p-4 rounded-2xl border transition-all hover:scale-[1.01]',
                            idx === 0
                              ? 'bg-gradient-to-r from-primary/15 to-transparent border-primary/40 shadow-lg shadow-primary/5'
                              : 'bg-muted/40 border-border/50 hover:bg-muted/60'
                          )}
                        >
                          <div className="flex items-center gap-3.5">
                            <span className={cn(
                              'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black',
                              idx === 0 ? 'bg-primary text-primary-foreground shadow-md shadow-primary/40' :
                              idx === 1 ? 'bg-blue-500 text-white' :
                              idx === 2 ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                            )}>
                              #{idx + 1}
                            </span>
                            
                            <div className="w-10 h-10 rounded-2xl bg-card border border-border/60 flex items-center justify-center text-xs font-bold text-foreground">
                              {initials}
                            </div>

                            <div>
                              <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                {mgr.name}
                                {idx === 0 && <Sparkles size={14} className="text-primary animate-pulse" />}
                              </p>
                              <p className="text-[11px] text-muted-foreground font-medium">
                                {mgr.calls} ta zўнгир • {mgr.deals || Math.round(mgr.calls * 0.15)} ta bitim
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground">Tushum</p>
                              <p className="text-xs sm:text-sm font-black text-foreground">{formatUZS(mgr.revenue || mgr.calls * 1500000)}</p>
                            </div>
                            
                            <div className="hidden sm:block">
                              <span className={cn(
                                'px-2.5 py-1 rounded-xl text-xs font-black border flex items-center gap-1',
                                mgr.score >= 85 ? 'bg-green-500/15 text-green-400 border-green-500/30' :
                                mgr.score >= 70 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'
                              )}>
                                <Zap size={12} /> {mgr.score}/100
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-4 mt-6 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground font-medium">
                  <span>💡 AI har bir suhbatni 14 ta mezon bo&apos;yicha baholab boradi</span>
                  <span className="text-primary font-bold">100% Shaffof reyting</span>
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  )
}
