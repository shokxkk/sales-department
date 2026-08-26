'use client'

import { useEffect, useState, useCallback } from 'react'
import { Phone, Search, RefreshCw, Play, BarChart2, MicOff, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatDuration, formatDateTime, ANALYSIS_STATUS_LABELS, CALL_DIRECTION_LABELS } from '@/lib/utils'

interface Call {
  id: string
  externalCallId: string
  telephonyProvider: string
  direction: 'INBOUND' | 'OUTBOUND'
  customerPhone: string
  talkDurationSeconds: number
  startedAt: string
  analysisStatus: string
  aiScore?: number
  externalRecordingUrl?: string | null
  manager?: { name: string }
  customer?: { name: string }
  deal?: { name: string }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

type SourceFilter = 'ALL' | 'ONLINEPBX' | 'AMOCRM'

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL')
  // Default: show only answered calls (had real conversation)
  const [onlyAnswered, setOnlyAnswered] = useState(true)
  const [activeAudioCall, setActiveAudioCall] = useState<Call | null>(null)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

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

  const fetchCalls = useCallback((page = 1) => {
    if (!companyId) return
    setLoading(true)
    setError(null)

    const params = new URLSearchParams({
      page: String(page),
      limit: '50',
      ...(onlyAnswered && { onlyAnswered: 'true' }),
      ...(sourceFilter !== 'ALL' && { telephonyProvider: sourceFilter }),
      ...(searchTerm && { search: searchTerm }),
    })

    fetch(`/api/${companyId}/calls?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error('Маълумотларни юклаб бўлмади')
        return r.json()
      })
      .then((d) => {
        if (d.success) {
          setCalls(d.data || [])
          setPagination(d.pagination)
          setCurrentPage(page)
        } else {
          setError(d.error || 'Хатолик юз берди')
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [companyId, onlyAnswered, sourceFilter, searchTerm])

  useEffect(() => {
    if (companyId) fetchCalls(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, onlyAnswered, sourceFilter])

  // Search with debounce
  useEffect(() => {
    if (!companyId) return
    const t = setTimeout(() => fetchCalls(1), 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  const handleAnalyze = async (callId: string) => {
    if (!companyId || analyzingId) return
    setAnalyzingId(callId)
    try {
      const res = await fetch(`/api/${companyId}/calls/${callId}/analyze`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setCalls((prev) =>
          prev.map((c) => (c.id === callId ? { ...c, analysisStatus: 'QUEUED' } : c))
        )
      } else {
        alert(data.error || 'Таҳлилга юбориш хатоси')
      }
    } catch {
      alert('Сервер билан алоқа йўқ')
    } finally {
      setAnalyzingId(null)
    }
  }

  const sourceButtons: { key: SourceFilter; label: string }[] = [
    { key: 'ALL', label: 'Барчаси' },
    { key: 'AMOCRM', label: 'amoCRM' },
    { key: 'ONLINEPBX', label: 'OnlinePBX' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Қўнғироқлар</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Жами: <span className="text-foreground font-semibold">{pagination.total.toLocaleString()}</span> та қўнғироқ
          </p>
        </div>
        <button
          onClick={() => fetchCalls(currentPage)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 text-sm font-medium transition-all"
        >
          <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          Янгилаш
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="flex items-center gap-3 flex-1 min-w-[200px] bg-card border border-border rounded-xl px-3 py-2">
          <Search size={16} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Телефон ёки исм бўйича қидириш..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {/* Only answered toggle */}
        <button
          onClick={() => setOnlyAnswered((v) => !v)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all',
            onlyAnswered
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-card border-border text-muted-foreground hover:text-foreground'
          )}
        >
          <Phone size={14} />
          {onlyAnswered ? '✓ Фақат гaplashilganlar' : 'Барча статуслар'}
        </button>

        {/* Source filter */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
          {sourceButtons.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSourceFilter(key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                sourceFilter === key
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 text-center border-red-500/20">
          <p className="text-red-400 font-medium">{error}</p>
          <button
            onClick={() => fetchCalls(currentPage)}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-all"
          >
            Қайта уриниш
          </button>
        </div>
      ) : calls.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
          <Phone className="mx-auto text-muted-foreground/30 mb-3" size={40} />
          <p className="font-medium text-foreground">Қўнғироқлар топилмади</p>
          <p className="text-sm mt-1">
            {onlyAnswered ? 'Гaplashilgan қўнғироқлар йўқ. Барча статусларни кўриш учун фильтрни ўзгартиринг.' : 'Синхронланган қўнғироқлар йўқ.'}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto glass-card rounded-2xl border border-border">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="p-4 font-semibold">Сана</th>
                  <th className="p-4 font-semibold">Мижоз</th>
                  <th className="p-4 font-semibold">Менежер</th>
                  <th className="p-4 font-semibold">Йўналиш</th>
                  <th className="p-4 font-semibold">Давомийлиги</th>
                  <th className="p-4 font-semibold">Манба</th>
                  <th className="p-4 font-semibold">Ҳолат</th>
                  <th className="p-4 font-semibold">Баҳо</th>
                  <th className="p-4 font-semibold">Амаллар</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {calls.map((call) => {
                  const hasRecording = call.analysisStatus !== 'NO_RECORDING'
                  const canAnalyze = hasRecording && call.analysisStatus === 'NOT_SELECTED'

                  return (
                    <tr key={call.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium text-sm">{formatDateTime(call.startedAt)}</td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-foreground">{call.customer?.name || 'Номаълум'}</p>
                          <p className="text-xs text-muted-foreground">{call.customerPhone}</p>
                        </div>
                      </td>
                      <td className="p-4 text-foreground">{call.manager?.name || 'Номаълум'}</td>
                      <td className="p-4">
                        <span className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full border',
                          call.direction === 'INBOUND' ? 'badge-info' : 'badge-success'
                        )}>
                          {CALL_DIRECTION_LABELS[call.direction]}
                        </span>
                      </td>
                      <td className="p-4 text-foreground font-medium">{formatDuration(call.talkDurationSeconds)}</td>
                      <td className="p-4">
                        <span className={cn(
                          'text-xs font-semibold px-2 py-0.5 rounded-full border',
                          call.telephonyProvider === 'AMOCRM'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        )}>
                          {call.telephonyProvider === 'AMOCRM' ? 'amoCRM' : 'OnlinePBX'}
                        </span>
                      </td>
                      <td className="p-4">
                        {call.analysisStatus === 'NO_RECORDING' ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                            <MicOff size={12} />
                            Ёзув йўқ
                          </span>
                        ) : (
                          <span className={cn(
                            'text-xs font-semibold px-2 py-0.5 rounded-full border',
                            call.analysisStatus === 'COMPLETED' ? 'badge-success' :
                            call.analysisStatus === 'ERROR' ? 'badge-error' :
                            call.analysisStatus === 'QUEUED' || call.analysisStatus === 'DOWNLOADING' ||
                            call.analysisStatus === 'TRANSCRIBING' || call.analysisStatus === 'ANALYZING'
                              ? 'badge-info' : 'badge-warning'
                          )}>
                            {ANALYSIS_STATUS_LABELS[call.analysisStatus] || call.analysisStatus}
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-bold text-foreground">
                        {call.aiScore !== undefined && call.aiScore !== null
                          ? `${call.aiScore}/${call.aiScore <= 14 ? 14 : 100}`
                          : '—'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => hasRecording && setActiveAudioCall(call)}
                            disabled={!hasRecording}
                            title={hasRecording ? 'Тинглаш' : 'Ёзув йўқ'}
                            className={cn(
                              'p-2 rounded-lg transition-all',
                              hasRecording
                                ? 'bg-primary/10 hover:bg-primary/20 text-primary'
                                : 'bg-muted/30 text-muted-foreground/40 cursor-not-allowed'
                            )}
                          >
                            <Play size={14} />
                          </button>
                          <button
                            onClick={() => canAnalyze && handleAnalyze(call.id)}
                            disabled={!canAnalyze || analyzingId === call.id}
                            title={
                              !hasRecording ? 'Ёзув йўқ' :
                              !canAnalyze ? 'Таҳлил аллақачон бошланган' :
                              'AI таҳлил бошлаш'
                            }
                            className={cn(
                              'p-2 rounded-lg transition-all',
                              canAnalyze && analyzingId !== call.id
                                ? 'bg-violet-500/10 hover:bg-violet-500/20 text-violet-400'
                                : 'bg-muted/30 text-muted-foreground/40 cursor-not-allowed'
                            )}
                          >
                            <BarChart2 size={14} className={analyzingId === call.id ? 'animate-pulse' : ''} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Footer stats */}
            <div className="p-3 border-t border-border text-xs text-muted-foreground flex justify-between items-center bg-muted/10">
              <span>
                {pagination.page}-саҳифа, {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total.toLocaleString()} та
              </span>
              <span>
                amoCRM: {calls.filter(c => c.telephonyProvider === 'AMOCRM').length} | OnlinePBX: {calls.filter(c => c.telephonyProvider === 'ONLINEPBX').length}
              </span>
            </div>
          </div>

          {/* Pagination controls */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => fetchCalls(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="p-2 rounded-xl bg-card border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page numbers */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(pagination.pages, 7) }).map((_, i) => {
                  let pageNum: number
                  const total = pagination.pages
                  if (total <= 7) {
                    pageNum = i + 1
                  } else if (currentPage <= 4) {
                    pageNum = i + 1
                    if (i === 6) pageNum = total
                    if (i === 5) pageNum = -1 // ellipsis
                  } else if (currentPage >= total - 3) {
                    if (i === 0) pageNum = 1
                    else if (i === 1) pageNum = -1
                    else pageNum = total - (6 - i)
                  } else {
                    if (i === 0) pageNum = 1
                    else if (i === 1 || i === 5) pageNum = -1
                    else pageNum = currentPage + (i - 3)
                    if (i === 6) pageNum = total
                  }

                  if (pageNum === -1) {
                    return <span key={i} className="px-2 text-muted-foreground">…</span>
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => fetchCalls(pageNum)}
                      disabled={loading}
                      className={cn(
                        'w-9 h-9 rounded-xl text-sm font-semibold transition-all border',
                        pageNum === currentPage
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border hover:bg-muted text-foreground'
                      )}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => fetchCalls(currentPage + 1)}
                disabled={currentPage >= pagination.pages || loading}
                className="p-2 rounded-xl bg-card border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Audio player */}
      {activeAudioCall && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-card/95 border border-border p-4 rounded-2xl shadow-xl flex flex-col gap-2 z-50 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-foreground">Аудио эшитиш</p>
              <p className="text-[10px] text-muted-foreground">
                {activeAudioCall.customerPhone} · {formatDuration(activeAudioCall.talkDurationSeconds)}
              </p>
            </div>
            <button
              onClick={() => setActiveAudioCall(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              ✕ Ёпиш
            </button>
          </div>
          <audio
            controls
            autoPlay
            src={
              activeAudioCall.telephonyProvider === 'AMOCRM' && activeAudioCall.externalRecordingUrl
                ? activeAudioCall.externalRecordingUrl
                : `/api/${companyId}/calls/${activeAudioCall.id}/audio`
            }
            className="w-full h-8"
          />
        </div>
      )}
    </div>
  )
}
