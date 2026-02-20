# Compliance & Governance Plan

This document summarizes enterprise governance controls commonly expected in document platforms.

---

## 1. Access Control (RBAC + Least Privilege)
- Roles: `USER`, `ADMIN`
- Guards applied to protected endpoints
- Separation of duties:
  - USER cannot execute replace/delete directly
  - ADMIN approves/rejects and triggers execution

---

## 2. Audit Logging
Record immutable logs for:
- document upload / replace / delete
- approval decision (approve/reject) with reason
- download access (recommended)
- admin user creation

Recommended fields:
- `actorId`, `action`, `entityType`, `entityId`
- `before`, `after` (for replace)
- `ip`, `userAgent`, `createdAt`

---

## 3. Data Retention & Legal Hold
- Use **soft delete** for documents and files
- Retention window (example): 7–30 days
- Optional: legal hold flag prevents deletion until cleared

---

## 4. Encryption
- In transit: TLS (HTTPS)
- At rest:
  - DB encryption (managed encryption if cloud)
  - Object storage encryption (SSE-S3 / SSE-KMS)
- Secrets management:
  - env vars for dev
  - vault/secret manager for prod

---

## 5. Incident Response
- Define severity levels (SEV1–SEV3)
- Runbooks: outbox backlog, storage outage, auth failure, DB slow queries
- Postmortem template (blameless)

---

## 6. Backup & Disaster Recovery
- DB:
  - daily backups + PITR (recommended)
  - periodic restore test
- Storage:
  - versioning + lifecycle policy (prod)
- Define targets:
  - RPO (data loss tolerance)
  - RTO (recovery time)

---

## 7. Compliance Roadmap (ISO 27001 / SOC2 Direction)
- Evidence artifacts (audit logs, access logs)
- Change management (PR reviews)
- Vulnerability scanning (CI)
- Access review process (quarterly)
