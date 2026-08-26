# Biznes Ko'rsatkichlari (KPI) Biznes Formulalari va Hujjatlar

Ushbu hujjat **SaaS AI-Controller** tizimining premium boshqaruv panelida (Dashboard) hisoblanadigan barcha 18 ta KPI uchun hisob-kitob qoidalari, ma'lumotlar manbai va chekka holatlarni belgilaydi.

---

## Umumiy Qoidalar

1. **Vaqt va Sanalar**: Barcha hisoblar foydalanuvchi tanlagan davr sanalari oralig'ida (`startDate` dan `endDate` gacha), kompaniya vaqt mintaqasini (`Asia/Tashkent`) inobatga olgan holda amalga oshiriladi.
2. **Filtrlarning Ta'siri**: Har qanday faol filtr (`managerId`, `stageId`, `source`, `refusalReasonId`) tegishli so'rovlardagi `WHERE` shartiga qo'shiladi.
3. **Nolga Bo'lish Cheklovi**: Agar formulada maxraj `0` ga teng bo'lsa, natija har doim `0` deb qaytariladi. Hech qachon `Infinity`, `NaN` yoki xatolik yuzaga kelishiga yo'l qo'yilmaydi.
4. **Taqqoslash Davri**: O'tgan davr (Comparison Period) joriy davrning davomiyligiga teng (masalan, 30 kunlik davr uchun avvalgi 30 kun), joriy davr sanalariga kesishmaydigan vaqt oralig'idan olinadi.

---

## 18 ta KPI Ko'rsatkichlari Ro'yxati

### 1. Jami Bitimlar (totalDeals)
* **Tavsif**: Belgilangan davrda yaratilgan jami lidlar/bitimlar soni.
* **Manba**: `Deal` modeli.
* **Formula**: `COUNT(deals)`
* **Sana**: `crmCreatedAt` joriy davr oralig'ida.
* **Filtrlar**: Menejer, bosqich, manba, rad etish sababi.
* **Taqqoslash**: O'tgan davrdagi `crmCreatedAt` bo'yicha yaratilgan bitimlar soni bilan solishtiriladi.

### 2. Muvaffaqiyatli Bitimlar (wonDeals)
* **Tavsif**: Belgilangan davrda muvaffaqiyatli yopilgan bitimlar soni.
* **Manba**: `Deal` modeli.
* **Formula**: `COUNT(deals WHERE status = 'won')`
* **Sana**: `closedAt` joriy davr oralig'ida.
* **Filtrlar**: Menejer, bosqich, manba, rad etish sababi.
* **Taqqoslash**: O'tgan davrdagi `closedAt` bo'yicha yopilgan muvaffaqiyatli bitimlar.

### 3. Rad Etilganlar (lostDeals)
* **Tavsif**: Belgilangan davrda rad etilgan (yutqazilgan) bitimlar soni.
* **Manba**: `Deal` modeli.
* **Formula**: `COUNT(deals WHERE status = 'lost')`
* **Sana**: `closedAt` joriy davr oralig'ida.
* **Filtrlar**: Menejer, bosqich, manba, rad etish sababi.
* **Taqqoslash**: O'tgan davrdagi muvofiqlik.

### 4. Faol Bitimlar (activeDeals)
* **Tavsif**: Hozirda jarayonda bo'lgan ochiq bitimlar soni.
* **Manba**: `Deal` modeli.
* **Formula**: `COUNT(deals WHERE status = 'open')`
* **Sana**: Vaqt oralig'i ta'sir qilmaydi (joriy oniy holat).
* **Filtrlar**: Menejer, bosqich, manba.

### 5. Tushum (revenue)
* **Tavsif**: Muvaffaqiyatli yopilgan bitimlarning umumiy byudjeti summasi.
* **Manba**: `Deal.budget` maydoni.
* **Formula**: `SUM(budget WHERE status = 'won')`
* **Sana**: `closedAt` joriy davr oralig'ida.
* **Filtrlar**: Menejer, bosqich, manba.
* **Taqqoslash**: O'tgan davrda yopilgan muvaffaqiyatli bitimlar summasi.

### 6. O'rtacha Chek (avgTicket)
* **Tavsif**: Muvaffaqiyatli yopilgan bitta bitimga to'g'ri keladigan o'rtacha byudjet summasi.
* **Manba**: `Deal` modeli.
* **Formula**: `SUM(budget WHERE status = 'won') / COUNT(deals WHERE status = 'won')`
* **Sana**: `closedAt` joriy davr oralig'ida.
* **Maxraj Nol bo'lganda**: Agar yopilgan bitimlar soni `0` bo'lsa, o'rtacha chek `0` ga teng.

### 7. Konversiya (conversionRate)
* **Tavsif**: Muvaffaqiyatli bitimlarning jami yaratilgan bitimlarga nisbatan foizdagi ulushi.
* **Manba**: `Deal` modeli.
* **Formula**: `(COUNT(deals WHERE status = 'won') / COUNT(deals)) * 100` (yaxlitlangan holda).
* **Sana**: `won` bitimlar uchun `closedAt`, jami bitimlar uchun `crmCreatedAt` joriy davrda.
* **Maxraj Nol bo'lganda**: Agar jami bitimlar `0` bo'lsa, konversiya `0%` ga teng.

### 8. Bitim O'rtacha Vaqti (avgCycleTime)
* **Tavsif**: Bitim yaratilganidan to muvaffaqiyatli yopilguncha o'tgan o'rtacha kunlar soni.
* **Manba**: `Deal` modeli.
* **Formula**: `AVERAGE(closedAt - crmCreatedAt WHERE status = 'won')` (kunlarda yaxlitlangan).
* **Sana**: `closedAt` joriy davr oralig'ida.

### 9. Muddati O'tgan Vazifalar (overdueTasks)
* **Tavsif**: Bugungi kungacha bajarilishi kerak bo'lgan, lekin bajarilmagan ochiq vazifalar soni.
* **Manba**: `DealTask` modeli.
* **Formula**: `COUNT(tasks WHERE completedAt IS NULL AND dueAt < NOW())`
* **Filtrlar**: Menejer.

### 10. Vazifasiz Bitimlar (noNextTaskDeals)
* **Tavsif**: Hozirda jarayonda ochiq bo'lgan, lekin kelajakda bajarilishi kerak bo'lgan faol vazifasi bo'lmagan bitimlar soni.
* **Manba**: `Deal` va `DealTask` modellari.
* **Formula**: `COUNT(deals WHERE status = 'open' AND NOT EXISTS(tasks WHERE completedAt IS NULL))`
* **Filtrlar**: Menejer.

### 11. Jami Qo'ng'iroqlar (totalCalls)
* **Tavsif**: Belgilangan davrdagi jami kiruvchi va chiquvchi telefoniya qo'ng'iroqlari soni.
* **Manba**: `Call` modeli.
* **Formula**: `COUNT(calls)`
* **Sana**: `startedAt` joriy davr oralig'ida.
* **Filtrlar**: Menejer, qo'ng'iroq yo'nalishi (INBOUND/OUTBOUND).

### 12. Tahlil Qilinganlar (analyzedCalls)
* **Tavsif**: Sun'iy intellekt (Whisper & GPT-4o) tomonidan to'liq tahlil qilingan qo'ng'iroqlar soni.
* **Manba**: `Call` modeli.
* **Formula**: `COUNT(calls WHERE analysisStatus = 'COMPLETED')`
* **Sana**: `startedAt` joriy davr oralig'ida.

### 13. Kiruvchi Qo'ng'iroqlar (inboundCalls)
* **Tavsif**: Kiruvchi qo'ng'iroqlar soni.
* **Manba**: `Call` modeli.
* **Formula**: `COUNT(calls WHERE direction = 'INBOUND')`
* **Sana**: `startedAt` joriy davr oralig'ida.

### 14. Chiquvchi Qo'ng'iroqlar (outboundCalls)
* **Tavsif**: Chiquvchi qo'ng'iroqlar soni.
* **Manba**: `Call` modeli.
* **Formula**: `COUNT(calls WHERE direction = 'OUTBOUND')`
* **Sana**: `startedAt` joriy davr oralig'ida.

### 15. O'rtacha Audit Bahosi (avgScore)
* **Tavsif**: Belgilangan davrda yakunlangan barcha auditlarning o'rtacha yakuniy bahosi (100 ballik tizimda).
* **Manba**: `Audit.finalScore` maydoni.
* **Formula**: `AVERAGE(finalScore)`
* **Sana**: Audit yakunlangan sana `completedAt` joriy davr oralig'ida.
* **Maxraj Nol bo'lganda**: Agar auditlar `0` bo'lsa, o'rtacha baho `0` deb olinadi.

### 16. Kritik Xatolar Soni (criticalErrors)
* **Tavsif**: Belgilangan davrda yuz bergan kritik mezonlar bo'yicha qoidabuzarliklar (muvaffaqiyatsiz mezonlar) jami soni.
* **Manba**: `AuditCriterionResult` va `Audit` modellari.
* **Formula**: `COUNT(criterionResults WHERE passed = FALSE AND criterion.isCritical = TRUE)`
* **Sana**: Audit yakunlangan sana `Audit.completedAt` joriy davr oralig'ida.

### 17. Yo'qotilgan Bitimlar Summasi (lostValue)
* **Tavsif**: Rad etilgan (yutqazilgan) bitimlarning umumiy yo'qotilgan byudjeti summasi.
* **Manba**: `Deal.budget` maydoni.
* **Formula**: `SUM(budget WHERE status = 'lost')`
* **Sana**: `closedAt` joriy davr oralig'ida.

### 18. AI Daqiqalar Balansi (aiBalance)
* **Tavsif**: Kompaniyaning joriy mavjud, ishlatilgan va umumiy AI daqiqalari holati.
* **Manba**: `UsageBalance` modeli.
* **Formula**:
  * `available = totalMinutes - usedMinutes - reservedMinutes`
  * `used = usedMinutes`
  * `total = totalMinutes`
* **Sana**: Joriy oniy holat. Vaqt oralig'i ta'sir qilmaydi.
