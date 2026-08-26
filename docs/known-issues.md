# Known Issues & Backlog

Ushbu hujjat tizimda aniqlangan, lekin birinchi MVP versiyani ishga tushirishga to'sqinlik qilmaydigan ma'lum muammolar va yaxshilanishlarni tasvirlaydi.

---

## 1. Blocker Issues
*Hozirgi vaqtda blocker darajasidagi xatoliklar aniqlanmagan. Tizim to'liq ishchi va integratsiyalashgan holatda.*

---

## 2. High Priority Issues
*Tizimning ishlashiga to'g'ridan-to'g'ri to'sqinlik qilmaydi, lekin tez orada bartaraf etilishi lozim:*
- **amoCRM Payment Expiry State (402)**: Real amoCRM akkaunti muddati tugagan bo'lsa, sinxronizatsiya va eslatma push qilish to'xtab qoladi. Bu crm hisobini to'lash orqali hal qilinishi kerak, loyiha tomonidan 402 xatolari loglanib xavfsiz boshqariladi.

---

## 3. Medium Priority Issues
- **Stereo Diarization**: Hozirda spikerlarni ajratish matn tahlili va LLM orqali heuristic tarzda amalga oshiriladi. Ayrim hollarda spiker noto'g'ri belgilanishi mumkin. Bu ko'rsatkichlar bo'yicha menejerlarga jazo yoki jarimalar qo'llamaslik tavsiya etiladi.
- **Audio seek offset alignment**: Ba'zi eski telefoniya formatlarida audio pleyer orqali taymkodni bosganda brauzerda seek offset 1-2 soniyaga farq qilishi mumkin.

---

## 4. Low Priority Issues
- **Custom date bounds year limit warning**: Sana oralig'i 1 yildan oshib ketganda, foydalanuvchiga faqat API orqali xato qaytariladi. Interfeysda ogohlantiruvchi qizil banner chiqarish kerak.
- **Password policy text warning**: Yangi ro'yxatdan o'tayotganda parolni murakkablik darajasini tekshiruvchi interaktiv interfeys yo'q, faqat submit qilganda xatolik xabari chiqadi.

---

## 5. Enhancements (Yaxshilanishlar - Post-MVP)
- **CRM Discipline Analysis**: Menejerlarning CRM intizomi bo'yicha hisobotlar paneli.
- **Bitrix24 integration**: Bitrix24 CRM bilan integratsiya flows.
- **Sipuni & UTel integration**: Qo'shimcha telefoniya webhooklarini qo'llab-quvvatlash.
- **Telegram alert bot**: Tahlil natijalari bo'yicha Telegram bildirishnomalarini yuborish.
- **PDF/Excel exporting**: Audit natijalari va dashboard grafiklarini eksport qilish.
