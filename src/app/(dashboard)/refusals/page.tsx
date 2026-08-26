'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  TrendingDown, RefreshCw, AlertTriangle, Brain,
  BarChart2, DollarSign,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, AreaChart, Area,
} from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────
interface CrmRefusal { id: string; name: string; count: number; lostRevenue: number; share: number }
interface AiRefusal { category: string; count: number; share: number }
interface TrendPoint { date: string; count: number }
interface Summary {
  totalLostDeals: number; totalWonDeals: number; totalDeals: number
  lostRevenue: number; lostWithReason: number; lostNoReason: number; period: string
}

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Бугун' }, { key: '7d', label: '7 кун' },
  { key: 'month', label: 'Жорий ой' }, { key: '30d', label: '30 кун' },
] as const

const COLORS = ['#ef4444', '#f97316', '#eab308', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#84cc16']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>)}
    </div>
  )
}

export default function RefusalsPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [crmRefusals, setCrmRefusals] = useState<CrmRefusal[]>([])
  const [aiRefusals, setAiRefusals] = useState<AiRefusal[]>([])
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [period, setPeriod] = useState('30d')

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.success) setCompanyId(d.user.companyId); else { setError('Авторизациядан ўтилмаган'); setLoading(false) } })
      .catch(() => { setError('Тизим билан алоқа йўқ'); setLoading(false) })
  }, [])

  const fetchData = useCallback(() => {
    if (!companyId) return
    setLoading(true); setError(null)
    fetch(`/api/${companyId}/refusals?period=${period}`)
      .then((r) => { if (!r.ok) throw new Error('Маълумотларни юклаб бўлмади'); return r.json() })
      .then((d) => {
        if (d.success) {
          setSummary(d.data.summary)
          setCrmRefusals(d.data.crmRefusals || [])
          setAiRefusals(d.data.aiRefusals || [])
          setTrend(d.data.trend || [])
        } else setError(d.error || 'Хатолик')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [companyId, period])

  useEffect(() => { if (companyId) fetchData() }, [companyId, fetchData])

  const noData = !loading && !error && crmRefusals.length === 0 && aiRefusals.length === 0

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Рад этиш сабаблари</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Мижозлар бош тортган сабаблар таҳлили</p>
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

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Рад этилган', value: summary.totalLostDeals, icon: TrendingDown, color: 'text-red-400', sub: `${summary.totalDeals} та жами` },
            { label: 'Йўқотилган тушум', value: formatCurrency(summary.lostRevenue), icon: DollarSign, color: 'text-red-400', sub: 'Рад этилган битимлар' },
            { label: 'Сабаби аниқ', value: `${summary.lostWithReason} та`, icon: AlertTriangle, color: 'text-yellow-400', sub: `${summary.lostNoReason} та сабабсиз` },
            { label: 'Рад / Жами', value: summary.totalDeals > 0 ? `${Math.round((summary.totalLostDeals / summary.totalDeals) * 100)}%` : '—', icon: BarChart2, color: 'text-orange-400', sub: 'Рад этиш улуши' },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className="glass-card rounded-xl p-4 border border-border flex flex-col gap-1.5">
              <div className="flex items-center gap-2"><Icon size={13} className={color} /><span className="text-xs text-muted-foreground">{label}</span></div>
              <span className="text-xl font-extrabold text-foreground">{value}</span>
              <span className="text-xs text-muted-foreground">{sub}</span>
            </div>
          ))}
        </div>
      ) : null}

      {error ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-red-500/20">
          <p className="text-red-400 font-medium">{error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-all">Қайта уриниш</button>
        </div>
      ) : noData ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <TrendingDown className="mx-auto text-muted-foreground/30 mb-3" size={40} />
          <p className="font-medium text-foreground">Рад этиш маълумоти йўқ</p>
          <p className="text-sm mt-1">Танланган даврда рад этилган битимлар мавжуд эмас</p>
        </div>
      ) : (
        <>
          {/* ── Charts row ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* CRM Refusal Reasons Bar Chart */}
            {crmRefusals.length > 0 && (
              <div className="glass-card rounded-2xl p-5 border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={14} className="text-yellow-400" />
                  <h3 className="font-semibold text-foreground text-sm">CRM рад сабаблари</h3>
                  <span className="text-xs text-muted-foreground">(amoCRM статуслари)</span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={crmRefusals} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Сони" radius={[0, 4, 4, 0]}>
                      {crmRefusals.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* AI Refusal Categories */}
            {aiRefusals.length > 0 && (
              <div className="glass-card rounded-2xl p-5 border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={14} className="text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">AI аниқлаган сабаблар</h3>
                  <span className="text-xs text-muted-foreground">(аудит таҳлилидан)</span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={aiRefusals} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Сони" radius={[0, 4, 4, 0]}>
                      {aiRefusals.map((_, i) => <Cell key={i} fill={COLORS[(i + 4) % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Trend chart ───────────────────────────────────────── */}
          {trend.length > 3 && (
            <div className="glass-card rounded-2xl p-5 border border-border">
              <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
                <TrendingDown size={14} className="text-red-400" />Рад этиш тренди
              </h3>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="refGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} width={28} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" name="Рад" stroke="#ef4444" fill="url(#refGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── CRM Refusal detail table ──────────────────────────── */}
          {crmRefusals.length > 0 && (
            <div className="glass-card rounded-2xl border border-border">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground text-sm">CRM рад сабаблари батафсил</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground text-xs">
                      <th className="p-4 text-left font-semibold">Сабаб</th>
                      <th className="p-4 text-right font-semibold">Сони</th>
                      <th className="p-4 text-right font-semibold">Улуши</th>
                      <th className="p-4 text-right font-semibold">Йўқотилган сумма</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {crmRefusals.map((r, i) => (
                      <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="text-foreground font-medium">{r.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-right font-semibold text-foreground">{r.count}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-muted/40 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${Math.min(r.share, 100)}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-foreground w-8 text-right">{r.share}%</span>
                          </div>
                        </td>
                        <td className="p-4 text-right text-red-400 font-semibold text-sm">
                          {r.lostRevenue > 0 ? formatCurrency(r.lostRevenue) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
