# Production Deployment Guide

Ushbu yo'riqnoma tizimni bitta VPS serveriga Docker Compose yordamida joylashtirish (deploy) jarayonini tasvirlaydi.

---

## 1. Minimal Tizim Talablari
* **OS**: Ubuntu 22.04 LTS (yoki boshqa Linux/Unix)
* **Processor**: 2 vCPU
* **RAM**: 4 GB (Whisper API tashqarida ishlagani uchun serverning o'zida katta RAM talab qilinmaydi)
* **Disk Space**: 40 GB SSD (Audio yozuvlar hajmidan kelib chiqib)
* **Dasturlar**: Docker (v24+) va Docker Compose (v2.20+)

---

## 2. Serverni tayyorlash
Serverga kirgandan so'ng, docker o'rnatilganligini tekshiring:
```bash
docker --version
docker compose version
```

Loyihani serverga yuklang:
```bash
git clone <repository_url> /opt/k4-aicontroller
cd /opt/k4-aicontroller
```

---

## 3. Environment sozlamalari (`.env.production`)
Serverda `.env.production` faylini yarating va quyidagi muhim o'zgaruvchilarni to'ldiring:
```bash
DATABASE_URL="postgresql://postgres:secure_password@postgres:5432/k4_aicontroller?schema=public"
REDIS_URL="redis://redis:6379"
APP_MODE="production"
APP_URL="https://audit.marketingmarkazi.uz" # Real domen nomi
ENCRYPTION_KEY="64_character_hex_key_here" # AES-256-GCM uchun kalit (openssl rand -hex 32)
JWT_SECRET="secure_jwt_secret"

OPENAI_API_KEY="sk-proj-..."
AMOCRM_CLIENT_ID="your_client_id"
AMOCRM_CLIENT_SECRET="your_client_secret"
AMOCRM_REDIRECT_URI="https://audit.marketingmarkazi.uz/api/integrations/amocrm/callback"

ONLINEPBX_API_KEY="your_api_key"
ONLINEPBX_WEBHOOK_SECRET="your_webhook_secret"

S3_ENDPOINT="http://minio:9000"
S3_REGION="us-east-1"
S3_BUCKET="k4-audio-recordings"
S3_ACCESS_KEY_ID="minioadmin"
S3_SECRET_ACCESS_KEY="minioadminpassword"
S3_FORCE_PATH_STYLE="true"

# Bootstrap Super Admin
BOOTSTRAP_ADMIN_EMAIL="admin@marketingmarkazi.uz"
BOOTSTRAP_ADMIN_PASSWORD="YourSecurePassword123!@#"
BOOTSTRAP_ADMIN_NAME="Marketing Markazi Admin"
```

---

## 4. Ishga tushirish (Deploy)

1. **Docker konteynerlarini qurish va ko'tarish**:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
   ```

2. **Ma'lumotlar bazasi migratsiyalarini yuklash**:
   Konteynerlar to'liq ko'tarilgach, prisma migratsiyasini ishga tushiring:
   ```bash
   docker compose -f docker-compose.prod.yml exec web npx prisma migrate deploy
   ```

3. **Super Admin va mezonlarni bootstrap qilish (Seeding & Bootstrap)**:
   ```bash
   # Tizim mezonlari va Real Marketing Markazi kompaniyasini yaratish
   docker compose -f docker-compose.prod.yml exec web npm run db:seed
   
   # Super Admin akkauntini yaratish (faqat birinchi marta)
   docker compose -f docker-compose.prod.yml exec web npm run db:bootstrap
   ```

---

## 5. Yangilash (Upgrade Process)
Loyihaning yangi versiyasi chiqqanda quyidagi ketma-ketlikda yangilang:
```bash
git pull origin main
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml exec web npx prisma migrate deploy
```

---

## 6. Zaxiralash (Backup)
PostgreSQL ma'lumotlar bazasini har kuni zaxiralash (Backup):
```bash
docker exec -t k4-postgres pg_dumpall -c -U postgres > /backups/k4_backup_$(date +%F).sql
```
S3/MinIO audio yozuvlarini zaxiralash:
```bash
tar -czf /backups/k4_audio_$(date +%F).tar.gz /var/lib/docker/volumes/opt_k4-aicontroller_minio_data/_data
```

---

## 7. Qayta tiklash (Restore)

### PostgreSQL bazasini zaxiradan tiklash:
Agarda yangi serverda yoki mavjud bazani zaxiradan tiklamoqchi bo'lsangiz:
```bash
# 1. Mavjud bazani tozalash (agar kerak bo'lsa)
docker exec -i k4-postgres psql -U postgres -d k4_aicontroller -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 2. SQL dump faylini yuklash
docker exec -i k4-postgres psql -U postgres -d k4_aicontroller < /backups/k4_backup_YYYY-MM-DD.sql
```

### S3/MinIO fayllarini tiklash:
```bash
# 1. Mavjud audio papkani tozalash
rm -rf /var/lib/docker/volumes/opt_k4-aicontroller_minio_data/_data/*

# 2. Zaxira arxivini ochish
tar -xzf /backups/k4_audio_YYYY-MM-DD.tar.gz -C /
```
