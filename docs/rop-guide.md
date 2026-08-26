# ROP (Руководитель Отдела Продаж) учун Йўриқнома

Ushbu yo'riqnoma savdo bo'limi boshlig'i (ROP) va Sifat nazorati (QC) mutaxassislariga tizimning MVP versiyasidan qanday foydalanishni tushuntiradi.

---

## 1. Tizimga kirish (Login)
1. Brauzer orqali `/login` sahifasiga kiring.
2. Sizga berilgan login va parolni kiriting (masalan: `admin@marketingmarkazi.uz` / bootstrap orqali o'rnatilgan parol).
3. **Muhim**: Birinchi marta kirganingizda tizim sizdan parolingizni xavfsizroq parolga o'zgartirishni so'raydi. Yangi parol o'rnating.

---

## 2. Qo'ng'iroqlar ro'yxatini ochish
* Tizimning chap tarafidagi menyudan **"Звонки"** (Qo'ng'iroqlar) bo'limini tanlang.
* Bu yerda OnlinePBX orqali qabul qilingan real javob berilgan (answered) qo'ng'iroqlar ro'yxatini ko'rasiz.
* Qo'ng'iroqlarni sana, menejer va yo'nalish (kiruvchi/chiquvchi) bo'yicha filtrlashingiz mumkin.

---

## 3. Audio yozuvni eshitish
* Qo'ng'iroqlar ro'yxatidan eshitmoqchi bo'lgan qo'ng'irog'ingiz ustiga bosing.
* Sahifadagi o'rnatilgan premium audio pleyer yordamida qo'ng'iroq yozuvini tinglang.
* Pleyerdagi tezlikni sozlash yoki kerakli soniyaga o'tkazish tugmalaridan foydalaning.

---

## 4. AI tahlilni ishga tushirish (Analyze)
* Tinglanayotgan qo'ng'iroq kartasining o'ng tomonida joylashgan **"Анализ қилиш"** (Analyze) tugmasini bosing.
* Tizim avtomatik tarzda sizning daqiqalar balansingizdan qo'ng'iroq davomiyligiga mos daqiqalarni band qiladi va tahlil ishini (job) BullMQ navbatiga yuboradi.
* AI Whisper transkripsiyasi va GPT-4o auditi tugagach (odatda 30-60 soniya), qo'ng'iroq holati **"Таҳлил қилинган"** (Analyzed) holatiga o'tadi.

---

## 5. AI Audit natijalarini ko'rish
Tahlil yakunlangach, qo'ng'iroq yonidagi **"Аудитни кўриш"** tugmasini bosing. Sizga 3 ta tabdan iborat tahlil ochiladi:
1. **Чек-лист натижалари**: 6 ta savdo bloki bo'yicha menejerga qo'yilgan ballar, xatolar tushuntirishi va suhbatdan olingan dalil-iqtiboslar.
2. **Стенограмма**: Menejer va mijozning o'zaro suhbati matni (har bir gapning yonidagi taymkodni bosib, audioni o'sha joydan eshitishingiz mumkin).
3. **Аналитика ва Овоз**: Suhbatdagi menejer/mijoz gapirish ulushi va nutq tezligi ko'rsatkichlari.

---

## 6. Ballarni qo'lda o'zgartirish (Correction)
* Agar AI qo'ygan bahoga rozi bo'lmasangiz, o'sha mezonning o'ng tarafidagi **"Ўзгартириш"** tugmasini bosing.
* Yangi ballni tanlang va o'zgarish sababini yozib saqlang.
* Tizim umumiy ballni avtomatik qayta hisoblab chiqadi va barcha o'zgarishlar tarixini saqlab boradi.

---

## 7. Natijani amoCRM bitimiga yuborish
* Audit sahifasining yuqori qismida joylashgan **"amoCRM га юбориш"** tugmasini bosing.
* Natijalar (umumiy ball, kuchli va kuchsiz tomonlar, tavsiyalar) real vaqt rejimida amoCRM dagi tegishli bitimga eslatma (note) sifatida yuboriladi.

---

## 8. Daqiqalar balansini tekshirish
* Tizim menyusidan **"Баланс"** bo'limini tanlang.
* Bu yerda kompaniyangiz uchun ajratilgan umumiy AI daqiqalari, ishlatilgan daqiqalar va hozirda tahlil qilinayotgan qo'ng'iroqlar uchun band qilingan daqiqalar ko'rsatiladi.
