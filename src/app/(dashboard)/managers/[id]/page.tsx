'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Phone, Mail, Briefcase, TrendingUp, Star,
  CheckCircle2, XCircle, Clock, BarChart2, ChevronRight,
  Award, AlertTriangle, RefreshCw,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from 'recharts'
import { cn, formatCurrency, formatDuration, formatDateTime } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────
interface ManagerKPI {
  totalCalls: number; answeredCalls: number; missedCalls: number
  avgTalkDurationSeconds: number; avgAuditScore: number; auditedCallsCount: number
  wonDealsCount: number; lostDealsCount: number; openDealsCount: number
  totalDealsCount: number; conversionRate: number; revenue: number
}

interface ManagerInfo {
  id: string; name: string; email: string | null; phone: string | null
  position: string | null; department: string | null; avatarUrl: string | null; isActive: boolean
}

interface RecentCall {
  id: string; startedAt: string; direction: string; status: string
  talkDurationSeconds: number; analysisStatus: string; aiScore: number | null
  callType: string | null; customerName: string | null
}

interface RecentAudit {
  id: string; callId: string; finalScore: number; aiScore: number
  maxPossibleScore: number; summary: string; callType: string | null
  completedAt: string; customerName: string | null; talkDurationSeconds: number
}

interface ManagerDetailData {
  manager: ManagerInfo; kpi: ManagerKPI
  topStrengths: string[]; topMistakes: string[]
  callActivity: { date: string; count: number }[]
  auditTrend: { date: string; score: number; maxScore: number }[]
  recentCalls: RecentCall[]; recentAudits: RecentAudit[]; period: string
}

// ─── Helpers ───────────────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { key: 'today', label: 'Бугун' }, { key: '7d', label: '7 кун' },
  { key: 'month', label: 'Жорий ой' }, { key: '30d', label: '30 кун' },
] as const

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color: string
}) {
  return (
    <div className="glass-card rounded-xl p-4 border border-border flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Icon size={13} className={color} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="text-xl font-extrabold text-foreground">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
}

function ScoreBadge({ score, max = 100 }: { score: number; max?: number }) {
  const pct = max > 0 ? (score / max) * 100 : score
  const cls = pct >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
    : pct >= 60 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
    : score > 0 ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : 'text-muted-foreground bg-muted/20 border-border'
  return <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', cls)}>{score > 0 ? `${score}/${max}` : '—'}</span>
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────
export default function ManagerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [data, setData] = useState<ManagerDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [period, setPeriod] = useState(searchParams.get('period') || '30d')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.success) setCompanyId(d.user.companyId); else { setError('Авторизациядан ўтилмаган'); setLoading(false) } })
      .catch(() => { setError('Тизим билан алоқа йўқ'); setLoading(false) })
  }, [])

  const fetchData = useCallback(() => {
    if (!companyId || !params.id) return
    setLoading(true); setError(null)
    fetch(`/api/${companyId}/managers/${params.id}?period=${period}`)
      .then((r) => { if (!r.ok) throw new Error('Маълумотларни юклаб бўлмади'); return r.json() })
      .then((d) => { if (d.success) setData(d.data); else setError(d.error || 'Хатолик') })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [companyId, params.id, period])

  useEffect(() => { if (companyId && params.id) fetchData() }, [companyId, params.id, fetchData])

  const m = data?.manager
  const kpi = data?.kpi

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/managers')} className="p-2 rounded-xl bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all">
            <ArrowLeft size={15} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{loading ? 'Юкланяпти...' : (m?.name || 'Ходим кўрсаткичлари')}</h1>
            <p className="text-muted-foreground text-xs">{m?.position || 'Менежер кўрсаткичлари'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 border border-border">
            {PERIOD_OPTIONS.map((opt) => (
              <button key={opt.key} onClick={() => setPeriod(opt.key)}
                className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  period === opt.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={fetchData} disabled={loading} className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-all disabled:opacity-50">
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-red-500/20">
          <p className="text-red-400 font-medium">{error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-all">Қайта уриниш</button>
        </div>
      ) : !data ? null : (
        <>
          {/* Profile + KPI top row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Profile Card */}
            <div className="glass-card rounded-2xl p-5 border border-border flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xl font-bold shrink-0">
                  {m!.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">{m!.name}</h3>
                  <p className="text-xs text-muted-foreground">{m!.position || 'Менежер'}</p>
                  {m!.department && <p className="text-xs text-muted-foreground">{m!.department}</p>}
                </div>
              </div>
              <div className="space-y-1.5 pt-1 border-t border-border text-xs">
                {m!.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail size={12} /><span className="text-foreground truncate">{m!.email}</span></div>}
                {m!.phone && <div className="flex items-center gap-2 text-muted-foreground"><Phone size={12} /><span className="text-foreground">{m!.phone}</span></div>}
              </div>
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full self-start border',
                m!.isActive ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-muted-foreground bg-muted/20 border-border')}>
                {m!.isActive ? 'Фаол' : 'Фаол эмас'}
              </span>
            </div>

            {/* KPI Cards */}
            <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KpiCard label="Жами қўнғироқлар" value={kpi!.totalCalls} sub={`${kpi!.answeredCalls} жавоб берилган`} icon={Phone} color="text-violet-400" />
              <KpiCard label="Ўрт. сухбат вақти" value={kpi!.avgTalkDurationSeconds > 0 ? formatDuration(kpi!.avgTalkDurationSeconds) : '—'} sub={`${kpi!.missedCalls} ўтказиб юборилган`} icon={Clock} color="text-blue-400" />
              <KpiCard label="Аудит баҳоси" value={kpi!.avgAuditScore > 0 ? `${kpi!.avgAuditScore}/100` : '—'} sub={kpi!.auditedCallsCount > 0 ? `${kpi!.auditedCallsCount} та таҳлил` : 'Таҳлил йўқ'} icon={Star} color="text-yellow-400" />
              <KpiCard label="Муваффақиятли" value={`${kpi!.wonDealsCount} битим`} sub={`${kpi!.lostDealsCount} рад, ${kpi!.openDealsCount} жараёнда`} icon={CheckCircle2} color="text-emerald-400" />
              <KpiCard label="Конверсия" value={`${kpi!.conversionRate}%`} sub={`${kpi!.totalDealsCount} та жами битим`} icon={TrendingUp} color="text-primary" />
              <KpiCard label="Жами тушум" value={kpi!.revenue > 0 ? formatCurrency(kpi!.revenue) : '—'} sub="Ёпилган битимлар" icon={BarChart2} color="text-emerald-400" />
            </div>
          </div>

          {/* Charts row */}
          {(data.callActivity.length > 0 || data.auditTrend.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Call activity */}
              {data.callActivity.length > 0 && (
                <div className="glass-card rounded-2xl p-5 border border-border">
                  <h3 className="font-semibold text-foreground text-sm mb-4">Қўнғироқлар фаоллиги</h3>
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={data.callActivity}>
                      <defs>
                        <linearGradient id="callGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} width={28} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="count" name="Қўнғироқлар" stroke="#7c3aed" fill="url(#callGrad)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Audit trend */}
              {data.auditTrend.length > 1 && (
                <div className="glass-card rounded-2xl p-5 border border-border">
                  <h3 className="font-semibold text-foreground text-sm mb-4">Аудит баҳоси тренди</h3>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={data.auditTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} domain={[0, 100]} width={28} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="score" name="Балл" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Strengths & Mistakes */}
          {(data.topStrengths.length > 0 || data.topMistakes.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.topStrengths.length > 0 && (
                <div className="glass-card rounded-2xl p-5 border border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <Award size={15} className="text-emerald-400" />
                    <h3 className="font-semibold text-foreground text-sm">Кучли томонлар</h3>
                    <span className="text-xs text-muted-foreground">(аудит асосида)</span>
                  </div>
                  <ul className="space-y-2">
                    {data.topStrengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                        <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 shrink-0" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.topMistakes.length > 0 && (
                <div className="glass-card rounded-2xl p-5 border border-border">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={15} className="text-red-400" />
                    <h3 className="font-semibold text-foreground text-sm">Такрорланувчи хатолар</h3>
                    <span className="text-xs text-muted-foreground">(аудит асосида)</span>
                  </div>
                  <ul className="space-y-2">
                    {data.topMistakes.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                        <XCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Recent Calls */}
          {data.recentCalls.length > 0 && (
            <div className="glass-card rounded-2xl border border-border">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2"><Phone size={14} className="text-primary" />Сўнгги қўнғироқлар</h3>
              </div>
              <div className="divide-y divide-border">
                {data.recentCalls.slice(0, 8).map((c) => (
                  <div key={c.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                        c.status === 'ANSWERED' ? 'bg-emerald-400' : c.status === 'MISSED' ? 'bg-red-400' : 'bg-muted-foreground')}>
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{c.customerName || 'Номаълум мижоз'}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(c.startedAt)} · {c.direction === 'INBOUND' ? 'Кирувчи' : 'Чиқувчи'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">{formatDuration(c.talkDurationSeconds)}</span>
                      {c.analysisStatus === 'COMPLETED' && c.aiScore != null
                        ? <ScoreBadge score={c.aiScore} />
                        : <span className="text-xs text-muted-foreground">{c.analysisStatus === 'COMPLETED' ? '—' : ''}</span>}
                      <Link href={`/calls/${c.id}`} className="text-primary hover:text-primary/80"><ChevronRight size={13} /></Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Audits */}
          {data.recentAudits.length > 0 && (
            <div className="glass-card rounded-2xl border border-border">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2"><Briefcase size={14} className="text-primary" />Сўнгги аудитлар</h3>
              </div>
              <div className="divide-y divide-border">
                {data.recentAudits.map((a) => (
                  <div key={a.id} className="px-4 py-3 flex items-start justify-between gap-4 hover:bg-muted/20 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{a.customerName || 'Номаълум мижоз'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.summary}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(a.completedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <ScoreBadge score={a.finalScore} max={a.maxPossibleScore} />
                      <Link href={`/audits/${a.id}`} className="text-primary hover:text-primary/80"><ChevronRight size={13} /></Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state for no data */}
          {data.recentCalls.length === 0 && data.recentAudits.length === 0 && (
            <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
              <Phone className="mx-auto text-muted-foreground/30 mb-3" size={40} />
              <p className="font-medium text-foreground">Танланган даврда маълумот йўқ</p>
              <p className="text-sm mt-1">Бошқа давр танланг</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
