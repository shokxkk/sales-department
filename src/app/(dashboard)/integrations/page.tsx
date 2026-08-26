'use client'

import { useEffect, useState } from 'react'
import {
  Plug,
  Check,
  AlertCircle,
  RefreshCw,
  XCircle,
  Key,
  Globe,
  Zap,
  Layers,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Database,
  Users,
  PhoneCall,
  Flame,
  CheckCircle2,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { AmoCRMFilterSync } from '@/components/ui/amocrm-filter-sync'

interface IntegrationStatus {
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR'
  lastSyncAt: string | null
  lastError: string | null
  domain?: string | null
  accountName?: string | null
  authType?: 'token' | 'oauth' | null
}

interface SyncStats {
  leads: number
  contacts: number
  managers: number
  pipelines: number
  calls: number
  durationMs: number
}

export default function IntegrationsPage() {
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [amoStatus, setAmoStatus] = useState<IntegrationStatus>({
    status: 'DISCONNECTED',
    lastSyncAt: null,
    lastError: null,
  })

  // Connection form state
  const [connectTab, setConnectTab] = useState<'token' | 'oauth'>('token')
  const [amoDomain, setAmoDomain] = useState('')
  const [amoToken, setAmoToken] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  // Sync state
  const [syncingType, setSyncingType] = useState<'fast' | 'full' | 'structure' | null>(null)
  const [lastSyncResult, setLastSyncResult] = useState<SyncStats | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCompanyId(d.user.companyId)
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [])

  const fetchAmoStatus = async () => {
    if (!companyId) return
    try {
      const r = await fetch(`/api/${companyId}/integrations/amocrm/status`)
      const d = await r.json()
      if (d.success && d.data) {
        setAmoStatus(d.data)
        if (d.data.domain && !amoDomain) {
          setAmoDomain(d.data.domain)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (companyId) {
      fetchAmoStatus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId])

  const handleConnectToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return

    if (!amoDomain.trim()) {
      toast.error('amoCRM домен ёки субдоменини киритинг')
      return
    }

    if (!amoToken.trim()) {
      toast.error('amoCRM API калити (Долгосрочный токен) киритилиши шарт')
      return
    }

    setConnecting(true)
    try {
      const res = await fetch(`/api/${companyId}/integrations/amocrm/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: amoDomain.trim(),
          token: amoToken.trim(),
          mode: 'token',
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message || 'amoCRM муваффақиятли уланди!')
        setAmoToken('')
        await fetchAmoStatus()
      } else {
        toast.error(data.error || 'Уланишда хатолик юз берди')
      }
    } catch {
      toast.error('Сервер билан алоқада хатолик')
    } finally {
      setConnecting(false)
    }
  }

  const handleConnectOAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return

    if (!amoDomain.trim()) {
      toast.error('amoCRM домен номини киритинг')
      return
    }

    setConnecting(true)
    try {
      const res = await fetch(`/api/${companyId}/integrations/amocrm/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: amoDomain.trim(),
          mode: 'oauth',
        }),
      })

      const data = await res.json()
      if (res.ok && data.url) {
        toast.success('amoCRM уланиш саҳифасига йўналтирилмоқда...')
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Уланиш хатоси')
      }
    } catch {
      toast.error('Сервер билан алоқа йўқ')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (!companyId) return
    if (!confirm('amoCRM интеграциясини ростдан ҳам узиб қўймоқчимисиз?')) return

    setDisconnecting(true)
    try {
      const res = await fetch(`/api/${companyId}/integrations/amocrm/disconnect`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Муваффақиятли узилди')
        setAmoStatus({
          status: 'DISCONNECTED',
          lastSyncAt: null,
          lastError: null,
        })
        setLastSyncResult(null)
      } else {
        toast.error(data.error || 'Ўчиришда хатолик')
      }
    } catch {
      toast.error('Сервер билан алоқа йўқ')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleSync = async (type: 'fast' | 'full' | 'structure') => {
    if (!companyId) return
    setSyncingType(type)
    const toastId = toast.loading(
      type === 'fast'
        ? 'Тезкор синхронизация бошланди (охирги 7 кун)...'
        : type === 'structure'
        ? 'Менежер ва воронкалар янгиланмоқда...'
        : 'Тўлиқ синхронизация бошланди...'
    )

    try {
      const res = await fetch(`/api/${companyId}/integrations/amocrm/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(data.message || 'Синхронизация муваффақиятли якунланди!', { id: toastId })
        if (data.counts) {
          setLastSyncResult(data.counts)
        }
        fetchAmoStatus()
      } else {
        toast.error(data.error || 'Синхронизацияда хатолик', { id: toastId })
      }
    } catch {
      toast.error('Сервер билан алоқа йўқ', { id: toastId })
    } finally {
      setSyncingType(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
          <Plug className="text-primary w-6 h-6" />
          Интеграциялар
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          amoCRM, OnlinePBX ва MustaqiLLM (NeuronAI) билан тўлиқ интеграция
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ─── amoCRM CARD (8 cols on large screens) ─── */}
        <div className="lg:col-span-8 glass-card rounded-2xl p-6 border border-border space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-extrabold text-base shadow-sm">
                  amo
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground text-base">amoCRM Интеграцияси</h3>
                    {amoStatus.status === 'CONNECTED' && (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Фаол
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Лидлар, битимлар, контактлар, воронка ва сўзлашувларни олиш
                  </p>
                </div>
              </div>

              <span
                className={cn(
                  'flex items-center gap-1 text-[11px] font-bold tracking-wider px-3 py-1 rounded-full border',
                  amoStatus.status === 'CONNECTED'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                )}
              >
                {amoStatus.status === 'CONNECTED' ? <Check size={12} /> : <AlertCircle size={12} />}
                {amoStatus.status === 'CONNECTED' ? 'Уланган' : 'Уланмаган'}
              </span>
            </div>

            {/* If Connected: Show Active Info & Quick Sync Controls */}
            {amoStatus.status === 'CONNECTED' ? (
              <div className="space-y-4 pt-1">
                {/* Account Details Banner */}
                <div className="p-4 bg-muted/40 border border-border/70 rounded-2xl space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-muted-foreground" />
                      <span className="text-muted-foreground">amoCRM Ҳисоб:</span>
                      <span className="text-foreground font-semibold">
                        {amoStatus.accountName || amoStatus.domain || 'Уланган'}
                      </span>
                      {amoStatus.domain && (
                        <span className="text-[11px] text-muted-foreground bg-background px-2 py-0.5 rounded-md border border-border">
                          {amoStatus.domain}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground">Уланиш тури:</span>
                      <span className="font-medium text-primary">
                        {amoStatus.authType === 'token' ? '⚡ Долгосрочный токен (API)' : '🔗 OAuth 2.0'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                    <span className="text-muted-foreground">Охирги синхронизация:</span>
                    <span className="text-foreground font-medium">
                      {amoStatus.lastSyncAt ? new Date(amoStatus.lastSyncAt).toLocaleString('uz-UZ') : '—'}
                    </span>
                  </div>

                  {amoStatus.lastError && (
                    <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium flex items-center gap-2">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{amoStatus.lastError}</span>
                    </div>
                  )}
                </div>

                {/* Sync Action Center */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Zap size={14} className="text-amber-400" />
                    Маълумотларни синхронлаш (Тезда янгилаш):
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Fast Sync (Recommended) */}
                    <button
                      onClick={() => handleSync('fast')}
                      disabled={Boolean(syncingType)}
                      className="p-3 bg-gradient-to-br from-primary/20 to-primary/5 hover:from-primary/30 hover:to-primary/10 border border-primary/40 rounded-xl text-left transition-all group disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1">
                          <Flame size={13} className="text-orange-400" />
                          Тезкор (7 кун)
                        </span>
                        {syncingType === 'fast' ? (
                          <RefreshCw size={12} className="animate-spin text-primary" />
                        ) : (
                          <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-semibold">
                            Tavsiya
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Охирги 7 кунлик битим ва қўнғироқлар (3-5 сония)
                      </p>
                    </button>

                    {/* Full Sync */}
                    <button
                      onClick={() => handleSync('full')}
                      disabled={Boolean(syncingType)}
                      className="p-3 bg-muted/40 hover:bg-muted/70 border border-border rounded-xl text-left transition-all disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1">
                          <Database size={13} className="text-blue-400" />
                          Тўлиқ синхронлаш
                        </span>
                        {syncingType === 'full' && (
                          <RefreshCw size={12} className="animate-spin text-primary" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Барча тарихий битимлар, контактлар ва қўнғироқлар
                      </p>
                    </button>

                    {/* Structure Only */}
                    <button
                      onClick={() => handleSync('structure')}
                      disabled={Boolean(syncingType)}
                      className="p-3 bg-muted/40 hover:bg-muted/70 border border-border rounded-xl text-left transition-all disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1">
                          <Users size={13} className="text-emerald-400" />
                          Фақат тузилма
                        </span>
                        {syncingType === 'structure' && (
                          <RefreshCw size={12} className="animate-spin text-primary" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Менежерлар ва воронка босқичларини янгилаш
                      </p>
                    </button>
                  </div>
                </div>

                {/* Targeted Custom Sync by Manager & Date */}
                <div className="pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Filter size={14} className="text-cyan-400" />
                      Менежер ва Сана бўйича аниқ синхронлаш:
                    </label>
                  </div>
                  <div className="flex justify-center">
                    <AmoCRMFilterSync
                      companyId={companyId || ''}
                      className="max-w-full sm:max-w-md w-full"
                      onSyncComplete={(res) => {
                        if (res.counts) setLastSyncResult(res.counts)
                        fetchAmoStatus()
                      }}
                    />
                  </div>
                </div>

                {/* Last Sync Results Card */}
                {lastSyncResult && (
                  <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        Сўнгги синхронизация натижаси
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {(lastSyncResult.durationMs / 1000).toFixed(1)} сонияда бажарилди
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center pt-1">
                      <div className="p-2 bg-background/50 rounded-lg border border-border/50">
                        <div className="text-xs font-bold text-foreground">{lastSyncResult.leads}</div>
                        <div className="text-[10px] text-muted-foreground">Битимлар</div>
                      </div>
                      <div className="p-2 bg-background/50 rounded-lg border border-border/50">
                        <div className="text-xs font-bold text-foreground">{lastSyncResult.contacts}</div>
                        <div className="text-[10px] text-muted-foreground">Контактлар</div>
                      </div>
                      <div className="p-2 bg-background/50 rounded-lg border border-border/50">
                        <div className="text-xs font-bold text-foreground">{lastSyncResult.managers}</div>
                        <div className="text-[10px] text-muted-foreground">Менежерлар</div>
                      </div>
                      <div className="p-2 bg-background/50 rounded-lg border border-border/50">
                        <div className="text-xs font-bold text-foreground">{lastSyncResult.pipelines}</div>
                        <div className="text-[10px] text-muted-foreground">Воронкалар</div>
                      </div>
                      <div className="p-2 bg-background/50 rounded-lg border border-border/50">
                        <div className="text-xs font-bold text-foreground">{lastSyncResult.calls}</div>
                        <div className="text-[10px] text-muted-foreground">Қўнғироқлар</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* If Disconnected: Connection Form with Tabs */
              <div className="space-y-4 pt-1">
                {/* Mode Selector Tabs */}
                <div className="flex bg-muted/40 p-1 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setConnectTab('token')}
                    className={cn(
                      'flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
                      connectTab === 'token'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Key size={13} />
                    ⚡ Долгосрочный токен (1 дақиқада)
                    <span className="hidden sm:inline-block text-[9px] bg-amber-400 text-black px-1.5 py-0.2 rounded font-bold ml-1">
                      Осон
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectTab('oauth')}
                    className={cn(
                      'flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5',
                      connectTab === 'oauth'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Globe size={13} />
                    🔗 OAuth 2.0 (Автоматик)
                  </button>
                </div>

                {/* Tab 1: Direct Long-Lived Token Form */}
                {connectTab === 'token' ? (
                  <form onSubmit={handleConnectToken} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                        <span>amoCRM Домен / Субдомени</span>
                        <span className="text-[10px] text-muted-foreground font-normal lowercase">
                          намуна: mycompany.amocrm.ru
                        </span>
                      </label>
                      <input
                        type="text"
                        placeholder="masalan: mycompany.amocrm.ru"
                        value={amoDomain}
                        onChange={(e) => setAmoDomain(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                          amoCRM Долгосрочный токен (API калити)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowInstructions(!showInstructions)}
                          className="text-[11px] text-primary hover:underline flex items-center gap-0.5"
                        >
                          <HelpCircle size={12} />
                          Токенни қаердан олиш мумкин?
                          {showInstructions ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6Im..."
                        value={amoToken}
                        onChange={(e) => setAmoToken(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all font-mono"
                      />
                    </div>

                    {/* Step-by-step guidance accordion */}
                    {showInstructions && (
                      <div className="p-4 bg-muted/40 border border-primary/20 rounded-2xl space-y-2.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="font-bold text-foreground flex items-center gap-1.5 text-primary">
                          <ShieldCheck size={14} />
                          amoCRM дан 1 дақиқада токен олиш қўлланмаси:
                        </div>
                        <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground leading-relaxed pl-1">
                          <li>
                            <strong className="text-foreground">amoCRM</strong> шахсий кабинeтингизга киринг.
                          </li>
                          <li>
                            Чап қуйи менюдан{' '}
                            <strong className="text-foreground">Настройки (Созламалар) ➔ Интеграции (Интеграциялар)</strong>{' '}
                            бўлимига ўтинг.
                          </li>
                          <li>
                            Ўнг юқоридаги{' '}
                            <strong className="text-foreground">«Создать интеграцию» (Интеграция яратиш)</strong>{' '}
                            тугмасини босинг.
                          </li>
                          <li>
                            Очилган ойнада{' '}
                            <strong className="text-foreground">«Ключи и доступы» (Калитлар ва рухсатлар)</strong>{' '}
                            варағига ўтинг.
                          </li>
                          <li>
                            <strong className="text-foreground">«Долгосрочный токен»</strong> остидаги калитни нусхалаб олиб, юқоридаги майдонга қўйинг.
                          </li>
                        </ol>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={connecting}
                      className="w-full py-3 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                    >
                      {connecting ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          amoCRM билан боғланмоқда...
                        </>
                      ) : (
                        <>
                          <Zap size={14} />
                          Улаш ва синовдан ўтказиш
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Tab 2: OAuth Form */
                  <form onSubmit={handleConnectOAuth} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        amoCRM Домени
                      </label>
                      <input
                        type="text"
                        placeholder="masalan: mycompany.amocrm.ru"
                        value={amoDomain}
                        onChange={(e) => setAmoDomain(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-input border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                      />
                      <p className="text-[11px] text-muted-foreground pt-0.5">
                        Тугмани босганингиздан сўнг, amoCRM рухсат бериш саҳифасига йўналтириласиз.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={connecting}
                      className="w-full py-3 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      <Globe size={14} />
                      {connecting ? 'Йўналтирилмоқда...' : 'amoCRM орқали уланиш (OAuth)'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions (Disconnect if connected) */}
          {amoStatus.status === 'CONNECTED' && (
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Интеграция муаммосиз ишламоқда
              </span>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="py-1.5 px-3 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 text-red-400 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5"
              >
                <XCircle size={13} />
                {disconnecting ? 'Узилмоқда...' : 'Интеграцияни узиш'}
              </button>
            </div>
          )}
        </div>

        {/* ─── OnlinePBX & Telephony CARD (4 cols on large screens) ─── */}
        <div className="lg:col-span-4 glass-card rounded-2xl p-6 border border-border space-y-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                  <PhoneCall size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-sm">OnlinePBX</h3>
                  <p className="text-xs text-muted-foreground">АТС ва қўнғироқлар ёзуви</p>
                </div>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border bg-blue-500/10 border-blue-500/20 text-blue-400">
                <Layers size={10} />
                Серверда
              </span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Суҳбатларни автоматик қабул қилиш ва аудио ёзувларни AI таҳлили учун юклаб олиш хизмати.
            </p>

            <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ҳолат:</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Тайёр (.env созланган)
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Аудио сақлаш:</span>
                <span className="text-foreground font-medium">MinIO / S3 Private Storage</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">STT Провайдер:</span>
                <span className="text-foreground font-medium">Aisha AI (ўзбек нутқи)</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Таҳлил AI:</span>
                <a
                  href="https://huggingface.co/NeuronUz/MustaqiLLM"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  🇺🇿 MustaqiLLM (NeuronAI)
                </a>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() =>
                toast.info('OnlinePBX вебҳуклари ва API калитлари сервер муҳити (.env) орқали уланган.')
              }
              className="w-full py-2.5 bg-secondary hover:opacity-90 text-foreground font-semibold rounded-xl text-xs transition-all border border-border flex items-center justify-center gap-1.5"
            >
              <ShieldCheck size={13} />
              Созламаларни кўриш
            </button>
          </div>
        </div>
      </div>

      {/* ─── MustaqiLLM Banner Card ─── */}
      <div className="glass-card rounded-2xl p-6 border border-primary/20 bg-gradient-to-br from-primary/5 to-violet-500/5">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-violet-500/20 border border-primary/30 flex items-center justify-center text-2xl shadow-md">
              🇺🇿
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-base">MustaqiLLM</h3>
                <span className="text-[10px] font-bold text-primary bg-primary/15 border border-primary/30 px-2 py-0.5 rounded-full">
                  NeuronAI Jamoasi
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Faol
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                O&#39;zbek tili uchun <strong className="text-foreground">noldan yaratilgan</strong> katta til modeli — tahlil AI sifatida faollashtirilgan
              </p>
            </div>
          </div>

          {/* Center: Stats */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: '5B', label: 'Parametrlar' },
              { value: '40B', label: 'Tokenlik dataset' },
              { value: '48K', label: 'BPE Tokenizer' },
              { value: 'GQA', label: 'Attention turi' },
            ].map((stat) => (
              <div key={stat.label} className="p-3 bg-background/50 border border-border/60 rounded-xl text-center">
                <div className="text-sm font-bold text-primary">{stat.value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Right: Action */}
          <div className="shrink-0">
            <a
              href="https://huggingface.co/NeuronUz/MustaqiLLM"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:opacity-90 text-primary-foreground font-semibold rounded-xl text-xs transition-all shadow-md"
            >
              <span>🤗</span>
              HuggingFace
            </a>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-start gap-2 p-3 bg-background/40 rounded-xl border border-border/50">
            <span className="text-lg">🎯</span>
            <div>
              <div className="font-semibold text-foreground mb-0.5">O&#39;zbek tiliga maxsus</div>
              <div className="text-muted-foreground leading-relaxed">
                QK-Normalization va Grouped-Query Attention bilan uzun kontekst uchun optimallashtirilgan
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-background/40 rounded-xl border border-border/50">
            <span className="text-lg">🔒</span>
            <div>
              <div className="font-semibold text-foreground mb-0.5">Ma&#39;lumotlar xavfsizligi</div>
              <div className="text-muted-foreground leading-relaxed">
                Lokal AI ekotizimi — qo&#39;ng&#39;iroq ma&#39;lumotlari uchinchi tomon serverlariga uzatilmaydi
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-background/40 rounded-xl border border-border/50">
            <span className="text-lg">🚀</span>
            <div>
              <div className="font-semibold text-foreground mb-0.5">Mustaqil infrastruktura</div>
              <div className="text-muted-foreground leading-relaxed">
                O&#39;z tilimiz va ma&#39;lumotlarimiz bilan ishlaydigan strategik AI texnologiyasi
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
