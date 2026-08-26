# Marketing Markazi AI Sales Audit — MVP Scope

Ushbu hujjat Marketing Markazi loyihasining MVP (Minimum Viable Product) doirasini muzlatish (Freeze Scope) uchun xizmat qiladi. Barcha keyingi kengaytirishlar va qo'shimchalar Post-MVP davriga qoldiriladi.

---

## 1. Included in MVP (MVP tarkibiga kiruvchi funksiyalar)

1. **Avtorizatsiya va Huquqlar**:
   - Tizimga kirish (Login) va chiqish (Logout).
   - Rollar: `SUPER_ADMIN`, `COMPANY_ADMIN`, `OWNER`, `SALES_DIRECTOR`, `QUALITY_CONTROL`.
2. **Kompaniya boshqaruvi**:
   - Marketing Markazi kompaniyasi uchun to'liq ishchi sozlamalar.
   - Demo kompaniyalar va demo ma'lumotlarni production rejimida yashirish.
3. **amoCRM Integratsiyasi**:
   - Xavfsiz OAuth ulanish, tokenlarni AES-256-GCM orqali shifrlab saqlash.
   - Sinxronizatsiya: menejerlar, kontaktlar, bitimlar, voronka bosqichlari, vazifalar va rad etish sabablari.
4. **OnlinePBX Integratsiyasi**:
   - Webhook orqali yangi javob berilgan (answered) qo'ng'iroqlarni qabul qilish.
   - Qo'ng'iroqni tegishli menejer, mijoz va amoCRM bitimi (deal) bilan avtomatik bog'lash.
   - Zong yozuvini (.wav/.mp3) avtomatik yuklab olish va MinIO/S3 audio-omboriga saqlash.
5. **Qo'ng'iroqlar Ro'yxati va Pleyer**:
   - Qo'ng'iroqlar filtri (sana, menejer, yo'nalish).
   - Audio yozuvni brauzerda inline pleyer orqali tinglash.
   - Qo'ng'iroqni AI tahlilga (Analyze) yuborish.
6. **AI Audit (Tahlil)**:
   - Whisper orqali qo'ng'iroqni matnga o'girish (transkripsiya).
   - GPT-4o yordamida 6 blokli mezon bo'yicha tahlil qilish.
   - Yakuniy ball, xatolar, kuchli tomonlar, e'tirozlar, tavsiyalar, sotish ehtimoli, muhim iqtiboslar va taymkodlarni aniqlash.
7. **Bahoni Tahrirlash va Tarix**:
   - QC yoki ROP tomonidan audit natijasini/ballarini qo'lda o'zgartirish.
   - O'zgarishlar tarixini `AuditScoreHistory` jadvalida saqlash.
8. **amoCRM'ga Natijani Yuborish**:
   - Audit yakuniy natijalarini amoCRM bitimiga (deal) eslatma (note) sifatida yuborish.
   - Takroriy yuborishning oldini olish (idempotentlik).
9. **AI Daqiqalar Balansi**:
   - Kompaniyaning AI daqiqalari balansini saqlash, band qilish va tahlil yakunlanganda yechib olish.
10. **Boshqaruv Paneli (Live Dashboard)**:
    - Lids, sotuvlar, tushum, konversiya, faol bitimlar, rad etilganlar, qo'ng'iroqlar, tahlil qilingan qo'ng'iroqlar va o'rtacha ball.
    - Menejerlar reytingi va rad etish sabablari ro'yxati.
11. **Super Admin Paneli**:
    - Kompaniyalar va ularning AI minutlari balansini boshqarish.

---

## 2. Excluded from MVP (MVP'dan chiqarilgan funksiyalar)

1. **CRM Discipline**: Menejerlarning CRM intizomini (vazifalarni kechiktirish, eslatmalarni to'ldirmaslik) murakkab tahlil qilish va maxsus endpoint'lar.
2. **Murakkab Menejerlar Reytingi**: Sotuv natijasi (40%), qo'ng'iroq sifati (40%) va CRM intizomi (20%) asosidagi dinamik reyting.
3. **Rad Etish Sabablari Solishtiruvi**: CRM'dagi rad etish sababi bilan AI aniqlagan sababni solishtirish paneli.
4. **Stereo/Ko'p Kanalli Diarizatsiya**: Audio kanallarni alohida ajratib, Whisper orqali mustaqil transkripsiya qilish (hozirda heuristic/LLM-based diarizatsiya qo'llanadi).
5. **Versiyalash**: Chek-listlar va savdo scriptlarining tarixiy versiyalarini boshqarish.
6. **Bildirishnomalar (Notifications)**: Telegram/Email yoki tizim ichidagi bildirishnomalar.
7. **Tahliliy Hisobotlar (Advanced Reports)**: Murakkab PDF/Excel eksport va o'sish dinamikasi grafiklari.
8. **Boshqa Integratsiyalar**: Bitrix24, Sipuni, UTel, Mo Zvonki kabi boshqa CRM va telefoniya tizimlari.
9. **Kengaytirilgan Testlar**: Tizimning chekka va yuklama ostidagi holatlarini tekshiruvchi qo'shimcha testlar.

---

## 3. Known Limitations (Ma'lum bo'lgan cheklovlar)

1. **Speaker Diarization (Spikerlarni ajratish)**:
   - Hozirda spikerlar navbat almashishi (`idx % 2 === 0`) va GPT-4o matn tahlili yordamida ajratiladi. Ba'zi hollarda spiker noto'g'ri belgilanishi mumkin.
2. **amoCRM API Limitlari**:
   - amoCRM hisobi faol bo'lmaganda yoki bloklanganda `402 Payment Required` xatosi qaytadi. Bunday holda sinxronizatsiya faqat ma'lumotlar mavjud bo'lgandagina ishlaydi.
3. **Faqat Bitta VPS'da Ishlash**:
   - Tizim Docker Compose yordamida bitta serverda (VPS) ishlashga mo'ljallangan, murakkab kubernetes yoki serverless komponentlaridan foydalanilmaydi.

---

## 4. Post-MVP Backlog (Kelgusidagi rejalar)

1. Stereo diarizatsiya modulini (masalan, PyAnnote) ulash.
2. Telegram bot orqali haftalik/kunlik hisobotlarni ROP va egalariga yuborish.
3. CRM Discipline va vazifalar bajarilish tezligini hisoblovchi API yaratish.
4. Bitrix24 va Sipuni integratsiyalarini amalga oshirish.
5. Chek-listlar va scriptlar muharririda versiyalar nazoratini joriy etish.
