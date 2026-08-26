export type Language = 'ru' | 'uz'

export interface TranslationSchema {
  brand: {
    name: string
    tagline: string
    status: string
    version: string
  }
  nav: {
    dashboard: string
    dashboardSub: string
    audits: string
    auditsSub: string
    team: string
    teamSub: string
    problems: string
    problemsSub: string
    reports: string
    reportsSub: string
    settings: string
    settingsSub: string
    help: string
    helpSub: string
    admin: string
    companies: string
    tariffs: string
    checklist: string
    monitor: string
    logout: string
  }
  header: {
    search: string
    aiLive: string
    themeLight: string
    themeDark: string
    notifications: string
  }
  settings: {
    title: string
    subtitle: string
    tabs: {
      general: string
      chatgpt: string
      integrations: string
      checklist: string
    }
    general: {
      companyName: string
      industry: string
      timezone: string
      systemLanguage: string
      systemTheme: string
      save: string
      saved: string
    }
    chatgpt: {
      title: string
      description: string
      apiKeyLabel: string
      apiKeyPlaceholder: string
      modelLabel: string
      whisperModelLabel: string
      pipelineTitle: string
      step1: string
      step1Desc: string
      step2: string
      step2Desc: string
      step3: string
      step3Desc: string
      step4: string
      step4Desc: string
      step5: string
      step5Desc: string
      step6: string
      step6Desc: string
      testBtn: string
      saveBtn: string
      statusConnected: string
      statusNotConfigured: string
    }
    integrations: {
      title: string
      amocrmTitle: string
      amocrmDesc: string
      amocrmConnected: string
      amocrmNotConnected: string
      telephonyTitle: string
      telephonyDesc: string
      webhooksTitle: string
      syncNow: string
      manage: string
    }
  }
  help: {
    title: string
    subtitle: string
    quickStart: string
    guides: {
      amocrmTitle: string
      amocrmStep1: string
      amocrmStep2: string
      amocrmStep3: string
      amocrmStep4: string
      openaiTitle: string
      openaiStep1: string
      openaiStep2: string
      openaiStep3: string
      openaiStep4: string
      auditTitle: string
      auditDesc: string
    }
    support: {
      title: string
      desc: string
      contactBtn: string
    }
  }
  common: {
    loading: string
    save: string
    cancel: string
    edit: string
    delete: string
    success: string
    error: string
    close: string
    details: string
  }
}

export const translations: Record<Language, TranslationSchema> = {
  ru: {
    brand: {
      name: 'Fraganus AI',
      tagline: 'AI Контроль продаж',
      status: 'СИСТЕМА АКТИВНА',
      version: 'v2.2.0 // AI CORE',
    },
    nav: {
      dashboard: 'Дашборд',
      dashboardSub: 'Главная панель',
      audits: 'Аудит',
      auditsSub: 'Запись → AI анализ',
      team: 'Команда',
      teamSub: 'Эффективность',
      problems: 'Проблемы',
      problemsSub: 'Анализ ошибок',
      reports: 'Отчёты',
      reportsSub: 'Аналитика и экспорт',
      settings: 'Настройки',
      settingsSub: 'Интеграции и AI',
      help: 'Помощь',
      helpSub: 'Инструкции и гид',
      admin: 'Администратор',
      companies: 'Компании',
      tariffs: 'Тарифы',
      checklist: 'Чек-лист',
      monitor: 'Мониторинг',
      logout: 'Выйти из системы',
    },
    header: {
      search: 'Поиск по системе...',
      aiLive: 'AI Онлайн',
      themeLight: 'Светлая тема',
      themeDark: 'Тёмная тема',
      notifications: 'Уведомления',
    },
    settings: {
      title: 'Настройки системы',
      subtitle: 'Управление интеграциями, привязкой ChatGPT и параметрами компании',
      tabs: {
        general: 'Общие',
        chatgpt: 'ChatGPT / OpenAI',
        integrations: 'Интеграции',
        checklist: 'Чек-лист аудита',
      },
      general: {
        companyName: 'Название компании',
        industry: 'Сфера деятельности',
        timezone: 'Часовой пояс',
        systemLanguage: 'Язык интерфейса',
        systemTheme: 'Тема оформления',
        save: 'Сохранить изменения',
        saved: 'Настройки успешно сохранены',
      },
      chatgpt: {
        title: 'Привязка ChatGPT для аудита звонков',
        description: 'ChatGPT анализирует разговор по цепочке: Запись → Транскрипция → AI Score → Чек-лист → Ошибки → Рекомендация',
        apiKeyLabel: 'OpenAI API Key',
        apiKeyPlaceholder: 'sk-proj-...',
        modelLabel: 'Модель анализа звонков',
        whisperModelLabel: 'Модель транскрипции (Whisper)',
        pipelineTitle: 'Цепочка анализа звонка AI',
        step1: 'Запись',
        step1Desc: 'Аудио MP3/WAV из amoCRM / OnlinePBX',
        step2: 'Транскрипция',
        step2Desc: 'STT распознавание ролей Менеджер / Клиент',
        step3: 'AI Score',
        step3Desc: 'Расчёт общего балла (0-100%)',
        step4: 'Чек-лист',
        step4Desc: 'Проверка соответствия критериям и скрипту',
        step5: 'Ошибки',
        step5Desc: 'Выявление возражений, грубости, пауз',
        step6: 'Рекомендация',
        step6Desc: 'Персональный бизнес-совет менеджеру',
        testBtn: 'Проверить подключение OpenAI',
        saveBtn: 'Сохранить настройки ChatGPT',
        statusConnected: 'Подключено к OpenAI API',
        statusNotConfigured: 'Ключ API не настроен',
      },
      integrations: {
        title: 'Внешние интеграции',
        amocrmTitle: 'amoCRM Интеграция',
        amocrmDesc: 'Синхронизация лидов, сделок, контактов и записей разговоров',
        amocrmConnected: 'Подключено к amoCRM',
        amocrmNotConnected: 'Не подключено',
        telephonyTitle: 'Телефония (OnlinePBX / Zadarma / Asterisk)',
        telephonyDesc: 'Автоматический приём записей звонков для AI аудита',
        webhooksTitle: 'Webhooks',
        syncNow: 'Синхронизировать сейчас',
        manage: 'Управление',
      },
    },
    help: {
      title: 'Центр помощи и инструкции',
      subtitle: 'Пошаговые руководства по настройке Fraganus AI и оптимизации продаж',
      quickStart: 'Быстрый старт',
      guides: {
        amocrmTitle: '1. Как подключить amoCRM через Долгосрочный токен',
        amocrmStep1: 'Войдите в личный кабинет amoCRM как администратор.',
        amocrmStep2: 'Перейдите в Настройки → Интеграции → Создать интеграцию.',
        amocrmStep3: 'Вкладка «Долгосрочный токен» → Сгенерируйте и скопируйте токен.',
        amocrmStep4: 'Вставьте адрес поддомена и токен в разделе «Интеграции» и нажмите Сохранить.',
        openaiTitle: '2. Настройка ChatGPT (OpenAI) для AI Аудита',
        openaiStep1: 'Получите API-ключ на платформе platform.openai.com.',
        openaiStep2: 'В разделе Настройки → ChatGPT вставьте ключ sk-proj-...',
        openaiStep3: 'Выберите модель GPT-4o для максимальной точности анализа.',
        openaiStep4: 'Нажмите «Проверить подключение» — система протестирует готовность.',
        auditTitle: '3. Как работает 6-этапный AI Аудит',
        auditDesc: 'Каждый звонок проходит глубокий нейросетевой анализ за 15-30 секунд.',
      },
      support: {
        title: 'Нужна помощь специалистов?',
        desc: 'Наша команда технической поддержки поможет настроить интеграции и адаптировать скрипты.',
        contactBtn: 'Написать в Telegram',
      },
    },
    common: {
      loading: 'Загрузка...',
      save: 'Сохранить',
      cancel: 'Отмена',
      edit: 'Редактировать',
      delete: 'Удалить',
      success: 'Успешно',
      error: 'Ошибка',
      close: 'Закрыть',
      details: 'Подробнее',
    },
  },

  uz: {
    brand: {
      name: 'Fraganus AI',
      tagline: 'Sotuvlarni AI Nazorat Qilish',
      status: 'TIZIM FAOL',
      version: 'v2.2.0 // AI CORE',
    },
    nav: {
      dashboard: 'Boshqaruv',
      dashboardSub: 'Asosiy panel',
      audits: 'Audit',
      auditsSub: 'Yozuv → AI tahlil',
      team: 'Jamoa',
      teamSub: 'Menejerlar samaradorligi',
      problems: 'Muammolar',
      problemsSub: 'Xatoliklar tahlili',
      reports: 'Hisobotlar',
      reportsSub: 'Tahlil va eksport',
      settings: 'Sozlamalar',
      settingsSub: 'Integratsiya va AI',
      help: 'Yordam',
      helpSub: 'Qo‘llanma va yo‘riqnoma',
      admin: 'Administrator',
      companies: 'Kompaniyalar',
      tariffs: 'Tariflar',
      checklist: 'Chek-list',
      monitor: 'Monitoring',
      logout: 'Tizimdan chiqish',
    },
    header: {
      search: 'Tizim bo‘yicha qidirish...',
      aiLive: 'AI Jonli',
      themeLight: 'Yorug‘ mavzu',
      themeDark: 'Qorong‘i mavzu',
      notifications: 'Xabarnomalar',
    },
    settings: {
      title: 'Tizim sozlamalari',
      subtitle: 'Integratsiyalar, ChatGPT ulash va kompaniya parametrlarini boshqarish',
      tabs: {
        general: 'Asosiy',
        chatgpt: 'ChatGPT / OpenAI',
        integrations: 'Integratsiyalar',
        checklist: 'Audit chek-listi',
      },
      general: {
        companyName: 'Kompaniya nomi',
        industry: 'Faoliyat sohasi',
        timezone: 'Vaqt mintaqasi',
        systemLanguage: 'Tizim tili',
        systemTheme: 'Dizayn mavzusi',
        save: 'O‘zgarishlarni saqlash',
        saved: 'Sozlamalar muvaffaqiyatli saqlandi',
      },
      chatgpt: {
        title: 'Qo‘ng‘iroqlar auditi uchun ChatGPT ulash',
        description: 'ChatGPT suhbatni 6 bosqichli zanjir bo‘yicha tahlil qiladi: Yozuv → Transkripsiya → AI Score → Chek-list → Xatolar → Tavsiya',
        apiKeyLabel: 'OpenAI API Kaliti',
        apiKeyPlaceholder: 'sk-proj-...',
        modelLabel: 'Qo‘ng‘iroq tahlili modeli',
        whisperModelLabel: 'Transkripsiya modeli (Whisper)',
        pipelineTitle: 'AI Qo‘ng‘iroq Tahlil Zanjiri',
        step1: 'Yozuv',
        step1Desc: 'amoCRM / OnlinePBX dan kelgan MP3/WAV audio',
        step2: 'Transkripsiya',
        step2Desc: 'Menejer va Mijoz rollarini STT aniqlash',
        step3: 'AI Score',
        step3Desc: 'Umumiy sifat ballini hisoblash (0-100%)',
        step4: 'Chek-list',
        step4Desc: 'Mezonlar va skriptga moslikni tekshirish',
        step5: 'Xatolar',
        step5Desc: 'E’tirozlar, qo‘pollik va sukunatni topish',
        step6: 'Tavsiya',
        step6Desc: 'Menejerga amaliy biznes-maslahat berish',
        testBtn: 'OpenAI ulanishini tekshirish',
        saveBtn: 'ChatGPT sozlamalarini saqlash',
        statusConnected: 'OpenAI API ga muvaffaqiyatli ulangan',
        statusNotConfigured: 'API kalit kiritilmagan',
      },
      integrations: {
        title: 'Tashqi integratsiyalar',
        amocrmTitle: 'amoCRM Integratsiyasi',
        amocrmDesc: 'Lidlar, bitimlar, kontaktlar va qo‘ng‘iroq yozuvlarini sinxronlash',
        amocrmConnected: 'amoCRM ga ulangan',
        amocrmNotConnected: 'Ulanmagan',
        telephonyTitle: 'Telefoniya (OnlinePBX / Zadarma / Asterisk)',
        telephonyDesc: 'AI audit uchun qo‘ng‘iroq yozuvlarini avtomatik qabul qilish',
        webhooksTitle: 'Webhooklar',
        syncNow: 'Hozir sinxronlash',
        manage: 'Boshqarish',
      },
    },
    help: {
      title: 'Yordam markazi va qo‘llanmalar',
      subtitle: 'Fraganus AI tizimini sozlash va sotuvlarni oshirish bo‘yicha bosqichma-bosqich yo‘riqnoma',
      quickStart: 'Tezkor boshlash',
      guides: {
        amocrmTitle: '1. amoCRM ni Uzoq muddatli token orqali ulash',
        amocrmStep1: 'amoCRM shaxsiy kabinetiga administrator sifatida kiring.',
        amocrmStep2: 'Sozlamalar (Настройки) → Integratsiyalar (Интеграции) → Yangi integratsiya yarating.',
        amocrmStep3: '«Долгосрочный токен» bo‘limidan tokenni yarating va nusxalang.',
        amocrmStep4: 'Fraganus AI dagi «Integratsiyalar» bo‘limiga subdomen va tokenni kiritib saqlang.',
        openaiTitle: '2. AI Audit uchun ChatGPT (OpenAI) ni ulash',
        openaiStep1: 'platform.openai.com sahifasidan shaxsiy API kalit oling.',
        openaiStep2: 'Sozlamalar → ChatGPT bo‘limiga sk-proj-... kalitingizni kiriting.',
        openaiStep3: 'Eng aniq tahlil uchun GPT-4o modelini tanlang.',
        openaiStep4: '«OpenAI ulanishini tekshirish» tugmasini bosib tayyorgarlikni tekshiring.',
        auditTitle: '3. 6 bosqichli AI Audit qanday ishlaydi',
        auditDesc: 'Har bir qo‘ng‘iroq 15-30 soniya ichida neyrotarmoqlar orqali to‘liq tekshiriladi.',
      },
      support: {
        title: 'Mutaxassis yordami kerakmi?',
        desc: 'Bizning texnik yordam guruhimiz integratsiyalarni sozlash va skriptlarni kiritishda yordam beradi.',
        contactBtn: 'Telegram orqali bog‘lanish',
      },
    },
    common: {
      loading: 'Yuklanmoqda...',
      save: 'Saqlash',
      cancel: 'Bekor qilish',
      edit: 'Tahrirlash',
      delete: 'O‘chirish',
      success: 'Muvaffaqiyatli',
      error: 'Xatolik',
      close: 'Yopish',
      details: 'Batafsil',
    },
  },
}
