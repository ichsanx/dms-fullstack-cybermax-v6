# DMS (Document Management System) — Fullstack (Frontend UI + Backend API)

Aplikasi **Document Management System (DMS)** berbasis **Fullstack** yang terdiri dari:

- **Frontend UI (Next.js Web App)**: login, dashboard dokumen (upload & list), request (delete/replace), panel admin (create user & approval queue), notifikasi.
- **Backend API (NestJS)**: autentikasi JWT, manajemen dokumen, approval workflow, notifikasi.
- **Database** (Prisma ORM): user, documents, approvals/permission request, notifications.
- **File Storage**: penyimpanan file dokumen (filesystem lokal; bisa dikembangkan ke S3/MinIO).

> Mode operasional: **Opsi A (Admin membuat user)**  
> Tidak ada “register publik” dari UI login. Pembuatan user dilakukan oleh **ADMIN**.

---

## Fitur Utama

### Authentication & Authorization
- Login menggunakan **JWT**
- **Role-based access**:
  - `ADMIN`: membuat user, melihat approval queue, approve/reject, eksekusi aksi sensitif.
  - `USER`: upload dokumen, melihat list dokumen, request delete/replace, menerima notifikasi.

### Document Management
- Upload dokumen (**multipart/form-data**)
- List dokumen + search + pagination
- Replace dokumen (via approval admin) → `fileUrl` berubah (dan versi/riwayat bisa ditambah)
- Delete dokumen (via approval admin)

### Approval Workflow (PENDING → keputusan → eksekusi)
- **DELETE**: USER request delete → status **PENDING** → ADMIN approve → dokumen & file terhapus → user notified
- **REPLACE**: USER request replace → status **PENDING** → ADMIN approve → dokumen di-update (`fileUrl`) → user notified

### Notification (In-App)
- Notifikasi disimpan di DB dan ditampilkan di UI
- Dapat ditingkatkan dengan Outbox + Worker (lihat System Design)

### API Documentation
- Swagger UI:
  - `http://localhost:3000/docs`

---

## Tech Stack

**Backend**
- NestJS
- Prisma ORM
- PostgreSQL (recommended)
- JWT Auth
- Multer (file upload)

**Frontend**
- Next.js (App Router)
- Fetch/Axios untuk akses API
- UI: Login, Documents, Approvals (Admin), Notifications

---

## Struktur Repository

```
dms-fullstack-cybermax-v6/
├─ dms-backend/
│  ├─ src/
│  ├─ prisma/
│  ├─ docker-compose.yml
│  └─ ...
└─ dms-frontend/
   ├─ src/
   └─ ...
```

---

## Prasyarat

- Node.js (LTS disarankan)
- NPM/Yarn/PNPM
- Database PostgreSQL (atau gunakan Docker)
- Docker (opsional, recommended untuk setup cepat)

---

## Konfigurasi Environment

### Backend `.env`
Buat file: `dms-backend/.env`

```env
# App
PORT=3000
JWT_SECRET=supersecret

# Database (contoh PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dms?schema=public"

# CORS (origin frontend)
CORS_ORIGIN="http://localhost:3001"

# Upload directory (filesystem lokal)
UPLOAD_DIR="uploads"
```

### Frontend `.env`
Buat file: `dms-frontend/.env`

> IMPORTANT: Frontend menggunakan **Next.js**, jadi env publik harus diawali `NEXT_PUBLIC_`.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

---

## Cara Menjalankan (Recommended: Docker untuk Backend)

> Backend repo sudah menyediakan `docker-compose.yml`.

```bash
cd dms-backend
docker compose up -d --build
docker compose logs -f
```

Buka:
- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`

Frontend (local dev):
```bash
cd dms-frontend
npm install
npm run dev
```

Buka UI:
- `http://localhost:3001`

> Jika FE kamu masih jalan di port 3000, ubah script dev menjadi:
> `next dev -p 3001`
> atau sesuaikan CORS_ORIGIN dan README.

---

## Cara Menjalankan (Local Dev Tanpa Docker)

### 1) Backend
```bash
cd dms-backend
npm install
```

Migrasi + generate Prisma:
```bash
npx prisma migrate dev
npx prisma generate
```

Seed admin pertama:
```bash
npx prisma db seed
```

Run backend:
```bash
npm run start:dev
```

### 2) Frontend
```bash
cd dms-frontend
npm install
npm run dev
```

---

## Bootstrap Admin (Seed) — Wajib untuk Opsi A

Karena **tidak ada register publik**, admin pertama dibuat via seed (sekali di awal).

Contoh kredensial (sesuaikan dengan `dms-backend/prisma/seed.ts`):
- Email: `admin@mail.com`
- Password: `Admin123!`

Setelah login sebagai admin, pembuatan user dilakukan lewat:
- **Admin Panel (UI)**, atau
- Endpoint `POST /users` (**ADMIN only**)

---

## Demo Cepat (End-to-End)

1) Jalankan DB + Backend  
2) Jalankan Frontend  
3) Login sebagai **ADMIN** (akun seed)  
4) Buat akun **USER** dari Admin Panel  
5) Login sebagai USER → upload dokumen  
6) USER request delete/replace  
7) ADMIN buka Approvals → approve/reject  
8) USER melihat notifikasi + status dokumen berubah

---

## Endpoint Ringkas (lihat detail resmi di Swagger)

> Detail resmi dan parameter lengkap lihat Swagger: `http://localhost:3000/docs`

**Auth**
- `POST /auth/login` → login & mendapatkan JWT

**Users (ADMIN only)**
- `POST /users` → create user

**Documents**
- `GET /documents?q=&page=&limit=` → list + search + pagination (JWT)
- `POST /documents` → upload dokumen (multipart/form-data, JWT)

**Approvals**
- `POST /approvals/delete-request` → request delete (USER)
- `POST /approvals/replace-request` → request replace (USER)
- `POST /approvals/:id/approve` → approve (ADMIN)
- `POST /approvals/:id/reject` → reject (ADMIN)

**Notifications**
- `GET /notifications` → list notifikasi user (JWT)

---

## Access Control (USER vs ADMIN)

### USER (tidak bisa eksekusi)
USER bisa:
- Login
- Upload dokumen
- List dokumen
- Membuat request **DELETE/REPLACE** → status **PENDING**
- Melihat status request miliknya (PENDING/APPROVED/REJECTED)
- Menerima notifikasi

USER tidak bisa:
- Approve/reject request
- Eksekusi delete/replace (menghapus file / mengganti `fileUrl`)
- Melihat approval queue seluruh user

### ADMIN (bisa memutuskan & eksekusi)
ADMIN bisa:
- Membuat user baru (Opsi A)
- Melihat semua request **PENDING** (approval queue)
- Approve/reject
- Eksekusi aksi sensitif (delete file/dokumen, update `fileUrl` replace)
- Audit & monitoring (opsional)

---

## Workflow End-to-End (Mermaid)

### 0) Bootstrap Admin (Seed)
```mermaid
flowchart TD
  Dev[Developer] -->|Run prisma db seed| Seed[Seed Script]
  Seed -->|Create/Upsert ADMIN| DB[(Database)]
  DB --> Admin[ADMIN account ready]
```

### 1) Admin Create User (bukan register publik)
```mermaid
flowchart TD
  A[ADMIN] -->|Login UI| UI[Frontend UI]
  UI -->|POST /auth/login| API[Backend API]
  API -->|JWT access_token| UI

  A -->|Open Admin Panel: Create User| UI
  UI -->|POST /users (ADMIN only)| API
  API -->|Hash password + Create USER| DB[(Database)]
  DB -->|Return user profile| API
  API --> UI
```

### 2) Upload Document
```mermaid
flowchart TD
  U[USER] -->|Choose file + metadata| UI[Frontend UI]
  UI -->|POST /documents (multipart, JWT)| API[Backend API]
  API -->|Save file| FS[(File Storage)]
  API -->|Save metadata (fileUrl, ownerId, etc.)| DB[(Database)]
  DB -->|Return document data| API
  API --> UI
```

### 3) Approval — DELETE
```mermaid
flowchart TD
  U[USER] -->|Request Delete| UI[Frontend UI]
  UI -->|POST /approvals/delete-request| API[Backend API]
  API -->|Create Approval: PENDING| DB[(Database)]

  A[ADMIN] -->|Open Approval Queue| UI
  UI -->|POST /approvals/:id/approve| API

  API -->|Delete file + doc| FS[(File Storage)]
  API -->|Update Approval: APPROVED| DB
  API -->|Create Notification| DB
  DB -->|Show In-App Notification| U
```

### 4) Approval — REPLACE
```mermaid
flowchart TD
  U[USER] -->|Request Replace| UI[Frontend UI]
  UI -->|POST /approvals/replace-request| API[Backend API]
  API -->|Store new file (pending)| FS[(File Storage)]
  API -->|Create Approval: PENDING| DB[(Database)]

  A[ADMIN] -->|Open Approval Queue| UI
  UI -->|POST /approvals/:id/approve| API

  API -->|Update document fileUrl| DB
  API -->|Update Approval: APPROVED| DB
  API -->|Create Notification| DB
  DB -->|Show In-App Notification| U
```

---

## System Design Questions

### 1) How to handle large file uploads?
- Disk storage (hindari memory) + limit ukuran + validasi mime-type
- Chunk/resumable upload (opsional)
- Object storage + pre-signed URL (S3/MinIO) untuk skala besar
- Simpan metadata (ukuran, hash/checksum) + (opsional) antivirus scanning

### 2) How to avoid lost updates when replacing documents?
- Batasi 1 request PENDING per dokumen
- Gunakan transaction saat approve: update document + approval + notification atomik
- Optimistic concurrency (kolom `version`/`updatedAt`) → return 409 jika konflik

### 3) How to design notification system for scalability?
- Mulai dari in-app notification tersimpan di DB
- Outbox pattern + worker
- Message broker (RabbitMQ/Kafka/Redis Streams) untuk skala tinggi
- Idempotency (eventId) untuk mencegah double notify

### 4) How to secure file access?
- Jangan expose folder uploads publik tanpa auth
- Download via endpoint terproteksi (JWT + authorization)
- Jika object storage: pre-signed URL TTL pendek
- Validasi upload (type/size), rate limit, audit log (opsional)

### 5) How to structure services for microservice migration?
- Modular monolith: Auth, Users, Documents, Approvals, Notifications
- Batasi akses lintas modul
- Definisikan domain events (DocumentReplaced, ApprovalApproved, dst.)
- Kandidat microservice pertama: Notifications → Approvals → Documents

---

## Troubleshooting

### 404 “Cannot GET /docs”
Pastikan backend berjalan dan buka:
- `http://localhost:3000/docs`

### CORS error saat frontend akses backend
- Pastikan `CORS_ORIGIN=http://localhost:3001` (backend)
- Pastikan FE benar-benar berjalan di `http://localhost:3001`
- Restart backend setelah ubah `.env`

### Prisma error / client mismatch
```bash
npx prisma generate
npx prisma migrate dev
```

---

## Author
**Ichsan**
https://github.com/ichsanx/dms-fullstack-cybermax-v6

---

## License
MIT License — lihat file `LICENSE`.

Copyright (c) 2026 Ichsan
