# Production Launch Checklist

Ushbu checklist MVP ishga tushirilishidan oldin to'liq bajarilishi shart bo'lgan operatsiyalarni o'z ichiga oladi.

---

## 1. Environment & Security Config
- [ ] `APP_MODE` qiymati strictly `"production"` qilib o'rnatilganligini tekshirish.
- [ ] `ENCRYPTION_KEY` 64 belgidan iborat tasodifiy hex-satr ekanini tasdiqlash (`openssl rand -hex 32` orqali yaratilgan).
- [ ] Barcha parollar va API kalitlari (`DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, `AMOCRM_CLIENT_SECRET`, `ONLINEPBX_API_KEY`) default qiymatda emas, real maxfiy kalitlar ekanini tekshirish.
- [ ] `AMOCRM_REDIRECT_URI` manzili production domeniga mos kelishini tekshirish (masalan: `https://audit.marketingmarkazi.uz/api/integrations/amocrm/callback`).

---

## 2. Database & Data Setup
- [ ] `npx prisma migrate deploy` muvaffaqiyatli yakunlanganligi va bazada barcha jadvallar yaratilganligi.
- [ ] `npm run db:seed` bajarilib, tizim mezonlari va **Marketing Markazi** (slug: `marketing-markazi`) real kompaniyasi yaratilganligi.
- [ ] `npm run db:bootstrap` ishga tushirilib, Super Admin yaratilganligi va `passwordChangeRequired: true` o'rnatilganligi.
- [ ] Bazada hech qanday demo ma'lumotlar (`marketing-markazi-demo` kabi) production rejimida ko'rinmasligi va unga so'rov yuborilganda `400 Bad Request` qaytishi.

---

## 3. Integrations Setup
- [ ] amoCRM hisobida integratsiya yaratilib, Client ID va Secret olinganligi hamda Redirect URL o'rnatilganligi.
- [ ] OnlinePBX tizimida API kaliti generatsiya qilinganligi.
- [ ] OnlinePBX webhook xizmatiga loyiha callback manzili qo'shilganligi (masalan: `https://audit.marketingmarkazi.uz/api/webhooks/onlinepbx?integrationId=...`).

---

## 4. Background Workers (BullMQ)
- [ ] `k4-worker` konteyneri muvaffaqiyatli ishlayotgani va Redis bilan ulanishi faolligi.
- [ ] Worker audio yuklab olish va AI audit vazifalarini muvaffaqiyatli qabul qilayotgani (loglar orqali tekshirish).
- [ ] MinIO/S3 xizmatiga ulanish va u yerda audio saqlash uchun `k4-audio-recordings` bucket avtomatik yaratilganligi (yoki qo'lda yaratilganligi).

---

## 5. Monitoring & Maintenance
- [ ] Docker konteynerlarining restart siyosati (`restart: unless-stopped`) faolligi.
- [ ] HTTPS (SSL) sertifikati o'rnatilganligi va ulanish faqat xavfsiz port orqali amalga oshirilayotganligi.
- [ ] Kundalik ma'lumotlar bazasi va audio fayllarni zaxiralash (backup) skriptlari cron'ga qo'shilganligi.
