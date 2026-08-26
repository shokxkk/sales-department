'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Search, RefreshCw, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Criterion {
  id: string
  code: string
  section: string
  nameUz: string
  maxScore: number
  isCritical: boolean
  isActive: boolean
}

export default function AdminChecklistPage() {
  const [criteria, setCriteria] = useState<Criterion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.user.role === 'SUPER_ADMIN') {
          setIsSuperAdmin(true)
        } else {
          setError('Кириш тақиқланган (403)')
          setLoading(false)
        }
      })
      .catch(() => {
        setError('Тизим билан алоқа йўқ')
        setLoading(false)
      })
  }, [])

  const fetchCriteria = () => {
    if (!isSuperAdmin) return
    setLoading(true)
    setError(null)
    fetch('/api/admin/checklist')
      .then((r) => {
        if (!r.ok) {
          if (r.status === 403) throw new Error('Кириш тақиқланган (403)')
          throw new Error('Маълумотларни юклаб бўлмади')
        }
        return r.json()
      })
      .then((d) => {
        if (d.success) {
          setCriteria(d.data || [])
        } else {
          setError(d.error || 'Хатолик юз берди')
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (isSuperAdmin) fetchCriteria()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin])

  if (error && !isSuperAdmin) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center border-red-500/20 max-w-md mx-auto mt-12 space-y-4">
        <AlertTriangle className="mx-auto text-red-400" size={48} />
        <h2 className="text-lg font-bold text-foreground">Кириш тақиқланган</h2>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Чек-лист</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Сунъий интеллект учун аудит мезонлари ва баҳолаш чек-листи</p>
        </div>
        <button
          onClick={fetchCriteria}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium transition-all"
        >
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          Янгилаш
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 text-center border-red-500/20">
          <p className="text-red-400 font-medium">{error}</p>
          <button
            onClick={fetchCriteria}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-all"
          >
            Қайта уриниш
          </button>
        </div>
      ) : criteria.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <ShieldCheck className="mx-auto text-muted-foreground/30 mb-3" size={40} />
          <p className="font-medium text-foreground">Чек-лист мезонлари топилмади</p>
        </div>
      ) : (
        <div className="overflow-x-auto glass-card rounded-2xl border border-border">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="p-4 font-semibold">Коди</th>
                <th className="p-4 font-semibold">Мезон номи</th>
                <th className="p-4 font-semibold">Бўлим</th>
                <th className="p-4 font-semibold">Макс. Баҳо</th>
                <th className="p-4 font-semibold">Критиклиги</th>
                <th className="p-4 font-semibold">Ҳолати</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {criteria.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-muted-foreground font-mono">{c.code}</td>
                  <td className="p-4 text-foreground font-medium">{c.nameUz}</td>
                  <td className="p-4 text-muted-foreground">{c.section}</td>
                  <td className="p-4 text-foreground font-semibold">{c.maxScore}</td>
                  <td className="p-4">
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full border',
                      c.isCritical ? 'badge-error' : 'badge-neutral'
                    )}>
                      {c.isCritical ? 'Критик' : 'Стандарт'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full border',
                      c.isActive ? 'badge-success' : 'badge-error'
                    )}>
                      {c.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
