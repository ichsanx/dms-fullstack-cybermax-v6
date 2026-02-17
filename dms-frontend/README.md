# DMS (Document Management System) — Fullstack (UI + Frontend + Backend API)

Aplikasi **Document Management System (DMS)** berbasis **Fullstack** yang terdiri dari:
- **Frontend UI (Web App)**: halaman login, dashboard dokumen (upload & list), halaman request (delete/replace), panel admin (create user & approval queue).
- **Backend API (NestJS)**: autentikasi JWT, manajemen dokumen, approval workflow, notifikasi.
- **Database** (via Prisma ORM): penyimpanan user, dokumen, approvals, notifikasi (dan audit/log bila ditambahkan).
- **File Storage**: penyimpanan file dokumen (filesystem lokal / object storage seperti S3/MinIO).

> Mode operasional: **Opsi A (Admin membuat user)**  
> Tidak ada “register publik” dari halaman login.

---

## Fitur Utama

### Authentication & Authorization
- Login menggunakan **JWT**
- **Role-based access**:
  - `ADMIN`: membuat user, melihat approval queue, approve/reject, eksekusi aksi sensitif.
  - `USER`: upload dokumen, melihat list dokumen yang berhak, request delete/replace, menerima notifikasi.

### Document Management
- Upload dokumen (multipart/form-data)
- List dokumen + search + pagination
- Replace dokumen (via approval admin) → `fileUrl` berubah
- Delete dokumen (via approval admin)

### Approval Workflow (PENDING → keputusan → eksekusi)
- **DELETE**: USER request delete → status **PENDING** → ADMIN approve → dokumen & file terhapus → user notified
- **REPLACE**: USER request replace → status **PENDING** → ADMIN approve → `fileUrl` berubah → user notified

### Notification (In-App)
- Notifikasi (minimal) disimpan di DB dan ditampilkan di UI
- Direkomendasikan pola **Outbox + Worker** untuk skalabilitas (lihat bagian System Design)

### API Documentation
- Swagger UI tersedia di:
  - `http://localhost:3000/docs`

---

## Tech Stack

**Backend**
- NestJS
- Prisma ORM
- PostgreSQL (recommended) / DB lain sesuai `DATABASE_URL`
- JWT Auth
- Multer (file upload)
- (Opsional) Docker Compose untuk dev environment

**Frontend**
- React (umumnya Vite) / atau framework sesuai project
- Fetch/Axios untuk akses API
- UI: Login, Document Dashboard, Approval Request, Admin Panel

---

## Struktur Repository (contoh)

> Sesuaikan nama folder bila berbeda.

```
dms-project/
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

- Node.js (disarankan LTS)
- NPM/Yarn/PNPM (pilih salah satu)
- Database (PostgreSQL recommended)
- Docker (opsional tetapi recommended untuk mempermudah setup)

---

## Konfigurasi Environment

### Backend `.env` (contoh)
Buat file: `dms-backend/.env`

```env
# App
PORT=3000
JWT_SECRET=supersecret

# Database (contoh PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dms?schema=public"

# CORS (frontend origin)
CORS_ORIGIN="http://localhost:3001"

# Upload directory (jika menggunakan filesystem lokal)
UPLOAD_DIR="uploads"
```

### Frontend `.env` (contoh)
Buat file: `dms-frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## Cara Menjalankan (Recommended: Docker)

> Jika backend sudah memiliki `docker-compose.yml`.

```bash
cd dms-backend
docker compose up -d --build
docker compose logs -f
```

Buka:
- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`

Frontend:
```bash
cd dms-frontend
npm install
npm run dev
```

Buka UI:
- `http://localhost:3001`

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

Karena **tidak ada register publik**, admin pertama dibuat melalui seed (sekali di awal).  
Contoh kredensial (sesuaikan dengan `prisma/seed.ts`):
- Email: `admin@mail.com`
- Password: `Admin123!`

> Setelah login sebagai admin, pembuatan user dilakukan lewat **Admin Panel** (UI) atau endpoint admin-only.

---

## Endpoint Ringkas (lihat detail di Swagger)

> Nama endpoint dapat berbeda sesuai implementasi. Detail resmi ada di Swagger.

**Auth**
- `POST /auth/login` → login dan mendapatkan JWT

**Users (ADMIN only)**
- `POST /users` → create user (ADMIN)

**Documents**
- `GET /documents?q=&page=&limit=` → list + search + pagination (JWT)
- `POST /documents/upload` → upload dokumen (JWT)

**Approvals**
- `POST /approvals/delete-request` → request delete (USER)
- `POST /approvals/replace-request` → request replace (USER)
- `POST /approvals/:id/approve` → approve (ADMIN)
- `POST /approvals/:id/reject` → reject (ADMIN)

**Notifications**
- `GET /notifications` → list notifikasi user (JWT)

---

## Access Control & Privilege (USER vs ADMIN)

Perbedaan privilege ini memastikan proses **PENDING → keputusan → eksekusi** aman:

### USER (tidak bisa eksekusi)
USER bisa:
- Login
- Upload dokumen
- List dokumen yang berhak diakses
- Membuat request **DELETE/REPLACE** → status **PENDING**
- Melihat status request miliknya (PENDING/APPROVED/REJECTED)
- Menerima notifikasi

USER tidak bisa:
- Approve/reject request
- Eksekusi delete/replace (menghapus file / mengganti fileUrl)
- Melihat approval queue seluruh user

### ADMIN (bisa memutuskan & eksekusi)
ADMIN bisa:
- Membuat user baru (Opsi A)
- Melihat semua request **PENDING** (approval queue)
- Approve/reject
- Eksekusi aksi sensitif (delete file/dokumen, update fileUrl replace)
- Audit & monitoring (opsional)

---

## Workflow End-to-End (Fullstack)

> GitHub mendukung diagram **Mermaid**. Jika diagram tidak tampil, pastikan viewer mendukung Mermaid.

### 0) Bootstrap Admin (Seed)
```mermaid
flowchart TD
  Dev[Developer] -->|Run prisma db seed| Seed[Seed Script]
  Seed -->|Create/Upsert ADMIN| DB[(Database)]
  DB --> Admin[ADMIN account ready]
```

### 1) "Register" (Opsi A) = ADMIN Create User (bukan register publik)
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

### 2) Login Workflow (ADMIN/USER)
```mermaid
flowchart TD
  U[User/Admin] -->|Input email + password| UI[Frontend UI]
  UI -->|POST /auth/login| API[Backend API]
  API -->|Validate + Sign JWT| API
  API -->|access_token| UI
  UI -->|Store token (localStorage/cookie)| UI
  UI -->|Use token for protected API| API
```

### 3) Input Document (Upload)
```mermaid
flowchart TD
  U[USER] -->|Choose file + metadata| UI[Frontend UI]
  UI -->|POST /documents/upload (multipart)| API[Backend API]
  API -->|Validate (size/type)| API
  API -->|Save file| FS[(File Storage / Object Storage)]
  API -->|Save metadata (fileUrl, ownerId, etc.)| DB[(Database)]
  DB -->|Return document data| API
  API --> UI
```

### 4) List / Search / Pagination
```mermaid
flowchart TD
  U[USER/ADMIN] -->|Open Documents Page| UI[Frontend UI]
  UI -->|GET /documents?q=&page=&limit= (JWT)| API[Backend API]
  API -->|Query documents| DB[(Database)]
  DB -->|Return list + pagination| API
  API --> UI
```

### 5) Approval — DELETE (PENDING → APPROVED → execute → notify)
```mermaid
flowchart TD
  U[USER] -->|Request Delete Document| UI[Frontend UI]
  UI -->|POST /approvals/delete-request (JWT)| API[Backend API]
  API -->|Create Approval: PENDING| DB[(Database)]

  A[ADMIN] -->|Open Approval Queue| UI
  UI -->|POST /approvals/:id/approve| API

  API -->|Delete file + doc| FS[(File Storage / Object Storage)]
  API -->|Update Approval: APPROVED| DB
  API -->|Create Notification| N[(Notifications)]
  N -->|Show In-App Notification| U
```

### 6) Approval — REPLACE (PENDING → APPROVED → update fileUrl → notify)
```mermaid
flowchart TD
  U[USER] -->|Request Replace Document| UI[Frontend UI]
  UI -->|POST /approvals/replace-request (JWT)| API[Backend API]
  API -->|Upload new file OR store pending file| FS[(File Storage / Object Storage)]
  API -->|Create Approval: PENDING| DB[(Database)]

  A[ADMIN] -->|Open Approval Queue| UI
  UI -->|POST /approvals/:id/approve| API

  API -->|Update document fileUrl| DB
  API -->|Update Approval: APPROVED| DB
  API -->|Create Notification| N[(Notifications)]
  N -->|Show In-App Notification| U
```

---

## System Design Questions (must be answered)

### 1) How to handle large file uploads?
Strategi yang direkomendasikan:
- **Streaming upload**: gunakan disk storage (hindari memory) + limit ukuran + validasi mime-type.
- **Chunk / resumable upload** untuk file sangat besar (opsional).
- **Object storage + pre-signed URL** (paling scalable): frontend upload langsung ke S3/MinIO, backend hanya mengeluarkan URL.
- Simpan metadata file (ukuran, nama, hash/checksum) dan (opsional) antivirus scanning.

### 2) How to avoid lost updates when replacing documents?
Untuk mencegah konflik update:
- **Batasi 1 request PENDING per dokumen** (serialisasi alur approval).
- Gunakan **transaction** saat approve: update dokumen + update approval + log/notif harus atomik.
- Opsional: **Optimistic Concurrency Control** (kolom `version`/`updatedAt`) dan tolak jika versi berubah (409 Conflict).

### 3) How to design notification system for scalability?
Agar notifikasi reliable & scalable:
- Mulai dari **in-app notification** tersimpan di DB.
- Naikkan ke **Outbox Pattern**: event ditulis ke tabel outbox dalam transaksi, worker mengirim notifikasi async.
- Jika trafik tinggi, pakai **message broker** (RabbitMQ/Kafka/Redis Streams).
- Terapkan **idempotency (eventId)** untuk mencegah double notify saat retry.

### 4) How to secure file access?
- Jangan expose folder uploads secara publik tanpa auth.
- Gunakan endpoint download terproteksi: cek JWT + authorization (owner/role).
- Jika object storage: gunakan **pre-signed URL** dengan TTL pendek.
- Validasi upload (type/size), rate limit, audit log akses (opsional).

### 5) How to structure services for microservice migration?
Gunakan pola **modular monolith** agar mudah dipecah:
- `AuthModule`, `UsersModule`, `DocumentsModule`, `ApprovalsModule`, `NotificationsModule`
- Interaksi antar domain lewat service boundary (hindari akses DB lintas modul sembarangan)
- Definisikan event domain (`DocumentReplaced`, `ApprovalApproved`, dll.)
- Kandidat ekstraksi microservice: mulai dari **Notification Service** → Approval → Document.

---

## Troubleshooting

### 404 “Cannot GET /docs -> POST /auth/register”
Itu terjadi karena membuka endpoint POST lewat browser (GET).  
Solusi: buka `http://localhost:3000/docs` lalu gunakan **Try it out** untuk request POST.

### CORS error saat frontend akses backend
Pastikan backend mengizinkan origin frontend:
- `.env` `CORS_ORIGIN=http://localhost:3001`
- dan di `main.ts` enable CORS sesuai origin tersebut.

### Prisma error / client mismatch
Jalankan:
```bash
npx prisma generate
npx prisma migrate dev
```

---

## Dokumentasi Tambahan (Opsional)
Direkomendasikan menambahkan:
- `docs/images/` → screenshot UI / swagger
- `docs/flow/` → flowchart tambahan / diagram ERD
- `docs/report/` → laporan akademik (cover, bab, dll.)

---

## Author
**Ichsan**

---


## License
This project is licensed under the MIT License. See the `LICENSE` file for details.

Copyright (c) 2026 Ichsan Saputra — 18 Feb 2026