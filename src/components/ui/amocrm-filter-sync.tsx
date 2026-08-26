'use client'

import { useState, useEffect } from 'react'
import {
  Filter,
  Calendar as CalendarIcon,
  User,
  RefreshCw,
  Zap,
  Check,
  X,
  ChevronDown,
  Clock,
  Mic,
  PhoneCall,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AMOCRM_DATE_PRESETS,
  DatePresetKey,
  getPresetDateRange,
} from '@/lib/date-presets'
import { toast } from 'sonner'

export type CallStatusOption =
  | 'talked'       // Разговор (call_status 4, ANSWERED)
  | 'no_answer'    // Не дозвонился (call_status 6, NO_ANSWER)
  | 'busy'         // Занят (call_status 7, BUSY)
  | 'not_available' // Не на месте (call_status 3, MISSED)
  | 'call_back'    // Перезвонить (call_status 2, MISSED)
  | 'left_message' // Оставил сообщение (call_status 1, MISSED)
  | 'wrong_number' // Неверный номер (call_status 5, FAILED)
  | 'unknown'      // Неизвестный

export const CALL_STATUS_OPTIONS: { id: CallStatusOption; label: string; dbStatus?: string }[] = [
  { id: 'talked', label: 'Разговор', dbStatus: 'ANSWERED' },
  { id: 'no_answer', label: 'Не дозвонился', dbStatus: 'NO_ANSWER' },
  { id: 'busy', label: 'Занят', dbStatus: 'BUSY' },
  { id: 'not_available', label: 'Не на месте', dbStatus: 'MISSED' },
  { id: 'call_back', label: 'Перезвонить', dbStatus: 'MISSED' },
  { id: 'left_message', label: 'Оставил сообщение', dbStatus: 'MISSED' },
  { id: 'wrong_number', label: 'Неверный номер', dbStatus: 'FAILED' },
  { id: 'unknown', label: 'Неизвестный' },
]

export interface AmoCRMFilterState {
  managerId: string
  preset: DatePresetKey
  customDateFrom: string
  customDateTo: string
  dateFrom: string | null
  dateTo: string | null
  allEntities: boolean
  entityType?: 'all' | 'leads' | 'contacts' | 'companies' | 'customers'
  minDuration?: number
  maxDuration?: number
  callStatuses: CallStatusOption[]
  hasRecordingOnly: boolean
}

interface ManagerItem {
  id: string
  name: string
  crmId?: string
}

interface AmoCRMFilterSyncProps {
  companyId: string
  onApplyFilter?: (filter: AmoCRMFilterState) => void
  onSyncComplete?: (result: any) => void
  className?: string
  showSyncButton?: boolean
  initialFilter?: Partial<AmoCRMFilterState>
}

export function AmoCRMFilterSync({
  companyId,
  onApplyFilter,
  onSyncComplete,
  className,
  showSyncButton = true,
  initialFilter,
}: AmoCRMFilterSyncProps) {
  const [managers, setManagers] = useState<ManagerItem[]>([])
  const [selectedManager, setSelectedManager] = useState(initialFilter?.managerId || '')
  const [selectedPreset, setSelectedPreset] = useState<DatePresetKey>(initialFilter?.preset || 'last_30_days')
  const [customFrom, setCustomFrom] = useState(initialFilter?.customDateFrom || '')
  const [customTo, setCustomTo] = useState(initialFilter?.customDateTo || '')

  // amoCRM Filter specifics matching screenshot
  const [allEntities, setAllEntities] = useState(initialFilter?.allEntities ?? true)
  const [entityType, setEntityType] = useState<'all' | 'leads' | 'contacts' | 'companies' | 'customers'>(
    initialFilter?.entityType || 'all'
  )
  const [minDuration, setMinDuration] = useState<string>(
    initialFilter?.minDuration !== undefined ? String(initialFilter.minDuration) : ''
  )
  const [maxDuration, setMaxDuration] = useState<string>(
    initialFilter?.maxDuration !== undefined ? String(initialFilter.maxDuration) : ''
  )
  const [selectedStatuses, setSelectedStatuses] = useState<CallStatusOption[]>(
    initialFilter?.callStatuses || ['talked', 'no_answer', 'busy', 'not_available', 'call_back', 'left_message', 'wrong_number', 'unknown']
  )
  const [hasRecordingOnly, setHasRecordingOnly] = useState(initialFilter?.hasRecordingOnly ?? false)

  const [isSyncing, setIsSyncing] = useState(false)
  const [showCustomInputs, setShowCustomInputs] = useState(selectedPreset === 'custom')
  const [showPresetDropdown, setShowPresetDropdown] = useState(false)

  useEffect(() => {
    if (!companyId) return
    fetch(`/api/${companyId}/filters`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.managers) {
          setManagers(d.data.managers)
        }
      })
      .catch(() => null)
  }, [companyId])

  const handleSelectPreset = (preset: DatePresetKey) => {
    setSelectedPreset(preset)
    if (preset === 'custom') {
      setShowCustomInputs(true)
    } else {
      setShowCustomInputs(false)
    }
    setShowPresetDropdown(false)
  }

  const toggleAllStatuses = () => {
    if (selectedStatuses.length === CALL_STATUS_OPTIONS.length) {
      setSelectedStatuses([])
    } else {
      setSelectedStatuses(CALL_STATUS_OPTIONS.map((o) => o.id))
    }
  }

  const toggleStatus = (id: CallStatusOption) => {
    if (selectedStatuses.includes(id)) {
      setSelectedStatuses(selectedStatuses.filter((s) => s !== id))
    } else {
      setSelectedStatuses([...selectedStatuses, id])
    }
  }

  const getCurrentFilterState = (): AmoCRMFilterState => {
    const { dateFrom, dateTo } = getPresetDateRange(selectedPreset, customFrom, customTo)
    return {
      managerId: selectedManager,
      preset: selectedPreset,
      customDateFrom: customFrom,
      customDateTo: customTo,
      dateFrom,
      dateTo,
      allEntities,
      entityType,
      minDuration: minDuration ? parseInt(minDuration, 10) : undefined,
      maxDuration: maxDuration ? parseInt(maxDuration, 10) : undefined,
      callStatuses: selectedStatuses,
      hasRecordingOnly,
    }
  }

  const handleApply = () => {
    const state = getCurrentFilterState()
    if (onApplyFilter) {
      onApplyFilter(state)
    }
  }

  const handleSyncFromAmoCRM = async () => {
    if (!companyId) return
    setIsSyncing(true)
    const { dateFrom, dateTo } = getPresetDateRange(selectedPreset, customFrom, customTo)

    const selectedManagerObj = managers.find((m) => m.id === selectedManager)
    const managerName = selectedManagerObj ? selectedManagerObj.name : 'Барча менежерлар'
    const presetObj = AMOCRM_DATE_PRESETS.find((p) => p.id === selectedPreset)
    const periodName = presetObj ? presetObj.labelRu : selectedPreset === 'custom' ? 'Танланган давр' : '30 кун'

    const toastId = toast.loading(
      `amoCRM билан синхронизация: [${managerName}] · [${periodName}]...`
    )

    try {
      const res = await fetch(`/api/${companyId}/integrations/amocrm/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'custom',
          managerId: selectedManager || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(
          data.message || `Синхронизация якунланди! (${data.totalSynced || 0} та маълумот янгиланди)`,
          { id: toastId }
        )
        if (onSyncComplete) {
          onSyncComplete(data)
        }
        // Also apply filter locally
        handleApply()
      } else {
        toast.error(data.error || 'Синхронизацияда хатолик юз берди', { id: toastId })
      }
    } catch (err: any) {
      toast.error(err.message || 'Сервер билан алоқада хатолик', { id: toastId })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleReset = () => {
    setSelectedManager('')
    setSelectedPreset('all_time')
    setCustomFrom('')
    setCustomTo('')
    setShowCustomInputs(false)
    setAllEntities(true)
    setEntityType('all')
    setMinDuration('')
    setMaxDuration('')
    setSelectedStatuses(CALL_STATUS_OPTIONS.map((o) => o.id))
    setHasRecordingOnly(false)

    if (onApplyFilter) {
      onApplyFilter({
        managerId: '',
        preset: 'all_time',
        customDateFrom: '',
        customDateTo: '',
        dateFrom: null,
        dateTo: null,
        allEntities: true,
        entityType: 'all',
        minDuration: undefined,
        maxDuration: undefined,
        callStatuses: CALL_STATUS_OPTIONS.map((o) => o.id),
        hasRecordingOnly: false,
      })
    }
  }

  const activePresetLabel =
    AMOCRM_DATE_PRESETS.find((p) => p.id === selectedPreset)?.labelRu ||
    (selectedPreset === 'custom' ? 'Календарь (Дата/Время)' : 'За все время')

  return (
    <div
      className={cn(
        'w-full max-w-[320px] bg-[#0c1524] text-slate-200 border border-slate-700/80 rounded-2xl p-4 shadow-2xl font-sans space-y-3.5',
        className
      )}
    >
      {/* Header — matches amoCRM style exactly */}
      <div className="flex items-center justify-between border-b border-slate-700/70 pb-2.5">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-cyan-400" />
          <span className="text-xs font-black tracking-widest uppercase text-white">
            ФИЛЬТР
          </span>
        </div>
        <button
          onClick={handleReset}
          className="text-[10px] text-slate-400 hover:text-cyan-300 transition-colors"
        >
          Сбросить
        </button>
      </div>

      {/* 1. Date Presets Selector */}
      <div className="space-y-1">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPresetDropdown(!showPresetDropdown)}
            className="w-full flex items-center justify-between bg-[#132034] border border-slate-700 hover:border-slate-600 text-xs text-white rounded-xl px-3 py-2 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CalendarIcon size={13} className="text-cyan-400" />
              <span>{activePresetLabel}</span>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showPresetDropdown && (
            <div className="absolute z-50 mt-1 w-full bg-[#101b2c] border border-slate-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-800/80 max-h-60 overflow-y-auto">
              <button
                type="button"
                onClick={() => handleSelectPreset('custom')}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-all',
                  selectedPreset === 'custom'
                    ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/50'
                )}
              >
                <span>Календарь (Календар бўйича танлаш)</span>
                {selectedPreset === 'custom' && <Check size={13} className="text-cyan-400" />}
              </button>
              {AMOCRM_DATE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-all',
                    selectedPreset === preset.id
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                  )}
                >
                  <span>{preset.labelRu}</span>
                  {selectedPreset === preset.id && <Check size={13} className="text-cyan-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Custom Date Inputs */}
        {showCustomInputs && (
          <div className="p-2.5 bg-[#0a121e] rounded-xl space-y-2 border border-slate-700/80 mt-1">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-medium">От:</span>
              <input
                type="datetime-local"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full bg-[#132034] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-medium">До:</span>
              <input
                type="datetime-local"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full bg-[#132034] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Entities Filter (Все сущности) */}
      <div className="space-y-1">
        <label
          onClick={() => setAllEntities(!allEntities)}
          className="flex items-center gap-2 cursor-pointer bg-[#132034] border border-slate-700/80 hover:border-slate-600 rounded-xl px-3 py-2 text-xs text-slate-200 select-none"
        >
          <input
            type="checkbox"
            checked={allEntities}
            onChange={() => setAllEntities(!allEntities)}
            className="w-3.5 h-3.5 rounded border-slate-600 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-[#0c1524] cursor-pointer"
          />
          <span className="font-semibold text-white">Все сущности</span>
        </label>
      </div>

      {/* 3. Manager Selector */}
      <div className="space-y-1">
        <div className="relative">
          <select
            value={selectedManager}
            onChange={(e) => setSelectedManager(e.target.value)}
            className="w-full bg-[#132034] border border-slate-700 text-xs text-white rounded-xl px-3 py-2 appearance-none focus:outline-none focus:border-cyan-400 transition-colors pr-8"
          >
            <option value="">Менеджеры (Все менеджеры)</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>
      </div>

      {/* 4. Call Duration (Продолжительность звонка) */}
      <div className="space-y-1">
        <span className="text-[11px] font-medium text-slate-400">Продолжительность звонка (сек)</span>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="От"
            value={minDuration}
            onChange={(e) => setMinDuration(e.target.value)}
            className="w-full bg-[#132034] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
          <input
            type="number"
            placeholder="До"
            value={maxDuration}
            onChange={(e) => setMaxDuration(e.target.value)}
            className="w-full bg-[#132034] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* 5. Call Statuses (Статус звонка) */}
      <div className="space-y-1">
        <span className="text-[11px] font-medium text-slate-400">Статус звонка</span>
        <div className="border border-slate-700/80 rounded-xl overflow-hidden bg-[#101b2c] p-2 space-y-1.5">
          {/* Select all / Deselect all */}
          <div
            onClick={toggleAllStatuses}
            className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-cyan-400 hover:text-cyan-300 pb-1.5 border-b border-slate-800/80 select-none"
          >
            <input
              type="checkbox"
              checked={selectedStatuses.length === CALL_STATUS_OPTIONS.length}
              onChange={toggleAllStatuses}
              className="w-3.5 h-3.5 rounded border-slate-600 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-[#0c1524] cursor-pointer"
            />
            <span>
              {selectedStatuses.length === CALL_STATUS_OPTIONS.length
                ? 'Снять выделение'
                : 'Выбрать все'}
            </span>
          </div>

          {/* Status Checkboxes */}
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {CALL_STATUS_OPTIONS.map((st) => {
              const isChecked = selectedStatuses.includes(st.id)
              return (
                <label
                  key={st.id}
                  className="flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer select-none py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleStatus(st.id)}
                    className="w-3.5 h-3.5 rounded border-slate-600 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-[#0c1524] cursor-pointer"
                  />
                  <span>{st.label}</span>
                </label>
              )
            })}
          </div>
        </div>
      </div>

      {/* 6. Audio recording only toggle */}
      <div className="pt-1">
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 hover:text-white select-none">
          <input
            type="checkbox"
            checked={hasRecordingOnly}
            onChange={(e) => setHasRecordingOnly(e.target.checked)}
            className="w-3.5 h-3.5 rounded border-slate-600 text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-[#0c1524] cursor-pointer"
          />
          <Mic size={13} className="text-cyan-400" />
          <span>Только с аудиозаписью</span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2 border-t border-slate-700/70">
        {showSyncButton && (
          <button
            type="button"
            onClick={handleSyncFromAmoCRM}
            disabled={isSyncing}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
          >
            {isSyncing ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Zap size={14} className="fill-white" />
            )}
            {isSyncing ? 'Синхронланмоқда...' : 'amoCRM дан синхронлаш'}
          </button>
        )}

        <button
          type="button"
          onClick={handleApply}
          className="w-full py-2 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md"
        >
          <Check size={14} />
          Применить фильтр
        </button>
      </div>
    </div>
  )
}
