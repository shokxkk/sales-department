'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Zap, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Balance {
  availableMinutes: number
  usedMinutes: number
  reservedMinutes: number
  transactions: Array<{
    id: string
    type: 'CREDIT' | 'DEBIT' | 'RESERVE' | 'REFUND'
    minutes: number
    createdAt: string
    description?: string
  }>
}

export default function BalancePage() {
  const [balance, setBalance] = useState<Balance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCompanyId(d.user.companyId)
        } else {
          setError('Авторизациядан ўтилмаган')
          setLoading(false)
        }
      })
      .catch(() => {
        setError('Тизим билан алоқа йўқ')
        setLoading(false)
      })
  }, [])

  const fetchBalance = () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    fetch(`/api/${companyId}/balance`)
      .then((r) => {
        if (!r.ok) throw new Error('Баланс маълумотларини юклаб бўлмади')
        return r.json()
      })
      .then((d) => {
        if (d.success) {
          setBalance(d.data)
        } else {
          setError(d.error || 'Хатолик юз берди')
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (companyId) fetchBalance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Тариф ва баланс</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Аудит учун дақиқалар баланси ва улардан фойдаланиш тарихи</p>
        </div>
        <button
          onClick={fetchBalance}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium transition-all"
        >
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          Янгилаш
        </button>
      </div>

      {loading ? (
        <div className="skeleton h-40 rounded-2xl" />
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 text-center border-red-500/20">
          <p className="text-red-400 font-medium">{error}</p>
        </div>
      ) : !balance ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <CreditCard className="mx-auto text-muted-foreground/30 mb-3" size={40} />
          <p className="font-medium text-foreground">Баланс маълумотлари топилмади</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-2xl p-6 border border-border">
              <span className="text-xs text-muted-foreground">Мавжуд дақиқалар</span>
              <div className="mt-2 flex items-center gap-2">
                <Zap size={24} className="text-primary" />
                <span className="text-3xl font-extrabold text-foreground">{balance.availableMinutes}</span>
                <span className="text-xs text-muted-foreground">дақ</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-border">
              <span className="text-xs text-muted-foreground">Захира қилинган</span>
              <div className="mt-2">
                <span className="text-3xl font-extrabold text-foreground">{balance.reservedMinutes}</span>
                <span className="text-xs text-muted-foreground ml-1">дақ</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-border">
              <span className="text-xs text-muted-foreground">Ишлатилган дақиқалар</span>
              <div className="mt-2">
                <span className="text-3xl font-extrabold text-foreground">{balance.usedMinutes}</span>
                <span className="text-xs text-muted-foreground ml-1">дақ</span>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-border space-y-4">
            <h3 className="font-bold text-foreground text-base">Транзакциялар тарихи</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-3 font-semibold">Сана</th>
                    <th className="pb-3 font-semibold">Тур</th>
                    <th className="pb-3 font-semibold">Дақиқалар</th>
                    <th className="pb-3 font-semibold">Тавсиф</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {balance.transactions?.map((t) => (
                    <tr key={t.id} className="hover:bg-muted/10">
                      <td className="py-3 text-muted-foreground">{new Date(t.createdAt).toLocaleDateString('ru-RU')}</td>
                      <td className="py-3">
                        <span className={cn(
                          'text-[10px] font-semibold px-1.5 py-0.5 rounded border',
                          t.type === 'CREDIT' ? 'badge-success' :
                          t.type === 'DEBIT' ? 'badge-error' : 'badge-warning'
                        )}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 text-foreground font-medium">{t.minutes} дақ</td>
                      <td className="py-3 text-muted-foreground">{t.description || '—'}</td>
                    </tr>
                  ))}
                  {(!balance.transactions || balance.transactions.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground">
                        Транзакциялар мавжуд эмас
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
