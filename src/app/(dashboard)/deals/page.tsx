'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Handshake, Search, RefreshCw, TrendingUp, DollarSign,
  XCircle, ChevronLeft, ChevronRight, BarChart2, Users,
} from 'lucide-react'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────
interface Deal {
  id: string; name: string; budget: number; currency: string | null
  status: string | null; source: string | null
  crmCreatedAt: string | null; closedAt: string | null; crmId: string | null
  pipeline: { id: string; name: string } | null
  stage: { id: string; name: string; isSuccess: boolean; color: string | null } | null
  manager: { id: string; name: string } | null
  customer: { id: string; name: string } | null
  refusalReason: { id: string; name: string } | null
}

interface Summary {
  wonCount: number; lostCount: number; openCount: number; totalDeals: number
  conversionRate: number; totalRevenue: number; avgDealSize: number
  pipelineValue: number; period: string
}

interface TopManager { managerId: string | null; managerName: string; wonDeals: number; revenue: number }
interface Pagination { page: number; limit: number; total: number; totalPages: number }

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Бугун' }, { key: '7d', label: '7 кун' },
  { key: 'month', label: 'Жорий ой' }, { key: '30d', label: '30 кун' },
] as const

const STATUS_OPTIONS = [
  { key: 'all', label: 'Барчаси', color: 'text-foreground' },
  { key: 'won', label: 'Ёпилган ✓', color: 'text-emerald-400' },
  { key: 'open', label: 'Жараёнда', color: 'text-blue-400' },
  { key: 'lost', label: 'Рад этилган', color: 'text-red-400' },
] as const

function StatusBadge({ status }: { status: string | null }) {
  if (status === 'won') return <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Ёпилган</span>
  if (status === 'lost') return <span className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">Рад этилган</span>
  if (status === 'open') return <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">Жараёнда</span>
  return <span className="text-xs text-muted-foreground px-2 py-0.5 rounded-full border border-border">{status || '—'}</span>
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [topManagers, setTopManagers] = useState<TopManager[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [period, setPeriod] = useState('30d')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.success) setCompanyId(d.user.companyId); else { setError('Авторизациядан ўтилмаган'); setLoading(false) } })
      .catch(() => { setError('Тизим билан алоқа йўқ'); setLoading(false) })
  }, [])

  const fetchDeals = useCallback(() => {
    if (!companyId) return
    setLoading(true); setError(null)
    const qs = new URLSearchParams({ period, status: statusFilter, page: String(page), limit: '25' })
    fetch(`/api/${companyId}/deals?${qs}`)
      .then((r) => { if (!r.ok) throw new Error('Маълумотларни юклаб бўлмади'); return r.json() })
      .then((d) => {
        if (d.success) {
          setDeals(d.data || [])
          setSummary(d.summary || null)
          setTopManagers(d.analytics?.topManagers || [])
          setPagination(d.pagination || null)
        } else setError(d.error || 'Хатолик')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [companyId, period, statusFilter, page])

  useEffect(() => { if (companyId) fetchDeals() }, [companyId, fetchDeals])

  // Reset page on filter change
  const handlePeriodChange = (p: string) => { setPeriod(p); setPage(1) }
  const handleStatusChange = (s: string) => { setStatusFilter(s); setPage(1) }

  const filtered = deals.filter((d) =>
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.manager?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.customer?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Сотув</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Битимлар таҳлили ва сотув кўрсаткичлари</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Period */}
          <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 border border-border">
            {PERIOD_OPTIONS.map((opt) => (
              <button key={opt.key} onClick={() => handlePeriodChange(opt.key)}
                className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  period === opt.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={fetchDeals} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium transition-all disabled:opacity-50">
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
            Янгилаш
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      {loading && !summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Жами битимлар', value: summary.totalDeals, sub: `${summary.wonCount} ёпилган`, icon: Handshake, color: 'text-primary' },
            { label: 'Конверсия', value: `${summary.conversionRate}%`, sub: `${summary.lostCount} рад этилган`, icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Умумий тушум', value: formatCurrency(summary.totalRevenue), sub: 'Ёпилган битимлар', icon: DollarSign, color: 'text-emerald-400' },
            { label: 'Ўрт. битим', value: summary.avgDealSize > 0 ? formatCurrency(summary.avgDealSize) : '—', sub: 'Ёпилган битимлар', icon: BarChart2, color: 'text-yellow-400' },
            { label: 'Pipeline қиймати', value: formatCurrency(summary.pipelineValue), sub: `${summary.openCount} жараёнда`, icon: TrendingUp, color: 'text-blue-400' },
            { label: 'Рад этилган', value: summary.lostCount, sub: 'Битимлар', icon: XCircle, color: 'text-red-400' },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="glass-card rounded-xl p-4 border border-border flex flex-col gap-1.5">
              <div className="flex items-center gap-2"><Icon size={13} className={color} /><span className="text-xs text-muted-foreground">{label}</span></div>
              <span className="text-xl font-extrabold text-foreground">{value}</span>
              {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Top Managers + Filters row ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status tabs */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <button key={opt.key} onClick={() => handleStatusChange(opt.key)}
                className={cn('px-4 py-2 text-xs font-semibold rounded-xl border transition-all',
                  statusFilter === opt.key
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-border/80')}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-3 max-w-sm bg-card border border-border rounded-xl px-3 py-2">
            <Search size={14} className="text-muted-foreground shrink-0" />
            <input type="text" placeholder="Битим, менежер ёки мижоз..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none" />
          </div>
        </div>

        {/* Top managers */}
        {topManagers.length > 0 && (
          <div className="glass-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-3"><Users size={13} className="text-primary" /><span className="text-xs font-semibold text-foreground">Энг яхши менежерлар</span></div>
            <div className="space-y-2">
              {topManagers.slice(0, 5).map((m, i) => (
                <div key={m.managerId || i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <span className="text-xs font-medium text-foreground truncate max-w-[100px]">{m.managerName}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-emerald-400">{m.wonDeals} ✓</span>
                    <span className="text-xs text-muted-foreground ml-2">{formatCurrency(m.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Deals Table ───────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}</div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-red-500/20">
          <p className="text-red-400 font-medium">{error}</p>
          <button onClick={fetchDeals} className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-all">Қайта уриниш</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <Handshake className="mx-auto text-muted-foreground/30 mb-3" size={40} />
          <p className="font-medium text-foreground">Битимлар топилмади</p>
          <p className="text-sm mt-1">Фильтрни ўзгартириб кўринг</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl border border-border overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="p-4 font-semibold">Битим</th>
                <th className="p-4 font-semibold">Менежер</th>
                <th className="p-4 font-semibold">Мижоз</th>
                <th className="p-4 font-semibold">Воронка / Босқич</th>
                <th className="p-4 font-semibold">Сумма</th>
                <th className="p-4 font-semibold">Статус</th>
                <th className="p-4 font-semibold">Сана</th>
                <th className="p-4 font-semibold">Рад сабаби</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-4">
                    <div>
                      <p className="font-medium text-foreground text-sm line-clamp-1">{d.name}</p>
                      {d.crmId && <p className="text-xs text-muted-foreground">#{d.crmId}</p>}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-foreground">{d.manager?.name ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-4 text-sm text-foreground">{d.customer?.name ?? <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-4">
                    <div className="text-xs">
                      <p className="text-muted-foreground">{d.pipeline?.name ?? '—'}</p>
                      {d.stage && (
                        <span className="font-medium" style={{ color: d.stage.color || undefined }}>
                          {d.stage.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-semibold text-foreground whitespace-nowrap">
                    {d.budget > 0 ? formatCurrency(d.budget) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="p-4"><StatusBadge status={d.status} /></td>
                  <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                    {d.status === 'won' && d.closedAt
                      ? formatDateTime(d.closedAt)
                      : d.crmCreatedAt ? formatDateTime(d.crmCreatedAt) : '—'}
                  </td>
                  <td className="p-4 text-xs text-muted-foreground">
                    {d.refusalReason?.name ?? (d.status === 'lost' ? <span className="text-muted-foreground/50">—</span> : null)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="p-3 border-t border-border flex items-center justify-between bg-muted/10">
              <span className="text-xs text-muted-foreground">
                {pagination.total} та битим · {pagination.page}/{pagination.totalPages} бет
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-all">
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-foreground">{page}</span>
                <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages || loading}
                  className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-all">
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
          {pagination && pagination.totalPages <= 1 && (
            <div className="p-3 border-t border-border text-xs text-muted-foreground flex justify-between bg-muted/10">
              <span>{pagination.total} та битим</span>
              <span className="flex items-center gap-1"><BarChart2 size={11} />amoCRM маълумоти асосида</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
