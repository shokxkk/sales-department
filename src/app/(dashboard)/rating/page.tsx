'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Star, Trophy, RefreshCw, TrendingUp, Phone, BarChart2, ChevronRight } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────
interface RatingEntry {
  rank: number; managerId: string; managerName: string; position: string | null
  metrics: {
    calls: number; answeredCalls: number; avgAuditScore: number; auditedCallsCount: number
    wonDeals: number; totalDeals: number; conversionRate: number; revenue: number
  }
  scores: { salesScore: number; revenueScore: number; auditScore: number; activityScore: number; total: number }
}

interface Weights { sales: number; revenue: number; audit: number; activity: number }

const PERIOD_OPTIONS = [
  { key: 'today', label: 'Бугун' }, { key: '7d', label: '7 кун' },
  { key: 'month', label: 'Жорий ой' }, { key: '30d', label: '30 кун' },
] as const

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-yellow-400 font-black text-base flex items-center gap-1"><Trophy size={14} fill="currentColor" />1</span>
  if (rank === 2) return <span className="text-slate-300 font-black text-base">2</span>
  if (rank === 3) return <span className="text-amber-600 font-black text-base">3</span>
  return <span className="text-muted-foreground font-semibold text-sm">{rank}</span>
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-muted/40 rounded-full h-1.5 w-20">
        <div className={cn('h-1.5 rounded-full', color)} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs font-semibold text-foreground w-8 text-right">{value}</span>
    </div>
  )
}

export default function RatingPage() {
  const [entries, setEntries] = useState<RatingEntry[]>([])
  const [weights, setWeights] = useState<Weights | null>(null)
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
    fetch(`/api/${companyId}/rating?period=${period}`)
      .then((r) => { if (!r.ok) throw new Error('Маълумотларни юклаб бўлмади'); return r.json() })
      .then((d) => {
        if (d.success) { setEntries(d.data || []); setWeights(d.weights || null) }
        else setError(d.error || 'Хатолик')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [companyId, period])

  useEffect(() => { if (companyId) fetchData() }, [companyId, fetchData])

  return (
    <div className="space-y-6">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Рейтинг</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Менежерларнинг умумий иш самарадорлиги</p>
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

      {/* ── Formula info ──────────────────────────────────────────── */}
      {weights && (
        <div className="glass-card rounded-xl p-4 border border-border flex flex-wrap items-center gap-4">
          <span className="text-xs font-semibold text-muted-foreground">Формула:</span>
          {[
            { label: 'Сотув', w: weights.sales, icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Тушум', w: weights.revenue, icon: BarChart2, color: 'text-blue-400' },
            { label: 'Аудит', w: weights.audit, icon: Star, color: 'text-yellow-400' },
            { label: 'Фаоллик', w: weights.activity, icon: Phone, color: 'text-violet-400' },
          ].map(({ label, w, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon size={12} className={color} />
              <span className="text-xs text-foreground font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{Math.round(w * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 text-center border border-red-500/20">
          <p className="text-red-400 font-medium">{error}</p>
          <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-all">Қайта уриниш</button>
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <Trophy className="mx-auto text-muted-foreground/30 mb-3" size={40} />
          <p className="font-medium text-foreground">Маълумот мавжуд эмас</p>
          <p className="text-sm mt-1">Танланган давр учун рейтинг маълумоти йўқ</p>
        </div>
      ) : (
        <>
          {/* ── Top 3 podium ──────────────────────────────────────── */}
          {entries.length >= 3 && (
            <div className="grid grid-cols-3 gap-3">
              {[entries[1], entries[0], entries[2]].map((e, idx) => (
                <div key={e.managerId}
                  className={cn('glass-card rounded-2xl p-4 border text-center flex flex-col items-center gap-2',
                    idx === 1 ? 'border-yellow-500/30 bg-yellow-500/5' :
                    idx === 0 ? 'border-slate-400/20' : 'border-amber-700/20')}>
                  <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-xl font-black',
                    idx === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                    idx === 0 ? 'bg-slate-400/20 text-slate-300' : 'bg-amber-700/20 text-amber-600')}>
                    {e.managerName.charAt(0)}
                  </div>
                  <RankMedal rank={e.rank} />
                  <p className="text-xs font-semibold text-foreground">{e.managerName}</p>
                  <p className="text-2xl font-extrabold text-foreground">{e.scores.total}</p>
                  <p className="text-xs text-muted-foreground">умумий балл</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Full leaderboard table ─────────────────────────────── */}
          <div className="glass-card rounded-2xl border border-border overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="p-4 text-left font-semibold w-12">Ўрин</th>
                  <th className="p-4 text-left font-semibold">Ходим</th>
                  <th className="p-4 text-left font-semibold">Сотув</th>
                  <th className="p-4 text-left font-semibold">Тушум</th>
                  <th className="p-4 text-left font-semibold">Аудит</th>
                  <th className="p-4 text-left font-semibold">Фаоллик</th>
                  <th className="p-4 text-right font-semibold">Умумий</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => (
                  <tr key={e.managerId} className={cn('hover:bg-muted/20 transition-colors', e.rank <= 3 && 'bg-muted/10')}>
                    <td className="p-4"><RankMedal rank={e.rank} /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                          {e.managerName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{e.managerName}</p>
                          <p className="text-xs text-muted-foreground">{e.position || `${e.metrics.wonDeals} битим · ${e.metrics.conversionRate}% конв.`}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 min-w-[100px]"><ScoreBar value={e.scores.salesScore} color="bg-emerald-400" /></td>
                    <td className="p-4 min-w-[100px]"><ScoreBar value={e.scores.revenueScore} color="bg-blue-400" /></td>
                    <td className="p-4 min-w-[100px]"><ScoreBar value={e.scores.auditScore} color="bg-yellow-400" /></td>
                    <td className="p-4 min-w-[100px]"><ScoreBar value={e.scores.activityScore} color="bg-violet-400" /></td>
                    <td className="p-4 text-right">
                      <span className={cn('text-xl font-extrabold',
                        e.scores.total >= 70 ? 'text-emerald-400' :
                        e.scores.total >= 40 ? 'text-yellow-400' : 'text-foreground')}>
                        {e.scores.total}
                      </span>
                    </td>
                    <td className="p-4">
                      <Link href={`/managers/${e.managerId}?period=${period}`} className="text-primary hover:text-primary/80">
                        <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between bg-muted/10">
              <span>{entries.length} та ходим</span>
              <span>Реал база маълумоти асосида</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
