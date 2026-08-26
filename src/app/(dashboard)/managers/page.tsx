'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  UserCheck,
  Search,
  RefreshCw,
  ChevronRight,
  TrendingUp,
  Phone,
  Star,
  Users,
  BarChart2,
} from 'lucide-react'
import { cn, formatCurrency, formatDuration } from '@/lib/utils'

interface Manager {
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

interface Summary {
  totalManagers: number
  activeManagers: number
  totalCalls: number
  avgAuditScore: number
  totalRevenue: number
  period: string
}

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Бугун' },
  { key: '7d', label: '7 кун' },
  { key: 'month', label: 'Жорий ой' },
  { key: '30d', label: '30 кун' },
] as const

type SortKey = 'name' | 'callsCount' | 'avgAuditScore' | 'revenue' | 'conversionRate' | 'wonDealsCount'

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
    score >= 60 ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
    score > 0   ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                  'text-muted-foreground bg-muted/20 border-border'
  return (
    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', color)}>
      {score > 0 ? `${score}/100` : '—'}
    </span>
  )
}

export default function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [period, setPeriod] = useState<string>('30d')
  const [sortBy, setSortBy] = useState<SortKey>('revenue')
  const [sortDesc, setSortDesc] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.success) setCompanyId(d.user.companyId); else { setError('Авторизациядан ўтилмаган'); setLoading(false) } })
      .catch(() => { setError('Тизим билан алоқа йўқ'); setLoading(false) })
  }, [])

  const fetchManagers = useCallback(() => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    fetch(`/api/${companyId}/managers?period=${period}`)
      .then((r) => { if (!r.ok) throw new Error('Маълумотларни юклаб бўлмади'); return r.json() })
      .then((d) => {
        if (d.success) { setManagers(d.data || []); setSummary(d.summary || null) }
        else setError(d.error || 'Хатолик юз берди')
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [companyId, period])

  useEffect(() => { if (companyId) fetchManagers() }, [companyId, fetchManagers])

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDesc((d) => !d)
    else { setSortBy(key); setSortDesc(true) }
  }

  const sorted = [...managers]
    .filter((m) => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      const va = a[sortBy] as number | string
      const vb = b[sortBy] as number | string
      if (typeof va === 'string') return sortDesc ? vb.toString().localeCompare(va) : va.localeCompare(vb.toString())
      return sortDesc ? (vb as number) - (va as number) : (va as number) - (vb as number)
    })

  const SortTh = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      className="p-4 font-semibold cursor-pointer select-none whitespace-nowrap"
      onClick={() => handleSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        {sortBy === col && <span className="text-primary text-xs">{sortDesc ? '↓' : '↑'}</span>}
      </span>
    </th>
  )

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Менежерлар</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Сотув бўлими ходимлари таҳлили</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period filter */}
          <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 border border-border">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  period === opt.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchManagers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium transition-all disabled:opacity-50"
          >
            <RefreshCw size={15} className={cn(loading && 'animate-spin')} />
            Янгилаш
          </button>
        </div>
      </div>

      {/* ── Summary KPI Cards ───────────────────────────────────── */}
      {summary && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Жами ходимлар', value: summary.totalManagers, icon: Users, color: 'text-blue-400' },
            { label: 'Жами қўнғироқлар', value: summary.totalCalls, icon: Phone, color: 'text-violet-400' },
            { label: 'Ўрт. аудит баҳоси', value: summary.avgAuditScore > 0 ? `${summary.avgAuditScore}/100` : '—', icon: Star, color: 'text-yellow-400' },
            { label: 'Умумий тушум', value: formatCurrency(summary.totalRevenue), icon: TrendingUp, color: 'text-emerald-400', wide: true },
            { label: 'Фаол ходимлар', value: summary.activeManagers, icon: UserCheck, color: 'text-primary' },
          ].map(({ label, value, icon: Icon, color, wide }) => (
            <div key={label} className={cn('glass-card rounded-xl p-4 border border-border flex flex-col gap-2', wide && 'col-span-2 sm:col-span-1')}>
              <div className="flex items-center gap-2">
                <Icon size={14} className={color} />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <span className="text-lg font-extrabold text-foreground truncate">{value}</span>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      )}

      {/* ── Search ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 max-w-sm bg-card border border-border rounded-xl px-3 py-2">
        <Search size={15} className="text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Ходим исми..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-red-500/20">
          <p className="text-red-400 font-medium">{error}</p>
          <button onClick={fetchManagers} className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-all">
            Қайта уриниш
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <UserCheck className="mx-auto text-muted-foreground/30 mb-3" size={40} />
          <p className="font-medium text-foreground">Менежерлар топилмади</p>
          <p className="text-sm mt-1">CRM дан синхронизация қилинган ходимлар кўрсатилади</p>
        </div>
      ) : (
        <div className="overflow-x-auto glass-card rounded-2xl border border-border">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="p-4 font-semibold">Ходим</th>
                <SortTh label="Қўнғироқлар" col="callsCount" />
                <th className="p-4 font-semibold">Ўрт. сухбат</th>
                <SortTh label="Аудит баҳоси" col="avgAuditScore" />
                <SortTh label="Битимлар" col="wonDealsCount" />
                <SortTh label="Конверсия" col="conversionRate" />
                <SortTh label="Тушум" col="revenue" />
                <th className="p-4 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((m) => (
                <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.position || m.email || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">{m.callsCount}</span>
                      <span className="text-xs text-muted-foreground">{m.answeredCallsCount} жавоб берилган</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground text-xs">
                    {m.avgTalkDurationSeconds > 0 ? formatDuration(m.avgTalkDurationSeconds) : '—'}
                  </td>
                  <td className="p-4">
                    <ScoreBadge score={m.avgAuditScore} />
                    {m.auditedCallsCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">{m.auditedCallsCount} та баҳоланган</p>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-emerald-400">{m.wonDealsCount} ✓</span>
                      <span className="text-xs text-muted-foreground">{m.totalDealsCount} та жами</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted/40 rounded-full h-1.5 w-16">
                        <div
                          className={cn('h-1.5 rounded-full', m.conversionRate >= 50 ? 'bg-emerald-400' : m.conversionRate >= 30 ? 'bg-yellow-400' : 'bg-red-400')}
                          style={{ width: `${Math.min(m.conversionRate, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground">{m.conversionRate}%</span>
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-foreground text-sm">
                    {m.revenue > 0 ? formatCurrency(m.revenue) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/managers/${m.id}?period=${period}`}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-semibold transition-all"
                    >
                      Батафсил <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between bg-muted/10">
            <span>{sorted.length} та ходим</span>
            <div className="flex items-center gap-1 text-muted-foreground/60">
              <BarChart2 size={11} />
              <span>amoCRM маълумоти асосида</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
