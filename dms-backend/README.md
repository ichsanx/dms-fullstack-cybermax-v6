# Document Management System (DMS) Backend

**Technical Test Submission — Software Engineer**  
Repository: https://github.com/ichsanx/dms-backend-cybermax-v6

---

## 📎 Evidence (Mandatory Scenarios)

- **Technical Test Evidence (PDF)**: `docs/evidence/DMS_Test_Evidence_Report.pdf`  
  (Contains before/after proof for **REPLACE**, **Notifications**, and **DELETE** flows via Swagger captures)

- Evidence folder: `docs/evidence/`

- Klick Evidence : https://github.com/ichsanx/dms-backend-cybermax-v6/blob/main/docs/evidence/DMS_Test_Evidence_Report.pdf 

---

## 1. Overview

This repository contains a backend implementation of a **Document Management System (DMS)** designed to simulate a production-grade workflow: document upload, controlled replacement/deletion via approval, and user notifications.

**Tech Stack**
- **NestJS (TypeScript)**
- **Prisma ORM**
- **PostgreSQL**
- **JWT Authentication**
- **RBAC (USER / ADMIN)**
- **Multer (disk storage) for file uploads**
- **Swagger** for API exploration

**Core Idea**
- Sensitive document changes (**REPLACE / DELETE**) are **not executed immediately**.
- A **PermissionRequest** is created and the document moves into a **locked status** (`PENDING_*`).
- Only an **ADMIN** can approve/reject.
- The system enforces **transactional integrity**: document update + request update + notification are committed atomically.

---

## 2. Domain Model (High-Level)

### Document
- `status`: `ACTIVE | PENDING_REPLACE | PENDING_DELETE`
- `version`: increments on approved REPLACE

### PermissionRequest
- `type`: `REPLACE | DELETE`
- `status`: `PENDING | APPROVED | REJECTED`
- `replaceFileUrl`: populated during request (for REPLACE)

### Notification
- Stored in DB
- Created for workflow events (request created, approved/rejected)
- Read status supported (`mark as read`)

---

## 3. Workflow

### 3.1 Replace Flow (USER → ADMIN → USER)
1. USER uploads/has an existing document
2. USER requests replace with a new file  
   → system creates `PermissionRequest(REPLACE)`  
   → document becomes `PENDING_REPLACE` (locked)
3. ADMIN lists pending approvals and approves  
   → transaction:
   - update document `fileUrl` + increment `version` + set `ACTIVE`
   - mark request `APPROVED`
   - create notification for USER
4. USER verifies:
   - `/documents` shows updated `fileUrl` and incremented `version`
   - `/notifications` contains an “approved” message

### 3.2 Delete Flow (USER → ADMIN → USER)
1. USER requests delete  
   → system creates `PermissionRequest(DELETE)`  
   → document becomes `PENDING_DELETE`
2. ADMIN approves  
   → transaction:
   - delete document (or soft-delete if configured)
   - mark request `APPROVED`
   - create notification for USER
3. USER verifies:
   - document no longer exists (GET by id returns 404)
   - notification exists

---

## 4. Key Engineering Considerations

### Transaction Safety (Atomicity)
Approval execution uses a database transaction to prevent partial updates:
- prevents “request approved but document not updated”
- prevents “document updated but notification missing”

### Concurrency & Lost Update Prevention
- Document state is locked via status transitions to `PENDING_*`
- Versioning provides a foundation for optimistic concurrency strategies

### Security
- JWT-protected endpoints
- RBAC gates ADMIN-only routes (approval listing / approval actions)
- File upload guarded by authentication and validation

### Scalability Notes (Future Evolution)
- File storage can migrate to S3/MinIO with pre-signed URLs
- Notifications can move to async processing via queue + workers
- Approval events can become domain events (event-driven architecture)

---

## 5. Running Locally

### Requirements
- Node.js **18+**
- PostgreSQL
- npm

### 5.1 Setup
```bash
npm install
```

Create `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/dms_db"
JWT_SECRET="your_super_secret_key"
PORT=3000
```

Run migration:
```bash
npx prisma migrate dev
```

(Optional) seed:
```bash
npx prisma db seed
```

Run server:
```bash
npm run start:dev
```

Server: `http://localhost:3000`  
Swagger: `http://localhost:3000/api`

---

## 6. Docker (Optional)
```bash
docker-compose up --build
```

---

## 7. API Summary

> Explore full spec via Swagger (`/api`)

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Documents
- `GET /documents?q=&page=&limit=`
- `GET /documents/:id`
- `POST /documents` (multipart/form-data)
- `POST /documents/:id/request-replace` (multipart/form-data)
- `POST /documents/:id/request-delete`

### Approvals (ADMIN only)
- `GET /approvals/requests`
- `POST /approvals/requests/:id/approve`
- `POST /approvals/requests/:id/reject`

### Notifications
- `GET /notifications`
- `POST /notifications/:id/read`

---

## 8. Test Checklist (What Reviewers Typically Look For)

### Replace (must pass)
1. USER creates a document (upload)
2. USER requests REPLACE → document becomes `PENDING_REPLACE`
3. ADMIN approves REPLACE
4. Verify:
   - document `fileUrl` changed
   - `version` increments
   - USER receives notification  
   - Evidence: `docs/evidence/DMS_Test_Evidence_Report.pdf`

### Delete (must pass)
1. USER requests DELETE → document becomes `PENDING_DELETE`
2. ADMIN approves DELETE
3. Verify:
   - document removed / cannot be fetched
   - USER receives notification  
   - Evidence: `docs/evidence/DMS_Test_Evidence_Report.pdf`

### Security (must demonstrate)
- USER cannot access `GET /approvals/requests` → expect **403**
- USER cannot call approve endpoint → expect **403**
- ADMIN can access approvals endpoints → expect **200/201**

---

## 9. Notes for Review
- Workflow intentionally separates **request** from **execution** to mirror real governance processes.
- The approval mechanism is designed to be **transactional, auditable, and extensible**.
- Evidence PDF is provided to validate mandatory scenarios quickly (REPLACE/DELETE/Notifications).

---

## Author
**Ichsan Saputra**
