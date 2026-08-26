'use client'

import { useState } from 'react'
import {
  HelpCircle,
  BookOpen,
  Sparkles,
  Plug,
  Brain,
  FileAudio,
  FileText,
  Star,
  ListChecks,
  AlertOctagon,
  Lightbulb,
  ChevronDown,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  PhoneCall,
  Key,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/components/providers/app-provider'

export default function HelpPage() {
  const { language, t } = useLanguage()
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const faqs = language === 'uz' ? [
    {
      q: 'amoCRM bilan qanday tezkor ulanish mumkin?',
      a: 'amoCRM shaxsiy kabinetida «Настройки → Интеграции → Создать интеграцию» bo‘limiga kiring va «Долгосрочный токен» ni ko‘chirib oling. Uni Fraganus AI sozlamalariga kiritsangiz, 1 daqiqada barcha bitimlar va qo‘ng‘iroqlar ulanadi.',
    },
    {
      q: 'AI Audit (ChatGPT) qanday ishlaydi?',
      a: 'Qo‘ng‘iroq tugashi bilan audio fayl avtomatik tarzda 6 bosqichli tahlildan o‘tadi: 1) Audio qabul qilinadi → 2) Whisper STT orqali matnga aylanadi va rollar (Menejer/Mijoz) ajratiladi → 3) AI Score hisoblanadi → 4) Kompaniya skripti va chek-listi tekshiriladi → 5) Xatolar va boy berilgan e’tirozlar aniqlanadi → 6) Menejerga aniq biznes-tavsiya beriladi.',
    },
    {
      q: 'Qaysi OpenAI modellari qo‘llab-quvvatlanadi?',
      a: 'Fraganus AI GPT-4o, GPT-4o-mini va Whisper-1 modellarini qo‘llab-quvvatlaydi. O‘zbek va rus tillaridagi suhbatlarni eng yuqori aniqlikda tahlil qilish uchun GPT-4o tavsiya etiladi.',
    },
    {
      q: 'OnlinePBX yoki boshqa telefoniya qanday ulanadi?',
      a: 'Sozlamalar → Integratsiyalar bo‘limidagi Webhook URL manzilini telefoniyangizning «Zvonki / Webhooks» sozlamalariga joylashtirasiz. Har bir yangi qo‘ng‘iroq darhol tizimga tushadi.',
    },
  ] : [
    {
      q: 'Как быстро подключить amoCRM?',
      a: 'В личном кабинете amoCRM перейдите в «Настройки → Интеграции → Создать интеграцию» и скопируйте «Долгосрочный токен». Вставьте его в разделе Настройки Fraganus AI — интеграция займет меньше 1 минуты.',
    },
    {
      q: 'Как работает AI Аудит на базе ChatGPT?',
      a: 'После завершения звонка запись проходит 6-этапную обработку: 1) Приём аудио → 2) Распознавание речи Whisper STT с разделением на Менеджера и Клиента → 3) Расчёт AI Score → 4) Сверка с чек-листом и скриптом → 5) Выявление ошибок и возражений → 6) Персональная рекомендация менеджеру.',
    },
    {
      q: 'Какие модели OpenAI поддерживаются?',
      a: 'Fraganus AI поддерживает модели GPT-4o, GPT-4o-mini и Whisper-1. Для максимальной точности на узбекском и русском языках рекомендуется GPT-4o.',
    },
    {
      q: 'Как подключить OnlinePBX или другую телефонию?',
      a: 'Скопируйте Webhook URL из раздела Настройки → Интеграции и вставьте его в настройки вашей АТС (OnlinePBX/Zadarma/Asterisk). Звонки будут поступать в систему автоматически.',
    },
  ]

  const pipeline = [
    {
      step: '01',
      title: t.settings.chatgpt.step1,
      desc: t.settings.chatgpt.step1Desc,
      icon: FileAudio,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      step: '02',
      title: t.settings.chatgpt.step2,
      desc: t.settings.chatgpt.step2Desc,
      icon: FileText,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      step: '03',
      title: t.settings.chatgpt.step3,
      desc: t.settings.chatgpt.step3Desc,
      icon: Star,
      color: 'text-primary bg-primary/10 border-primary/20',
    },
    {
      step: '04',
      title: t.settings.chatgpt.step4,
      desc: t.settings.chatgpt.step4Desc,
      icon: ListChecks,
      color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    },
    {
      step: '05',
      title: t.settings.chatgpt.step5,
      desc: t.settings.chatgpt.step5Desc,
      icon: AlertOctagon,
      color: 'text-red-400 bg-red-500/10 border-red-500/20',
    },
    {
      step: '06',
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
        <div className="absolute right-0 top-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-500/15 border border-blue-500/25 shadow-[0_0_16px_rgba(59,130,246,0.15)]">
              <HelpCircle size={22} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                {t.help.title}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {t.help.subtitle}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6-Stage AI Audit Architecture Explained ──────────────────────── */}
      <div className="glass-card rounded-3xl p-6 border border-border/60 space-y-6">
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Brain size={20} className="text-primary" />
              {t.help.guides.auditTitle}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {t.help.guides.auditDesc}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pipeline.map((p) => (
            <div
              key={p.step}
              className="p-5 rounded-2xl bg-muted/40 border border-border/50 flex flex-col justify-between group hover:border-primary/40 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-muted-foreground font-mono">{p.step}</span>
                  <div className={cn('p-2.5 rounded-xl border', p.color)}>
                    <p.icon size={18} />
                  </div>
                </div>
                <h3 className="text-base font-bold text-foreground">{p.title}</h3>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Step-by-Step Setup Guides ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* amoCRM Guide Card */}
        <div className="glass-card rounded-3xl p-6 border border-border/60 space-y-4">
          <div className="flex items-center gap-3 border-b border-border/40 pb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
              amo
            </div>
            <h3 className="text-base font-bold text-foreground">
              {t.help.guides.amocrmTitle}
            </h3>
          </div>

          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                1
              </span>
              <p>{t.help.guides.amocrmStep1}</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                2
              </span>
              <p>{t.help.guides.amocrmStep2}</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                3
              </span>
              <p>{t.help.guides.amocrmStep3}</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                4
              </span>
              <p>{t.help.guides.amocrmStep4}</p>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="/settings"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              {language === 'uz' ? 'Sozlamalarga o‘tish' : 'Перейти в настройки'} →
            </a>
          </div>
        </div>

        {/* ChatGPT Setup Guide Card */}
        <div className="glass-card rounded-3xl p-6 border border-border/60 space-y-4">
          <div className="flex items-center gap-3 border-b border-border/40 pb-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Brain size={18} />
            </div>
            <h3 className="text-base font-bold text-foreground">
              {t.help.guides.openaiTitle}
            </h3>
          </div>

          <div className="space-y-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                1
              </span>
              <p>{t.help.guides.openaiStep1}</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                2
              </span>
              <p>{t.help.guides.openaiStep2}</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                3
              </span>
              <p>{t.help.guides.openaiStep3}</p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                4
              </span>
              <p>{t.help.guides.openaiStep4}</p>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="/settings"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              {language === 'uz' ? 'ChatGPT ni ulash' : 'Подключить ChatGPT'} →
            </a>
          </div>
        </div>
      </div>

      {/* ─── FAQ Section ─────────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 border border-border/60 space-y-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border/40 pb-3">
          <BookOpen size={18} className="text-yellow-400" />
          {language === 'uz' ? 'Ko‘p beriladigan savollar (FAQ)' : 'Часто задаваемые вопросы (FAQ)'}
        </h3>

        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-muted/40 border border-border/50 overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-4 text-left font-bold text-xs sm:text-sm text-foreground hover:bg-white/[0.02]"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  size={16}
                  className={cn(
                    'text-muted-foreground transition-transform duration-200 flex-shrink-0',
                    openFaq === idx && 'rotate-180 text-primary'
                  )}
                />
              </button>

              {openFaq === idx && (
                <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border/30 pt-3 animate-fade-in">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Support Card ────────────────────────────────────────────────── */}
      <div className="glass-card rounded-3xl p-6 border border-primary/30 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <MessageCircle size={18} className="text-primary" />
            {t.help.support.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t.help.support.desc}
          </p>
        </div>

        <a
          href="https://t.me/marketingmarkazi_support"
          target="_blank"
          rel="noreferrer"
          className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all flex-shrink-0"
        >
          {t.help.support.contactBtn}
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  )
}
