'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Search, RefreshCw, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Tariff {
  id: string
  name: string
  priceMonthly: number
  maxUsers: number
  aiMinutesPerMonth: number
  isActive: boolean
}

export default function AdminTariffsPage() {
  const [tariffs, setTariffs] = useState<Tariff[]>([])
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

  const fetchTariffs = () => {
    if (!isSuperAdmin) return
    setLoading(true)
    setError(null)
    fetch('/api/admin/tariffs')
      .then((r) => {
        if (!r.ok) {
          if (r.status === 403) throw new Error('Кириш тақиқланган (403)')
          throw new Error('Маълумотларни юклаб бўлмади')
        }
        return r.json()
      })
      .then((d) => {
        if (d.success) {
          setTariffs(d.data || [])
        } else {
          setError(d.error || 'Хатолик юз берди')
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (isSuperAdmin) fetchTariffs()
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
          <h1 className="text-2xl font-bold text-foreground">Тарифлар</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Тизимдаги мавжуд тариф режалари ва уларнинг созламалари</p>
        </div>
        <button
          onClick={fetchTariffs}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium transition-all"
        >
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          Янгилаш
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 text-center border-red-500/20">
          <p className="text-red-400 font-medium">{error}</p>
          <button
            onClick={fetchTariffs}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-all"
          >
            Қайта уриниш
          </button>
        </div>
      ) : tariffs.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <CreditCard className="mx-auto text-muted-foreground/30 mb-3" size={40} />
          <p className="font-medium text-foreground">Тарифлар топилмади</p>
        </div>
      ) : (
        <div className="overflow-x-auto glass-card rounded-2xl border border-border">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="p-4 font-semibold">Тариф номи</th>
                <th className="p-4 font-semibold">Ойлик тўлов</th>
                <th className="p-4 font-semibold">Макс. Фойдаланувчилар</th>
                <th className="p-4 font-semibold">Ичидаги дақиқалар</th>
                <th className="p-4 font-semibold">Ҳолати</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tariffs.map((t) => (
                <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-foreground font-medium">{t.name}</td>
                  <td className="p-4 text-foreground font-semibold">
                    {new Intl.NumberFormat('uz-UZ', { style: 'currency', currency: 'UZS', minimumFractionDigits: 0 }).format(t.priceMonthly)}
                  </td>
                  <td className="p-4 text-foreground">{t.maxUsers}</td>
                  <td className="p-4 text-foreground font-medium">{t.aiMinutesPerMonth} дақ</td>
                  <td className="p-4">
                    <span className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-full border',
                      t.isActive ? 'badge-success' : 'badge-error'
                    )}>
                      {t.isActive ? 'ACTIVE' : 'INACTIVE'}
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
