# Architecture Overview

This document explains the **high-level architecture** of the DMS Enterprise platform and the rationale behind key design decisions.

---

## 1. Goals

- **Governance-first** document management (replace/delete must be approved)
- **Transactional consistency** for sensitive operations
- **Secure file handling** (no public uploads folder exposure)
- **Scalable-by-design** (stateless API + object storage ready)
- **Microservice-ready** boundaries (modular monolith)

---

## 2. High-Level Diagram

```mermaid
flowchart LR
  UI[Frontend (Next.js)] -->|JWT| API[Backend (NestJS REST API)]
  API --> DB[(PostgreSQL via Prisma)]
  API --> FS[(Local FS / S3 / MinIO)]
  API --> OUTBOX[(Outbox Table)]
  WORKER[Async Worker] --> OUTBOX
  WORKER --> DB
  WORKER --> FS
  API --> NOTIF[Notifications Module]
```

---

## 3. Component Responsibilities

### Frontend (Next.js)
- Login UI → obtains JWT
- Role-aware pages (USER vs ADMIN)
- Document dashboard: upload, list/search/pagination, request replace/delete
- Admin panel: user creation + approval queue + approve/reject
- Notifications: in-app list (polling)

### Backend (NestJS)
- Auth module: login + JWT guards
- Documents module: upload/list/detail, request operations
- Approvals module: request/decision/execution lifecycle
- Notifications module: persist in-app notifications
- Audit (recommended): append-only records for sensitive actions

### Database (PostgreSQL)
Stores:
- users, documents, approvals, notifications
- (recommended) audit_logs, outbox_events

### Storage (Local FS / Object Storage)
- Local FS for dev
- S3/MinIO ready for scalable deployment
- For prod: prefer **presigned uploads** (UI uploads directly to object storage)

---

## 4. Key Design Decisions & Tradeoffs

### Modular Monolith First
**Why:** faster delivery + easier debugging + fewer moving parts  
**How:** strict module boundaries so later extraction is easy.

### Approval-Based Governance
**Why:** prevents unauthorized destructive actions; improves auditability.

### Transaction + Outbox (Reliability)
**Why:** avoid partial state and guarantee retries for async execution/notifications.

---

## 5. Replace/Delete Execution Safety (Failure Mode)

Critical failure mode:
> crash after old file deletion but before new file commit

Safe approach:
- Update DB (document.fileKey + version + approval status + outbox) **inside transaction**
- Commit first
- Cleanup old file **after commit** (async)
- Prefer **soft delete + retention window** for old files

---

## 6. Observability (Recommended)

- Structured logs with correlationId
- Metrics: latency p95, error rate, worker backlog
- Tracing (OpenTelemetry) ready
- Alerts: upload failures, outbox retry spikes, DB slow queries

---

## 7. Future Evolution

- Phase 1: Notification service extraction
- Phase 2: Approval service extraction
- Phase 3: Message broker (Kafka/RabbitMQ/Redis Streams)
- Phase 4: Document service with full object storage integration
