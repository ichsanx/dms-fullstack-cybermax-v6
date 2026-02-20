# 🧠 Tech Lead System Design Interview — DMS Enterprise (Full Answer Pack)

> Ready-to-paste **Tech Lead / Staff Engineer** style answers for a full 45–60 minute system design interview.
> Recommended location: `docs/INTERVIEW_SYSTEM_DESIGN_FULL.md`

---

## ROUND 1 — Requirements & Scope (0–5 min)

### Functional Requirements (FR)
- **Auth & RBAC**: JWT login; roles `USER`, `ADMIN` (optional `SUPER_ADMIN` for tenant).
- **Document lifecycle**: upload, list/search/pagination, detail, authorized download.
- **Sensitive ops via approvals**: replace/delete create **Approval** (`PENDING → APPROVED/REJECTED`) before execution.
- **Notifications**: in-app notifications for request lifecycle and execution outcomes.
- **Audit trail**: append-only audit log for sensitive actions + download events.
- **Admin console**: manage users, view approval queue, approve/reject with reason.
- **Scope/visibility**: owner-based access + optional department/project scope (multi-tenant-lite).

### Non-Functional Requirements (NFR)
- **Availability**: 99.9% API; degrade gracefully (async notifications).
- **Performance**: p95 200–300ms for list/search; uploads optimized via streaming.
- **Scalability**: 100k DAU; horizontal scaling; stateless services.
- **Security**: least privilege, protected download, rate limiting, secrets mgmt.
- **Consistency**: approval execution is transactional (no partial states).
- **Reliability/Observability**: retries, idempotency, metrics/logs/traces, DLQ.
- **Compliance**: auditability, retention, access logs.

### Out-of-scope for v1
- Full-text indexing (Elastic/OpenSearch) → start metadata search in DB.
- OCR/preview thumbnails → later async pipeline.
- Multi-region active-active → start single region, multi-AZ.
- WebSocket push → start polling/refresh.
- Complex ABAC → start RBAC + owner/scope.
- Chunked/resumable upload → later for frequent >1GB.

### Clarifying Questions (Tech Lead style)
- Max file size and peak concurrent uploads?
- Download traffic pattern (need CDN)?
- Retention policy / legal hold / soft delete window?
- Tenant isolation requirement (logical vs physical)?
- Approval for all docs or only certain types?
- Encryption-at-rest, CMK, and audit requirements?

---

## ROUND 2 — High-Level Architecture (5–15 min)

### Proposed Architecture (v1 → v2 evolution)
**v1 (Modular Monolith, Microservice-ready):**
- **Next.js UI** (role-aware routing)
- **NestJS API** (stateless; modules: Auth/Users/Documents/Approvals/Notifications/Audit)
- **PostgreSQL** (metadata + workflow)
- **Object Storage** (S3/MinIO) for file blobs (filesystem only for local dev)
- **Worker** (async jobs): notification dispatch, outbox processing, virus scan hook, cleanup
- **Observability**: structured logs + metrics + tracing

**v2 (Scale):**
- Add **Redis** for caching & rate limiting
- Add **Search** service (OpenSearch) for full-text
- Split **Notification** and **Approval** into microservices if needed

### Key Decision Rationale (what you say)
- Keep API stateless for horizontal scaling.
- Put big files in object storage, DB only stores metadata.
- Use outbox + worker so notifications are reliable and non-blocking.
- Modular monolith reduces operational complexity while keeping clean boundaries.

---

## ROUND 3 — Data Model, Indexing, and Access Control (15–25 min)

### Core Tables (minimal)
- **User**: `id, email, passwordHash, role, tenantId?, createdAt`
- **Document**: `id, title, description, documentType, fileKey/fileUrl, version, status, createdBy, tenantId?, createdAt, updatedAt`
- **Approval**: `id, documentId, type(REPLACE/DELETE), status(PENDING/APPROVED/REJECTED/EXECUTED/FAILED), requestedBy, decidedBy?, reason?, createdAt, decidedAt?, executedAt?`
- **Notification**: `id, userId, type, message, isRead, createdAt`
- **AuditLog**: `id, actorId, action, entityType, entityId, before?, after?, ip?, userAgent?, createdAt`
- **OutboxEvent** (optional but recommended): `id, aggregateType, aggregateId, eventType, payload, status, createdAt, processedAt?`

### Indexing Strategy (Postgres)
- `Document(tenantId, createdAt desc)` for listing
- `Document(tenantId, title)` or trigram index for partial search
- `Approval(status, createdAt desc)` for admin queue
- `Approval(documentId, status)` to enforce single pending
- `Notification(userId, createdAt desc)`
- `AuditLog(entityType, entityId, createdAt desc)`

### Authorization Rules
- **USER**: can access own docs (and/or within tenant scope), can request replace/delete.
- **ADMIN**: can view tenant queue, approve/reject, execute sensitive ops.
- **Download**: never expose raw storage path publicly; use signed URL or protected streaming endpoint.

---

## ROUND 4 — Upload/Download & Replace/Delete Workflow (25–35 min)

### Upload (recommended scalable approach)
**Best practice:** use **pre-signed URL**:
1. UI asks API: `POST /uploads/presign`
2. API returns signed PUT URL + `fileKey`
3. UI uploads directly to S3/MinIO
4. UI calls API: `POST /documents` with metadata + `fileKey`
5. API stores metadata in DB

**Fallback (simple v1):** API accepts multipart streaming (disk storage), then pushes to object storage.

### Replace Request
- USER uploads **replacement file** first (presigned), API stores `pendingFileKey` on Approval payload.
- Create Approval row: `type=REPLACE`, `status=PENDING`.
- Document status may remain ACTIVE, or set `PENDING_REPLACE` (depends UI needs).
- Enforce: **at most 1 PENDING per document** (unique partial index or app-level check).

### Delete Request
- Create Approval: `type=DELETE`, `status=PENDING`.
- Optionally set document status `PENDING_DELETE` for UI.

### Approve Execution (transactional + idempotent)
When ADMIN approves:
- DB transaction:
  - verify approval still `PENDING`
  - update approval → `APPROVED`
  - write outbox event `ApprovalApproved`
- Worker processes outbox:
  - if REPLACE: update Document `fileKey`, increment `version`, mark approval `EXECUTED`, create notification + audit
  - if DELETE: soft delete or hard delete:
    - recommended: **soft delete + retention** (e.g., 7–30 days), then async cleanup
    - create notification + audit

**Idempotency:** worker checks approval status; if already EXECUTED, skip.

---

## ROUND 5 — Consistency, Concurrency, and Failure Modes (35–45 min)

### Avoid Lost Updates (Replace/Delete)
- **Single pending request constraint** per document.
- Approval execution via transaction ensures consistency across:
  - approval state
  - document metadata update
  - audit + outbox creation
- **Optimistic locking**:
  - use `Document.updatedAt` or `version`
  - reject approval if document changed unexpectedly (409 Conflict)
- **Idempotency keys** for upload and approval execution

### Failure Modes & Handling
- **S3 upload succeeds but DB write fails**:
  - periodic orphan cleanup job for unreferenced files.
- **DB commit succeeds but worker fails**:
  - outbox ensures retry until processed; DLQ for repeated failures.
- **Delete executed but notification failed**:
  - notification is async + retry; user sees updated status in approvals list.

### Transaction Boundaries
- Keep DB transaction small (metadata only).
- Do heavy IO (storage operations) in worker with retries.

---

## ROUND 6 — Scalability, Reliability, Observability, and Roadmap (45–60 min)

### Scale Strategy
- Stateless API behind load balancer (horizontal pods).
- Object storage for blobs; CDN for downloads if needed.
- Redis:
  - token/session helper (optional), rate limiting, caching hot document metadata.
- DB:
  - connection pooling (PgBouncer), read replicas for read-heavy endpoints.
- Search:
  - OpenSearch for full-text and advanced filters.

### Reliability / SRE
- SLIs: latency, error rate, availability; SLOs for p95.
- Monitoring: Prometheus + Grafana; Alerting: PagerDuty/Opsgenie.
- Logging: structured JSON logs; correlation IDs; centralized ELK.
- Tracing: OpenTelemetry.
- Incident response: runbooks + blameless postmortems.

### Security Hardening Checklist
- Rate limit auth + upload endpoints.
- Validate MIME type + extension; size limits.
- Malware scanning hook (async).
- Encryption-at-rest (storage + DB); secrets via vault/secret manager.
- Least privilege IAM for storage access.
- Audit logs for download + admin actions.

### 12–24 Month Roadmap (Tech Lead Vision)
- **Phase 1**: Production hardening + observability + HA + retention/soft delete
- **Phase 2**: Outbox + worker stabilization; move uploads to presigned
- **Phase 3**: Full-text search + preview pipeline
- **Phase 4**: Event-driven notifications; extract Notification Service if needed
- **Phase 5**: Multi-tenant hard isolation + compliance (ISO/SOC2 readiness)
- **Phase 6**: Multi-region DR, advanced analytics, policy engine

---

## “Tradeoffs” Summary (what interviewers love)
- **Modular monolith** first: fastest delivery + lower ops cost; still microservice-ready.
- **Outbox + worker**: reliability for notifications and storage IO without blocking API.
- **Presigned uploads**: offload bandwidth from API; scales with object storage.
- **Soft delete**: safer for enterprise; supports compliance and recovery.
- **Optimistic locking + single pending**: prevents conflicts while keeping implementation simple.

---

## Where to place in your repo
- `docs/INTERVIEW_SYSTEM_DESIGN_FULL.md`
- Link from README:
  - `docs/INTERVIEW_SYSTEM_DESIGN_FULL.md` — Tech Lead System Design Answers

