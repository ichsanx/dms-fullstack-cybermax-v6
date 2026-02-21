# DMS (Document Management System) — Fullstack (Frontend UI + Backend API)

Aplikasi **Document Management System (DMS)** berbasis **Fullstack** yang terdiri dari:

- **Frontend UI (Next.js Web App)**: login, dashboard, documents (upload & list), request delete/replace, panel admin (create user & approval queue), notifikasi.
- **Backend API (NestJS)**: autentikasi JWT, manajemen dokumen, workflow approval, notifikasi, secure download.
- **Database (Prisma ORM)**: user, documents, permission requests (approvals), notifications.
- **File Storage**: filesystem lokal (`uploads/`) — bisa dikembangkan ke S3/MinIO.

> Mode operasional: **Opsi A (Admin membuat user)**  
> Tidak ada “register publik”. Pembuatan user dilakukan oleh **ADMIN**.

---

## Fitur Utama

### Authentication & Authorization
- Login menggunakan **JWT**
- **Role-based access**
  - `ADMIN`: create user, lihat approval queue, approve/reject.
  - `USER`: upload dokumen, list dokumen miliknya, request delete/replace, menerima notifikasi.
- **Rate limit login**: 10 request / 3 menit per IP (mengurangi brute force).

### Document Management
- Upload dokumen (**multipart/form-data**)
- **File restriction**: hanya **PDF/DOCX**, max 10MB
- List dokumen + search + pagination
- Replace dokumen (via approval admin) → `fileUrl` berubah, `version` increment
- Delete dokumen (via approval admin)

### Approval Workflow
- **DELETE**
  - USER request delete → document status `PENDING_DELETE`
  - ADMIN approve → document + file fisik terhapus → user notified
  - ADMIN reject → status kembali `ACTIVE`
- **REPLACE**
  - USER request replace → upload file baru → document status `PENDING_REPLACE`
  - ADMIN approve → fileUrl diupdate + version increment + file lama dihapus → user notified
  - ADMIN reject → status kembali `ACTIVE` + file replace (baru) dihapus (cleanup)

### Notifications (In-App)
- Notifikasi disimpan di DB dan ditampilkan di UI
- Bisa ditingkatkan dengan Outbox + Worker (lihat System Design)

### Secure File Access
- Folder `uploads/` **tidak di-serve publik**
- Download file dilakukan via endpoint protected (JWT + authorization):
  - `GET /documents/:id/download`

### API Documentation
- Swagger UI:
  - `http://localhost:3000/docs`

---

## Tech Stack

**Backend**
- NestJS
- Prisma ORM
- PostgreSQL
- JWT Auth
- Multer (file upload)
- Throttler (rate limit)

**Frontend**
- Next.js (App Router)
- Fetch API
- UI: Login, Dashboard, Documents, Users (Admin), Approvals (Admin), Notifications

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
- NPM
- PostgreSQL (atau Docker)
- Docker (opsional)

---

## Konfigurasi Environment

### Backend `.env`
Buat file: `dms-backend/.env`

```env
PORT=3000
JWT_SECRET=supersecret
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/dms?schema=public"

# Support multiple origin via koma
CORS_ORIGIN="http://localhost:3001,http://localhost:3000"
```

> Folder `uploads/` akan otomatis dibuat saat server start.

### Frontend `.env.local`
Buat file: `dms-frontend/.env.local`

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

---

## Cara Menjalankan (Local Dev)

### 1) Backend
```bash
cd dms-backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

Swagger:
- `http://localhost:3000/docs`

### 2) Frontend
```bash
cd dms-frontend
npm install
npm run dev
```

UI:
- `http://localhost:3001`

---

## Bootstrap Admin (Seed) — Wajib (Opsi A)

Karena **tidak ada register publik**, admin pertama dibuat via seed.

Contoh kredensial (sesuaikan dengan `dms-backend/prisma/seed.ts`):
- Email: `admin@mail.com`
- Password: `Admin123!`

Setelah login sebagai admin, pembuatan user dilakukan lewat:
- **UI**: menu `Users (Admin)` → `/users`, atau
- Endpoint `POST /users` (**ADMIN only**)

---

## Demo Cepat (End-to-End)

1) Jalankan DB + Backend  
2) Jalankan Frontend  
3) Login sebagai **ADMIN** (akun seed)  
4) Buat akun **USER** dari menu **Users (Admin)**  
5) Login sebagai USER → upload dokumen  
6) USER request delete/replace  
7) ADMIN buka Approvals → approve/reject  
8) USER melihat notifikasi + status dokumen berubah  
9) Download dokumen via tombol **Download (Secure)**

---

## Endpoint Ringkas (sesuai controller)

> Detail resmi lihat Swagger: `http://localhost:3000/docs`

### Auth
- `POST /auth/login` → login & mendapatkan JWT (rate-limited)
- `GET /auth/me` → payload user saat ini (JWT)

### Users (ADMIN only)
- `POST /users` → create user

### Documents (JWT required)
- `GET /documents?q=&page=&limit=` → list + search + pagination
- `GET /documents/:id` → detail doc
- `POST /documents` → upload dokumen (multipart, PDF/DOCX only, max 10MB)
- `GET /documents/:id/download` → **secure download** (JWT + authorization)
- `POST /documents/:id/request-delete` → request delete (owner/admin)
- `POST /documents/:id/request-replace` → request replace (multipart, PDF/DOCX only)

### Approvals (ADMIN only)
- `GET /approvals/requests` → list request PENDING (admin only)
- `POST /approvals/requests/:id/approve` → approve request (DELETE/REPLACE)
- `POST /approvals/requests/:id/reject` → reject request (DELETE/REPLACE)

### Notifications (JWT required)
- `GET /notifications` → list my notifications
- `GET /notifications/me` → list my notifications (alias)
- `POST /notifications/:id/read` → mark as read

---

## Access Control (USER vs ADMIN)

### USER
USER bisa:
- Login
- Upload dokumen
- List dokumen miliknya
- Membuat request **DELETE/REPLACE** (dokumen lock ke status PENDING)
- Menerima & membaca notifikasi
- Download dokumen miliknya via endpoint secure

USER tidak bisa:
- Approve/reject request
- Melihat approval queue semua user

### ADMIN
ADMIN bisa:
- Membuat user baru (Opsi A)
- Melihat semua request **PENDING**
- Approve/reject
- Download semua dokumen (secure download)
- Aksi sensitif (delete/replace) dieksekusi oleh backend saat approve

---

## Workflow End-to-End (Mermaid)

### 0) Bootstrap Admin (Seed)
```mermaid
flowchart LR
  classDef actor fill:#2b2b2b,stroke:#999,color:#fff;
  classDef process fill:#1f2937,stroke:#94a3b8,color:#fff;
  classDef db fill:#2a1f3d,stroke:#a78bfa,color:#fff;

  Dev[Developer]:::actor -->|Run seed| Seed[Prisma Seed]:::process
  Seed -->|Upsert ADMIN| DB[(Database)]:::db
  DB --> Admin[ADMIN ready]:::actor
```

### 1) Admin Create User (bukan register publik)
```mermaid
flowchart LR
  classDef actor fill:#2b2b2b,stroke:#999,color:#fff;
  classDef ui fill:#3a2a12,stroke:#f59e0b,color:#fff;
  classDef api fill:#0b3a53,stroke:#38bdf8,color:#fff;
  classDef db fill:#2a1f3d,stroke:#a78bfa,color:#fff;

  A[ADMIN]:::actor --> UI[Admin Panel]:::ui
  UI -->|POST /users (ADMIN)| API[Backend API]:::api
  API --> DB[(Database)]:::db
  DB --> API
  API --> UI
```

### 2) Upload Document
```mermaid
flowchart LR
  classDef actor fill:#2b2b2b,stroke:#999,color:#fff;
  classDef ui fill:#3a2a12,stroke:#f59e0b,color:#fff;
  classDef api fill:#0b3a53,stroke:#38bdf8,color:#fff;
  classDef store fill:#0f2f2a,stroke:#34d399,color:#fff;
  classDef db fill:#2a1f3d,stroke:#a78bfa,color:#fff;

  U[USER]:::actor --> UI[Documents Page]:::ui
  UI -->|POST /documents (multipart + JWT)| API[Backend API]:::api
  API -->|Validate type/size| API
  API --> FS[(uploads/)]:::store
  API --> DB[(Database)]:::db
  DB --> API
  API --> UI
```

### 3) Approval — DELETE
```mermaid
flowchart LR
  classDef actor fill:#2b2b2b,stroke:#999,color:#fff;
  classDef ui fill:#3a2a12,stroke:#f59e0b,color:#fff;
  classDef api fill:#0b3a53,stroke:#38bdf8,color:#fff;
  classDef store fill:#0f2f2a,stroke:#34d399,color:#fff;
  classDef db fill:#2a1f3d,stroke:#a78bfa,color:#fff;

  U[USER]:::actor --> UI[UI]:::ui
  UI -->|POST /documents/:id/request-delete| API[Backend API]:::api
  API --> DB[(Database)]:::db

  A[ADMIN]:::actor --> UI
  UI -->|POST /approvals/requests/:id/approve| API
  API --> FS[(uploads/)]:::store
  API --> DB
```

### 4) Approval — REPLACE
```mermaid
flowchart LR
  classDef actor fill:#2b2b2b,stroke:#999,color:#fff;
  classDef ui fill:#3a2a12,stroke:#f59e0b,color:#fff;
  classDef api fill:#0b3a53,stroke:#38bdf8,color:#fff;
  classDef store fill:#0f2f2a,stroke:#34d399,color:#fff;
  classDef db fill:#2a1f3d,stroke:#a78bfa,color:#fff;

  U[USER]:::actor --> UI[UI]:::ui
  UI -->|POST /documents/:id/request-replace (multipart)| API[Backend API]:::api
  API --> FS[(uploads/)]:::store
  API --> DB[(Database)]:::db

  A[ADMIN]:::actor --> UI
  UI -->|POST /approvals/requests/:id/approve| API
  API -->|Update doc + cleanup old file| FS
  API --> DB
```

---

## System Design Questions

### 1) How to handle large file uploads?
- Disk storage + limit ukuran + validasi mime-type
- Chunk/resumable upload (opsional)
- Object storage + pre-signed URL (S3/MinIO)
- Simpan metadata (ukuran, hash/checksum) + (opsional) antivirus scanning

### 2) How to avoid lost updates when replacing documents?
- Batasi 1 request PENDING per dokumen
- Transaction saat approve: update document + approval + notification atomik
- Optimistic concurrency (kolom `version`/`updatedAt`) → 409 jika konflik

### 3) How to design notification system for scalability?
- Mulai dari in-app notification di DB
- Outbox pattern + worker
- Message broker (RabbitMQ/Kafka/Redis Streams)
- Idempotency (eventId)

### 4) How to secure file access?
- Jangan expose folder uploads publik tanpa auth
- Download via endpoint terproteksi (JWT + authorization)
- Jika object storage: pre-signed URL TTL pendek
- Validasi upload (type/size), rate limit, audit log

### 5) How to structure services for microservice migration?
- Modular monolith: Auth, Users, Documents, Approvals, Notifications
- Domain events (DocumentReplaced, ApprovalApproved, dst.)
- Kandidat microservice pertama: Notifications → Approvals → Documents

---

## Troubleshooting

### 404 “Cannot GET /docs”
- Pastikan backend berjalan
- Buka `http://localhost:3000/docs`

### CORS error saat frontend akses backend
- Pastikan `CORS_ORIGIN` mengandung origin frontend
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
