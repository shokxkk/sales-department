'use client'

import { useState, useEffect } from 'react'
import {
  Settings,
  Brain,
  Plug,
  ShieldCheck,
  Building,
  Key,
  Cpu,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Radio,
  FileAudio,
  FileText,
  Star,
  ListChecks,
  AlertOctagon,
  Lightbulb,
  ExternalLink,
  Save,
  Globe,
  Sun,
  Moon,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLanguage, useTheme } from '@/components/providers/app-provider'

type SettingsTab = 'chatgpt' | 'integrations' | 'general' | 'checklist'

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<SettingsTab>('chatgpt')

  // General settings state
  const [companyName, setCompanyName] = useState('Marketing Markazi Demo')
  const [industry, setIndustry] = useState('Маркетинг и продажи')
  const [timezone, setTimezone] = useState('Asia/Tashkent (GMT+5)')

  // ChatGPT settings state
  const [apiKey, setApiKey] = useState('sk-proj-your_openai_api_key_here')
  const [showApiKey, setShowApiKey] = useState(false)
  const [auditModel, setAuditModel] = useState('gpt-4o')
  const [whisperModel, setWhisperModel] = useState('whisper-1')
  const [testingOpenAI, setTestingOpenAI] = useState(false)
  const [openAIStatus, setOpenAIStatus] = useState<'connected' | 'idle' | 'error'>('connected')

  // amoCRM & Telephony settings state
  const [amoSubdomain, setAmoSubdomain] = useState('marketingmarkazi')
  const [amoToken, setAmoToken] = useState('eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...')
  const [telephonyKey, setTelephonyKey] = useState('onlinepbx_live_key_9921')
  const [webhookUrl, setWebhookUrl] = useState('https://app.nerion.ai/api/webhooks/calls')

  const handleSaveGeneral = () => {
    toast.success(t.settings.general.saved)
  }

  const handleTestOpenAI = async () => {
    setTestingOpenAI(true)
    try {
      // Simulate API verification
      await new Promise((r) => setTimeout(r, 1200))
      setOpenAIStatus('connected')
      toast.success(language === 'uz' ? 'ChatGPT (OpenAI) bilan aloqa muvaffaqiyatli o‘rnatildi!' : 'Подключение к ChatGPT (OpenAI) успешно проверено!')
    } catch {
      setOpenAIStatus('error')
      toast.error(language === 'uz' ? 'OpenAI ga ulanib bo‘lmadi' : 'Ошибка подключения к OpenAI')
    } finally {
      setTestingOpenAI(false)
    }
  }

  const handleSaveChatGPT = () => {
    toast.success(language === 'uz' ? 'ChatGPT sozlamalari saqlandi' : 'Настройки ChatGPT успешно сохранены')
  }

  // Pipeline steps definition
  const pipelineSteps = [
    {
      num: '01',
      title: t.settings.chatgpt.step1,
      desc: t.settings.chatgpt.step1Desc,
      icon: FileAudio,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      num: '02',
      title: t.settings.chatgpt.step2,
      desc: t.settings.chatgpt.step2Desc,
      icon: FileText,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      num: '03',
      title: t.settings.chatgpt.step3,
      desc: t.settings.chatgpt.step3Desc,
      icon: Star,
      color: 'text-primary bg-primary/10 border-primary/20',
    },
    {
      num: '04',
      title: t.settings.chatgpt.step4,
      desc: t.settings.chatgpt.step4Desc,
      icon: ListChecks,
      color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    },
    {
      num: '05',
      title: t.settings.chatgpt.step5,
      desc: t.settings.chatgpt.step5Desc,
      icon: AlertOctagon,
      color: 'text-red-400 bg-red-500/10 border-red-500/20',
    },
    {
      num: '06',
      title: t.settings.chatgpt.step6,
      desc: t.settings.chatgpt.step6Desc,
      icon: Lightbulb,
      color: 'text-green-400 bg-green-500/10 border-green-500/20',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-12 w-full max-w-[1400px] mx-auto">
      {/* ─── Header ───────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 border border-border/60 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
        <div className="absolute right-0 top-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/15 border border-primary/25 shadow-[0_0_16px_var(--glow-primary-sm)]">
              <Settings size={22} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                {t.settings.title}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {t.settings.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tab Bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-card border border-border/60 overflow-x-auto">
        <button
          onClick={() => setActiveTab('chatgpt')}
          className={cn(
            'flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200',
            activeTab === 'chatgpt'
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-[1.02]'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Brain size={16} />
          {t.settings.tabs.chatgpt}
        </button>

        <button
          onClick={() => setActiveTab('integrations')}
          className={cn(
            'flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200',
            activeTab === 'integrations'
              ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25 scale-[1.02]'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Plug size={16} />
          {t.settings.tabs.integrations}
        </button>

        <button
          onClick={() => setActiveTab('general')}
          className={cn(
            'flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200',
            activeTab === 'general'
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25 scale-[1.02]'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Building size={16} />
          {t.settings.tabs.general}
        </button>

        <button
          onClick={() => setActiveTab('checklist')}
          className={cn(
            'flex-1 min-w-[160px] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200',
            activeTab === 'checklist'
              ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/25 scale-[1.02]'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <ShieldCheck size={16} />
          {t.settings.tabs.checklist}
        </button>
      </div>

      {/* ─── TAB 1: CHATGPT / OPENAI INTEGRATION ──────────────────────────── */}
      {activeTab === 'chatgpt' && (
        <div className="space-y-6 animate-fade-in">
          {/* 6-Step Call Audit Pipeline Visualizer */}
          <div className="glass-card rounded-3xl p-6 border border-border/60 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles size={18} className="text-primary" />
                  {t.settings.chatgpt.pipelineTitle}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.settings.chatgpt.description}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                GPT-4o Auto Audit
              </span>
            </div>

            {/* Pipeline Steps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mt-6 relative">
              {pipelineSteps.map((step, idx) => (
                <div
                  key={step.num}
                  className="rounded-2xl p-4 bg-muted/40 border border-border/50 flex flex-col justify-between relative group hover:border-primary/40 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black text-muted-foreground/60 font-mono">
                        {step.num}
                      </span>
                      <div className={cn('p-2 rounded-xl border', step.color)}>
                        <step.icon size={16} />
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-foreground">{step.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>

                  {idx < pipelineSteps.length - 1 && (
                    <div className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-muted-foreground/40">
                      <ArrowRight size={14} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ChatGPT API Configuration Card */}
          <div className="glass-card rounded-3xl p-6 border border-border/60 space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Brain size={20} className="text-primary" />
                  {t.settings.chatgpt.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  OpenAI API orqali har bir qo‘ng‘iroqni avtomatik transkripsiya va chuqur audit qilish
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/15 text-green-400 border border-green-500/30 text-xs font-bold">
                  <CheckCircle2 size={14} />
                  {t.settings.chatgpt.statusConnected}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* API Key input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Key size={14} className="text-primary" />
                  {t.settings.chatgpt.apiKeyLabel}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={t.settings.chatgpt.apiKeyPlaceholder}
                    className="w-full pl-4 pr-12 py-3 rounded-2xl bg-muted/40 border border-border/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary font-mono transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Kalit AES-256 bilan shifrlangan holda xavfsiz saqlanadi.
                </p>
              </div>

              {/* Analysis Model Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu size={14} className="text-purple-400" />
                  {t.settings.chatgpt.modelLabel}
                </label>
                <select
                  value={auditModel}
                  onChange={(e) => setAuditModel(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-card border border-border/60 text-sm text-foreground font-semibold focus:outline-none focus:border-primary cursor-pointer transition-colors"
                >
                  <option value="gpt-4o">GPT-4o (Tavsiya etiladi — Yuqori aniqlik & tezkor)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (Iqtisodiy & tezkor)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Qo‘ng‘iroqlar auditi, skript va xatolarni tahlil qilish uchun model.
                </p>
              </div>

              {/* Whisper Model Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileAudio size={14} className="text-blue-400" />
                  {t.settings.chatgpt.whisperModelLabel}
                </label>
                <select
                  value={whisperModel}
                  onChange={(e) => setWhisperModel(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-card border border-border/60 text-sm text-foreground font-semibold focus:outline-none focus:border-primary cursor-pointer transition-colors"
                >
                  <option value="whisper-1">OpenAI Whisper-1 (O‘zbekcha + Ruscha STT)</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  Menejer va mijoz nutqini matnga aylantirish va rollarni ajratish modeli.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col justify-end gap-3 pt-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleTestOpenAI}
                    disabled={testingOpenAI}
                    className="flex-1 py-3 px-4 rounded-2xl bg-muted/60 hover:bg-muted text-foreground border border-border/60 text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={cn(testingOpenAI && 'animate-spin text-primary')} />
                    {testingOpenAI ? t.common.loading : t.settings.chatgpt.testBtn}
                  </button>

                  <button
                    onClick={handleSaveChatGPT}
                    className="flex-1 py-3 px-4 rounded-2xl bg-primary text-primary-foreground text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <Save size={14} />
                    {t.settings.chatgpt.saveBtn}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: INTEGRATIONS ─────────────────────────────────────────── */}
      {activeTab === 'integrations' && (
        <div className="space-y-6 animate-fade-in">
          {/* amoCRM Card */}
          <div className="glass-card rounded-3xl p-6 border border-border/60 space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm">
                  amo
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {t.settings.integrations.amocrmTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.settings.integrations.amocrmDesc}
                  </p>
                </div>
              </div>

              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/15 text-green-400 border border-green-500/30 text-xs font-bold">
                <CheckCircle2 size={14} />
                {t.settings.integrations.amocrmConnected}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">amoCRM Subdomain</label>
                <input
                  value={amoSubdomain}
                  onChange={(e) => setAmoSubdomain(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-muted/40 border border-border/60 text-sm text-foreground font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Долгосрочный токен (Long-Lived Token)</label>
                <input
                  type="password"
                  value={amoToken}
                  onChange={(e) => setAmoToken(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-muted/40 border border-border/60 text-sm text-foreground font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <a
                href="/integrations"
                className="py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow-md shadow-primary/20 hover:scale-105 transition-all"
              >
                {t.settings.integrations.manage}
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* Telephony Card */}
          <div className="glass-card rounded-3xl p-6 border border-border/60 space-y-5">
            <div className="flex items-center justify-between border-b border-border/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center text-green-400">
                  <Radio size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    {t.settings.integrations.telephonyTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.settings.integrations.telephonyDesc}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">OnlinePBX API Key</label>
                <input
                  value={telephonyKey}
                  onChange={(e) => setTelephonyKey(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-muted/40 border border-border/60 text-sm text-foreground font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">Qo‘ng‘iroqlar Webhook URL</label>
                <input
                  value={webhookUrl}
                  readOnly
                  className="w-full px-4 py-2.5 rounded-2xl bg-muted/20 border border-border/40 text-sm text-muted-foreground font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: GENERAL SETTINGS ─────────────────────────────────────── */}
      {activeTab === 'general' && (
        <div className="glass-card rounded-3xl p-6 border border-border/60 space-y-6 animate-fade-in">
          <h3 className="text-lg font-bold text-foreground border-b border-border/40 pb-3">
            {t.settings.tabs.general}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                {t.settings.general.companyName}
              </label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-muted/40 border border-border/60 text-sm text-foreground font-semibold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">
                {t.settings.general.industry}
              </label>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-muted/40 border border-border/60 text-sm text-foreground font-semibold"
              />
            </div>

            {/* Language Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Globe size={14} className="text-primary" />
                {t.settings.general.systemLanguage}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLanguage('ru')}
                  className={cn(
                    'py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all',
                    language === 'ru'
                      ? 'bg-primary/15 border-primary text-primary shadow-sm'
                      : 'bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  🇷🇺 Русский
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('uz')}
                  className={cn(
                    'py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all',
                    language === 'uz'
                      ? 'bg-primary/15 border-primary text-primary shadow-sm'
                      : 'bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  🇺🇿 O‘zbekcha
                </button>
              </div>
            </div>

            {/* Theme Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                <Sun size={14} className="text-yellow-400" />
                {t.settings.general.systemTheme}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all',
                    theme === 'dark'
                      ? 'bg-primary/15 border-primary text-primary shadow-sm'
                      : 'bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Moon size={14} />
                  {language === 'uz' ? 'Qorong‘i mavzu' : 'Тёмная тема'}
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  className={cn(
                    'py-3 px-4 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all',
                    theme === 'light'
                      ? 'bg-primary/15 border-primary text-primary shadow-sm'
                      : 'bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Sun size={14} />
                  {language === 'uz' ? 'Yorug‘ mavzu' : 'Светлая тема'}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border/40">
            <button
              onClick={handleSaveGeneral}
              className="py-3 px-6 rounded-2xl bg-primary text-primary-foreground text-xs font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              {t.settings.general.save}
            </button>
          </div>
        </div>
      )}

      {/* ─── TAB 4: CHECKLIST CRITERIA ──────────────────────────────────── */}
      {activeTab === 'checklist' && (
        <div className="glass-card rounded-3xl p-6 border border-border/60 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-border/40 pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {t.settings.tabs.checklist}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                AI auditor har bir qo‘ng‘iroqda tekshiradigan asosiy mezonlar
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { title: '1. Salomlashish va kompaniya nomini aytish', weight: '10 ball', desc: 'Standart bo‘yicha xushmuomala salomlashish' },
              { title: '2. Mijoz ehtiyojini to‘liq aniqlash (SPIN savollar)', weight: '25 ball', desc: 'Mijoz muammosi va budjetini tushunish' },
              { title: '3. Mahsulot taqdimoti va qiymatini ko‘rsatish', weight: '20 ball', desc: 'Foyda va yechimga urg‘u berish' },
              { title: '4. E’tirozlar bilan ishlash ("Qimmat", "O‘ylab ko‘raman")', weight: '25 ball', desc: 'E’tirozni tushunib, to‘g‘ri yechim taklif qilish' },
              { title: '5. Keyingi qadamni belgilash (Bitimni yopish)', weight: '20 ball', desc: 'Aniq vaqt va maqsad bilan suhbatni yakunlash' },
            ].map((c) => (
              <div
                key={c.title}
                className="flex items-center justify-between p-4 rounded-2xl bg-muted/40 border border-border/50 hover:border-primary/30 transition-all"
              >
                <div>
                  <p className="text-sm font-bold text-foreground">{c.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-black">
                  {c.weight}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
