'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Users, Search, RefreshCw, Phone, Handshake, DollarSign,
  ChevronLeft, ChevronRight, UserPlus
} from 'lucide-react'
import { cn, formatCurrency, formatDateTime } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────
interface Customer {
  id: string; name: string; phone: string; email: string | null; createdAt: string
  metrics: { calls: number; talkDuration: number; deals: number; wonDeals: number; revenue: number }
}

interface Summary {
  totalCustomers: number; totalCalls: number; totalWonDeals: number; totalRevenue: number; period: string
}

interface Pagination { page: number; limit: number; total: number; totalPages: number }

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Бугун' }, { key: '7d', label: '7 кун' },
  { key: 'month', label: 'Жорий ой' }, { key: '30d', label: '30 кун' },
] as const

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [period, setPeriod] = useState('30d')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.success) setCompanyId(d.user.companyId); else { setError('Авторизациядан ўтилмаган'); setLoading(false) } })
      .catch(() => { setError('Тизим билан алоқа йўқ'); setLoading(false) })
  }, [])

  const fetchCustomers = useCallback(() => {
    if (!companyId) return
    setLoading(true); setError(null)
    const qs = new URLSearchParams({ period, page: String(page), limit: '25' })
    fetch(`/api/${companyId}/customers?${qs}`)
      .then((r) => { if (!r.ok) throw new Error('Маълумотларни юклаб бўлмади'); return r.json() })
      .then((d) => {
        if (d.success) {
          setCustomers(d.data || [])
          setSummary(d.summary || null)
          setPagination(d.pagination || null)
        } else setError(d.error || 'Хатолик юз берди')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [companyId, period, page])

  useEffect(() => { if (companyId) fetchCustomers() }, [companyId, fetchCustomers])

  const handlePeriodChange = (p: string) => { setPeriod(p); setPage(1) }

  // Local filtering for simple searches, but it's mainly paginated on the server
  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  )

  return (
    <div className="space-y-6">
      
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Мижозлар</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Мижозлар базаси ва уларнинг фаоллик тарихи</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 border border-border">
            {PERIOD_OPTIONS.map((opt) => (
              <button key={opt.key} onClick={() => handlePeriodChange(opt.key)}
                className={cn('px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                  period === opt.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={fetchCustomers} disabled={loading} className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-all disabled:opacity-50">
            <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      {loading && !summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Янги мижозлар', value: summary.totalCustomers, icon: UserPlus, color: 'text-primary', sub: 'Танланган даврда' },
            { label: 'Жами қўнғироқлар', value: summary.totalCalls, icon: Phone, color: 'text-violet-400', sub: 'Мижозлар билан' },
            { label: 'Муваффақиятли битимлар', value: summary.totalWonDeals, icon: Handshake, color: 'text-emerald-400', sub: 'Ёпилган битимлар' },
            { label: 'Умумий тушум', value: formatCurrency(summary.totalRevenue), icon: DollarSign, color: 'text-emerald-400', sub: 'Мижозлардан тушум' },
          ].map(({ label, value, icon: Icon, color, sub }) => (
            <div key={label} className="glass-card rounded-xl p-4 border border-border flex flex-col gap-1.5">
              <div className="flex items-center gap-2"><Icon size={13} className={color} /><span className="text-xs text-muted-foreground">{label}</span></div>
              <span className="text-xl font-extrabold text-foreground">{value}</span>
              <span className="text-xs text-muted-foreground">{sub}</span>
            </div>
          ))}
        </div>
      ) : null}

      {/* ── Search Bar ────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 max-w-md bg-card border border-border rounded-xl px-3 py-2">
        <Search size={16} className="text-muted-foreground" />
        <input
          type="text"
          placeholder="Мижоз исми ёки телефони орқали қидириш..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {/* ── Table ─────────────────────────────────────────────────── */}
      {loading && customers.length === 0 ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 text-center border-red-500/20">
          <p className="text-red-400 font-medium">{error}</p>
          <button onClick={fetchCustomers} className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-all">Қайта уриниш</button>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <Users className="mx-auto text-muted-foreground/30 mb-3" size={40} />
          <p className="font-medium text-foreground">Мижозлар топилмади</p>
          <p className="text-sm mt-1">Танланган даврда мижозлар йўқ ёки қидирувга мос келмади</p>
        </div>
      ) : (
        <div className="overflow-x-auto glass-card rounded-2xl border border-border">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="p-4 font-semibold">Мижоз / Алоқа</th>
                <th className="p-4 font-semibold">Қўнғироқлар</th>
                <th className="p-4 font-semibold">Битимлар</th>
                <th className="p-4 font-semibold">Келтирган тушум</th>
                <th className="p-4 font-semibold">Қўшилган сана</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4">
                    <div>
                      <p className="text-foreground font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                      {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="font-semibold text-foreground">{c.metrics.calls}</span> та
                    {c.metrics.talkDuration > 0 && <span className="text-xs text-muted-foreground ml-2">({Math.round(c.metrics.talkDuration / 60)} дақ)</span>}
                  </td>
                  <td className="p-4">
                    <span className="font-semibold text-foreground">{c.metrics.deals}</span> та
                    {c.metrics.wonDeals > 0 && <span className="text-xs text-emerald-400 ml-2 font-semibold">✓ {c.metrics.wonDeals} ёпилган</span>}
                  </td>
                  <td className="p-4">
                    <span className="font-semibold text-emerald-400">
                      {c.metrics.revenue > 0 ? formatCurrency(c.metrics.revenue) : '—'}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(c.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="p-3 border-t border-border flex items-center justify-between bg-muted/10">
              <span className="text-xs text-muted-foreground">
                {pagination.total} та мижоз · {pagination.page}/{pagination.totalPages} бет
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
            <div className="p-3 border-t border-border text-xs text-muted-foreground text-right bg-muted/10">
              {pagination.total} та мижоз
            </div>
          )}
        </div>
      )}
    </div>
  )
}
