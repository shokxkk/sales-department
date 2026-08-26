'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  FileText, Download, Phone, Handshake, Star, TrendingUp,
  RefreshCw, BarChart2, FileSpreadsheet,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────
interface SummaryData {
  totalCalls: number; answeredCalls: number; auditedCalls: number; avgAuditScore: number
  wonDeals: number; lostDeals: number; totalRevenue: number; conversionRate: number; period: string
}
interface TopManager { managerId: string | null; managerName: string; wonDeals: number; revenue: number }
interface TrendPoint { date: string; count: number }

const PERIOD_OPTIONS = [
  { key: '7d', label: '7 кун' }, { key: '30d', label: '30 кун' },
  { key: 'month', label: 'Жорий ой' }, { key: '3month', label: '3 ой' },
] as const

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => <p key={p.name} style={{ color: p.color }} className="font-semibold">{p.name}: {p.value}</p>)}
    </div>
  )
}

// ─── CSV Export helper ────────────────────────────────────────────
function exportCsv(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) return
  const headers = Object.keys(rows[0])
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => {
      const v = String(r[h] ?? '')
      return v.includes(',') ? `"${v.replace(/"/g, '""')}"` : v
    }).join(',')),
  ]
  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [topManagers, setTopManagers] = useState<TopManager[]>([])
  const [callTrend, setCallTrend] = useState<TrendPoint[]>([])
  const [dealTrend, setDealTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [period, setPeriod] = useState('30d')
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.success) setCompanyId(d.user.companyId); else { setError('Авторизациядан ўтилмаган'); setLoading(false) } })
      .catch(() => { setError('Тизим билан алоқа йўқ'); setLoading(false) })
  }, [])

  const fetchSummary = useCallback(() => {
    if (!companyId) return
    setLoading(true); setError(null)
    fetch(`/api/${companyId}/reports?period=${period}&type=summary`)
      .then((r) => { if (!r.ok) throw new Error('Маълумотларни юклаб бўлмади'); return r.json() })
      .then((d) => {
        if (d.success && d.data) {
          setSummary(d.data.summary)
          setTopManagers(d.data.topManagers || [])
          setCallTrend(d.data.callTrend || [])
          setDealTrend(d.data.dealTrend || [])
        } else setError(d.error || 'Хатолик')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [companyId, period])

  useEffect(() => { if (companyId) fetchSummary() }, [companyId, fetchSummary])

  const handleExport = async (type: 'calls' | 'deals' | 'audits') => {
    if (!companyId) return
    setExporting(type)
    try {
      const r = await fetch(`/api/${companyId}/reports?period=${period}&type=${type}`)
      const d = await r.json()
      if (d.success && d.data) {
        exportCsv(d.data, `${type}_${period}_${new Date().toISOString().slice(0, 10)}.csv`)
      }
    } catch { /* noop */ }
    finally { setExporting(null) }
  }

  const EXPORT_CARDS = [
    { type: 'calls' as const, label: 'Қўнғироқлар', desc: 'Сана, менежер, мижоз, статус, давомийлик, аудит баҳоси', icon: Phone, color: 'text-violet-400' },
    { type: 'deals' as const, label: 'Битимлар', desc: 'Сана, менежер, мижоз, сумма, воронка, статус, рад сабаби', icon: Handshake, color: 'text-emerald-400' },
    { type: 'audits' as const, label: 'Аудит натижалари', desc: 'Сана, менежер, мижоз, балл, хулоса, зўр/заиф томонлар', icon: Star, color: 'text-yellow-400' },
  ]

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ҳисоботлар</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Таҳлилий ҳисоботлар ва CSV экспорт</p>
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
          <button onClick={fetchSummary} disabled={loading} className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-all disabled:opacity-50">
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── KPI Summary ───────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Жами қўнғироқлар', value: summary.totalCalls, sub: `${summary.answeredCalls} жавоб`, icon: Phone, color: 'text-violet-400' },
            { label: 'Аудит қилинган', value: summary.auditedCalls, sub: `Ўрт. ${summary.avgAuditScore > 0 ? summary.avgAuditScore + '/100' : '—'}`, icon: Star, color: 'text-yellow-400' },
            { label: 'Ёпилган битимлар', value: summary.wonDeals, sub: `${summary.conversionRate}% конверсия`, icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Умумий тушум', value: formatCurrency(summary.totalRevenue), sub: 'Ёпилган битимлар', icon: BarChart2, color: 'text-emerald-400' },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="glass-card rounded-xl p-4 border border-border flex flex-col gap-1.5">
              <div className="flex items-center gap-2"><Icon size={13} className={color} /><span className="text-xs text-muted-foreground">{label}</span></div>
              <span className="text-xl font-extrabold text-foreground">{value}</span>
              <span className="text-xs text-muted-foreground">{sub}</span>
            </div>
          ))}
        </div>
      ) : null}

      {error && (
        <div className="glass-card rounded-2xl p-6 text-center border border-red-500/20">
          <p className="text-red-400 font-medium">{error}</p>
          <button onClick={fetchSummary} className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-all">Қайта уриниш</button>
        </div>
      )}

      {/* ── Charts ────────────────────────────────────────────────── */}
      {!loading && (callTrend.length > 2 || dealTrend.length > 2) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {callTrend.length > 2 && (
            <div className="glass-card rounded-2xl p-5 border border-border">
              <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2"><Phone size={13} className="text-violet-400" />Қўнғироқлар тренди</h3>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={callTrend}>
                  <defs><linearGradient id="callG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} width={28} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" name="Қўнғироқлар" stroke="#7c3aed" fill="url(#callG)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {dealTrend.length > 2 && (
            <div className="glass-card rounded-2xl p-5 border border-border">
              <h3 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2"><Handshake size={13} className="text-emerald-400" />Ёпилган битимлар тренди</h3>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={dealTrend}>
                  <defs><linearGradient id="dealG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#6b7280' }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} allowDecimals={false} width={28} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" name="Битимлар" stroke="#10b981" fill="url(#dealG)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── Export Cards ──────────────────────────────────────────── */}
      <div>
        <h2 className="font-semibold text-foreground text-base mb-3 flex items-center gap-2">
          <FileSpreadsheet size={16} className="text-primary" />CSV Экспорт
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {EXPORT_CARDS.map(({ type, label, desc, icon: Icon, color }) => (
            <div key={type} className="glass-card rounded-2xl p-5 border border-border flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted/40 flex items-center justify-center">
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{label}</h3>
                  <p className="text-xs text-muted-foreground">{period} давр</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              <button
                onClick={() => handleExport(type)}
                disabled={exporting === type || !companyId}
                className="mt-auto flex items-center justify-center gap-2 w-full py-2 px-4 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-xl border border-primary/20 transition-all disabled:opacity-50"
              >
                {exporting === type ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                {exporting === type ? 'Юкланяпти...' : 'CSV юклаш'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top Managers ──────────────────────────────────────────── */}
      {!loading && topManagers.length > 0 && (
        <div className="glass-card rounded-2xl border border-border">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2"><TrendingUp size={14} className="text-emerald-400" />Энг самарали менежерлар</h3>
          </div>
          <div className="divide-y divide-border">
            {topManagers.map((m, i) => (
              <div key={m.managerId || i} className="px-4 py-3 flex items-center justify-between hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold">
                    {m.managerName.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-foreground">{m.managerName}</span>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <span className="text-xs text-muted-foreground">Битимлар: </span>
                    <span className="text-xs font-semibold text-emerald-400">{m.wonDeals}</span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground">{formatCurrency(m.revenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
