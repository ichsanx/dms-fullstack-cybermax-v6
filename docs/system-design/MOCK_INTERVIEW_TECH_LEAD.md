# 🎤 MOCK INTERVIEW --- TECH LEAD (DMS Enterprise)

This document simulates a 45--60 minute Big Tech / Unicorn style System
Design & Leadership interview.

Recommended location: docs/MOCK_INTERVIEW_TECH_LEAD.md

------------------------------------------------------------------------

## SECTION 1 --- 60-Second Pitch

Q: Explain your system in 60 seconds.

Ideal Answer: DMS Enterprise is a production-style document management
system with RBAC and approval-based governance. Files are stored in
object storage (S3/MinIO), while metadata and workflow states are stored
in PostgreSQL. Sensitive operations (replace/delete) require admin
approval and are executed transactionally with an outbox-worker pattern
for reliability. The architecture is modular monolith, enabling fast
delivery while remaining microservice-ready.

------------------------------------------------------------------------

## SECTION 2 --- Scaling & Bottlenecks

Q: If traffic increases 10x, what breaks first?

Answer: - Bandwidth during upload/download → solved with presigned
URLs. - DB read pressure → indexing + caching (Redis). - Search
complexity → introduce OpenSearch.

------------------------------------------------------------------------

## SECTION 3 --- Concurrency & Data Integrity

Q: How do you prevent lost updates?

Answer: - Single PENDING approval per document. - Transactional
execution. - Optimistic locking via version field.

------------------------------------------------------------------------

## SECTION 4 --- Reliability & Failures

Q: What if S3 upload succeeds but DB write fails?

Answer: Use orphan cleanup jobs and upload session tracking.

Q: What if approval succeeds but worker fails?

Answer: Outbox pattern ensures retry until execution completes.

------------------------------------------------------------------------

## SECTION 5 --- Observability

Monitor: - API latency, error rate, traffic, saturation - DB slow
queries - Worker backlog - Storage error rate

------------------------------------------------------------------------

## SECTION 6 --- Tradeoffs

Why modular monolith first? - Faster delivery - Lower operational
complexity - Easier debugging - Clear boundaries for later microservice
extraction

------------------------------------------------------------------------

## LEADERSHIP ROUND

Q: How do you mentor engineers?

Answer: - Enforce code review culture - Encourage documentation
discipline - Promote ownership mindset - Conduct design discussions
before implementation

Q: How do you handle technical disagreements?

Answer: - Evaluate tradeoffs objectively - Use data and metrics - Align
with business goals - Make decision, document rationale

------------------------------------------------------------------------

End of Mock Interview Guide.
